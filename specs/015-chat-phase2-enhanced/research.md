# Research: نظام المحادثة المغلقة — Phase 2

**Branch**: `015-chat-phase2-enhanced` | **Date**: 2026-05-14
**Status**: Complete — all decisions resolved, no NEEDS CLARIFICATION remaining.

---

## 1. Arabic Text Normalization Strategy

**Decision**: Write-time normalization implemented in `lib/chat/normalize.ts` as a pure TypeScript
function. A mirrored Postgres function `normalize_arabic_text(p_text TEXT) RETURNS TEXT` is created
in the migration so that the `send_secure_message` RPC can normalize the incoming message text
server-side, guaranteeing the same rules apply regardless of caller.

**Normalization rules applied (in order)**:
1. Strip Tashkeel (diacritics): Unicode range U+064B–U+065F, U+0670
2. Normalize Alef variants (أ، إ، آ، ٱ → ا)
3. Normalize Ta Marbuta (ة → ه)
4. Normalize Alef Maksura (ى → ي)
5. Normalize Hamza forms (ؤ → و، ئ → ي)
6. ASCII case-fold (toLowerCase)
7. Collapse multiple whitespace to single space and trim

**Rationale**: The spec clarification (2026-05-10) mandated write-time normalization with
pre-computed `word_normalized`. Per-message normalization at send time is a simple string
comparison against pre-normalized values — O(n) on message length only. This satisfies FR-P2-005
and SC-P2-001 (≤ 500 ms blocking).

**Alternatives considered**:
- Runtime normalization per message: rejected — violates spec clarification.
- Third-party Arabic NLP library: rejected — over-engineered; adds unapproved dependency
  (Constitution Principle I).

---

## 2. Blacklist Check: Postgres RPC vs. Application Layer

**Decision**: `send_secure_message` implemented as a `SECURITY DEFINER` Postgres stored procedure.
The Server Action calls this RPC for all message sends, replacing direct `INSERT INTO chat_messages`.

**Rationale**: Atomicity. The blacklist check and message insert happen in the same transaction.
There is no TOCTOU (Time-of-Check-Time-of-Use) window. An application-layer check followed by a
separate `supabase.from('chat_messages').insert(...)` creates a race condition: if a word is added
to the blacklist between the check and the insert, the message bypasses the filter.

**Whole-word vs. substring matching inside Postgres**:

```sql
-- whole_word match (uses word boundary regex):
normalize_arabic_text(p_content) ~ ('(^|\s)' || normalized_word || '($|\s)')

-- substring match:
normalize_arabic_text(p_content) LIKE ('%' || normalized_word || '%')
```

**Error signaling**: On match, the RPC calls `RAISE EXCEPTION USING ERRCODE = 'P0001',
MESSAGE = 'CONTENT_POLICY_VIOLATION', DETAIL = matched_word`. The Server Action catches this
SQLSTATE and returns the Arabic error string to the client.

**Alternatives considered**:
- Postgres trigger on `chat_messages` BEFORE INSERT: rejected — triggers cannot return rich error
  payloads to the client and make the activity log insert harder to manage in the same transaction.
- Application-layer check only: rejected — TOCTOU risk; also bypassable by direct Supabase API
  calls (the anon key with authenticated session could bypass app logic).

---

## 3. Voice Recording: MediaRecorder API

**Decision**: Browser-native `MediaRecorder` API. No npm package. `useVoiceRecorder` custom hook
manages the full lifecycle.

**Format detection**:
```ts
const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
  ? 'audio/webm;codecs=opus'
  : 'audio/mp4';
```

**Hook state machine**: `idle → recording → preview → (sent | discarded) → idle`

**120-second auto-stop**: `useEffect` sets a `setTimeout` of 120,000 ms on recording start.
On expiry, `recorder.stop()` is called and state transitions to `preview`. Clearing the timer
in the cleanup function prevents memory leaks.

**Upload path**: Same Server Action as Phase 1 attachments (`getAttachmentUrl` flow).
Storage path: `chat/{room_id}/{message_id}/voice_{timestamp}.webm` (or `.mp4`).

**Server-side duration cap**: Hard duration enforcement server-side requires extracting audio
metadata (e.g., ffprobe). This is deferred for Phase 2 — the 25 MB bucket file-size limit acts
as a practical proxy. Client-side 120 s enforcement is the primary guard. Documented as a
known limitation in `quickstart.md`.

**Alternatives considered**:
- `react-media-recorder`: rejected — unapproved package; MediaRecorder is well-supported.
- Server-side duration extraction: rejected — requires ffprobe or similar server dependency;
  over-engineered for Phase 2.

---

## 4. Audio Streaming Playback

**Decision**: HTML `<audio src={presignedUrl}>` element. Supabase Storage is S3-compatible and
supports HTTP Range Requests (`206 Partial Content`), enabling seek and progressive playback
without downloading the full file.

**Presigned URL**: Same 1-hour `createSignedUrl` pattern from Phase 1. The `AudioPlayer`
component receives the URL as a prop from its RSC parent (which called the Server Action).

**Waveform**: Progressive enhancement only. During recording, `AnalyserNode` samples amplitude
at 100 ms intervals, producing a `number[]` array stored in `attachment_metadata` JSONB on the
message row. If absent, the player renders as a plain progress bar. Zero server computation.

**Alternatives considered**:
- HLS streaming: rejected — massive over-engineering; S3 Range Requests are sufficient.
- Full file download before play: rejected — violates FR-P2-010 and SC-P2-004.

---

## 5. Read Receipts: IntersectionObserver Pattern

**Decision**: `ChatWindow` client component initializes an `IntersectionObserver` watching all
`.message-bubble[data-unread="true"]` elements. On intersection:
1. Message IDs are accumulated in a `Set` for 300 ms (debounce).
2. A single `markMessagesAsRead(roomId, messageIds[])` Server Action is called.
3. The Server Action: `UPDATE chat_messages SET delivery_status = 'read' WHERE id = ANY($1)
   AND room_id = $2 AND sender_id != auth.uid()` — prevents self-marking.
4. Supabase Realtime propagates the UPDATE event back to the sender's subscribed channel,
   updating the status badge within ~1 s.

**Delivered status**: When the recipient's Realtime subscription receives the `INSERT` event for
a new DM message, the client fires `markMessageDelivered(messageId)` — a lightweight single-row
UPDATE. This is the only status transition that originates from the recipient side automatically.

**DM-only enforcement**: Both Server Actions check `room_type = 'direct_message'` before
executing — group messages are silently ignored with no error.

**Alternatives considered**:
- Polling: rejected — violates ≤ 3 s SLA and creates load.
- WebSocket-only (no IntersectionObserver): rejected — cannot reliably determine viewport
  visibility from server events alone.

---

## 6. Activity Log Archival

**Decision**: Supabase Scheduled Edge Function (`archive-chat-logs`) runs daily at 02:00 UTC.

**SQL (executed inside the Edge Function via service role client)**:
```sql
WITH moved AS (
  DELETE FROM public.chat_activity_log
  WHERE event_type = 'message_sent'
    AND created_at < now() - INTERVAL '90 days'
  RETURNING *
)
INSERT INTO public.chat_activity_archive SELECT * FROM moved;
```

**Alternative — pg_cron**: Documented in `quickstart.md` as the preferred option when available
(Supabase Pro tier). The Edge Function is the fallback for Free/Starter tiers where pg_cron
extension is not available.

**Archive access in UI**: Admin log page has a toggle "عرض الأرشيف" (view archive) that switches
query source from `chat_activity_log` to `chat_activity_archive` and displays results paginated
separately (50 per page).

---

## 7. Activity Log Realtime Feed

**Decision**: Add `chat_activity_log` to `supabase_realtime` publication. Admin client subscribes
to a `channel('chat-activity-log')` watching for `INSERT` events on `chat_activity_log`.

**RLS enforces Admin-only access**: The SELECT policy on `chat_activity_log` requires
`EXISTS (SELECT 1 FROM chat_profiles WHERE user_id = auth.uid() AND global_role = 'admin')`.
Supabase Realtime respects RLS — non-admin subscribers receive no events.

**Alternatives considered**: Polling every 10 s — acceptable fallback; Realtime is already
established infrastructure and satisfies SC-P2-010 (≤ 10 s) comfortably.

---

## 8. Forward Message Data Model

**Decision**: Forwarded messages stored as new `chat_messages` rows with `is_forwarded = TRUE`.
No FK reference to source message. A `forwarded_quote_snapshot` JSONB column captures the quote
context only when forwarding a reply (to render the quote block without a cross-room FK).

**`forwarded_quote_snapshot` shape**:
```json
{
  "sender_label": "عضو",
  "content_excerpt": "أول 100 حرف من الرسالة الأصلية",
  "is_deleted": false
}
```
When `is_deleted: true`, the UI renders `"الرسالة الأصلية محذوفة"` in the quote block.

**Attachment forwarding**: The new message row copies `attachment_path`, `attachment_name`,
`attachment_size`, `attachment_mime_type` from the source — no file duplication (FR-P2-025).
Presigned URLs are generated on demand for the destination room context.

**Alternatives considered**:
- Live FK (`forward_source_message_id`): rejected — exposes source `room_id` to destination
  participants who may not have access to that room (cross-room RLS violation risk).
- Full content duplication including file bytes: rejected — unnecessary storage cost.

---

## 9. Constitution Compliance — Post-Research Check

| Principle | Status | Notes |
|---|---|---|
| I — Stack | ✅ | MediaRecorder is browser-native. No new npm packages. SECURITY DEFINER is pure Postgres. |
| II — RTL/UI | ✅ | All new components use RTL-first Tailwind logical utilities. Arabic labels throughout. |
| III — Data Integrity | ✅ N/A | Non-financial tables. `chat_activity_log` is append-only by design — consistent with Principle III audit spirit. |
| IV — RBAC | ✅ | `chat_blacklist` admin-only INSERT/DELETE. `chat_activity_log` admin-only SELECT. New admin routes gated at middleware. `send_secure_message` RPC checks `auth.uid()` participation. |
| V — Modularity | ✅ | `useVoiceRecorder` isolates MediaRecorder lifecycle. Each new component has single responsibility. All planned ≤ 200 lines. |
