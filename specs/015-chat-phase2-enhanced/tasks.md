# Tasks: Ù†Ø¸Ø§Ù… Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø© Ø§Ù„Ù…ØºÙ„Ù‚Ø© â€” Phase 2

**Branch**: `015-chat-phase2-enhanced`
**Input**: `specs/015-chat-phase2-enhanced/` (plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md)
**Stack**: Next.js 14 App Router Â· Supabase PostgreSQL Â· Tailwind CSS v3 Â· lucide-react

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable (different files, no shared dependency)
- **[Story]**: US1â€“US6 maps to spec.md user stories

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Lay the TypeScript foundation that every user story depends on.

- [X] T001 Create migration file skeleton `supabase/migrations/20260514000015_015_chat_phase2_enhanced.sql` with section headers and feature comment block
- [X] T002 [P] Extend `lib/chat/types.ts` with Phase 2 TypeScript types: `BlacklistEntry`, `ActivityLogEvent`, `ActivityLogEventType`, `BlacklistMatchMode`, `ForwardedQuoteSnapshot`, `VoiceAttachmentMetadata`, `DeliveryStatus`
- [X] T003 [P] Create `lib/chat/normalize.ts` â€” pure `normalizeArabicText(text: string): string` utility mirroring the Postgres function (strip Tashkeel U+064Bâ€“U+065F/U+0670, normalize Alef variants Ø£Ø¥Ø¢Ù±â†’Ø§, Ø©â†’Ù‡, Ù‰â†’ÙŠ, Ø¤â†’Ùˆ, Ø¦â†’ÙŠ, ASCII lowercase, collapse whitespace)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema + core RPC â€” MUST complete before any user story.

**âš ï¸ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 Write enum DDL in migration file `20260514000015_015_chat_phase2_enhanced.sql`: `blacklist_match_mode_enum ('whole_word','substring')` and `activity_event_type_enum ('message_sent','message_blocked','session_event')` wrapped in idempotent `DO $$ BEGIN IF NOT EXISTS ... END $$`
- [X] T005 [P] Write `normalize_arabic_text(p_text TEXT) RETURNS TEXT` SQL function DDL in migration (IMMUTABLE STRICT PARALLEL SAFE) applying all Arabic normalization rules from research.md Â§1
- [X] T006 [P] Write `chat_blacklist` table DDL + `idx_chat_blacklist_normalized` index + RLS policies (Admin-only SELECT/INSERT/DELETE via `chat_profiles.global_role='admin'` subquery) in migration file
- [X] T007 Write `chat_activity_log` table DDL + three indexes (`event_type`, `created_at DESC`, partial `room_id`) + RLS (Admin SELECT only â€” no client INSERT/UPDATE/DELETE policy) in migration file
- [X] T008 [P] Write `chat_activity_archive` table DDL (identical columns + `archived_at TIMESTAMPTZ`) + `created_at DESC` index + Admin-only SELECT RLS in migration file
- [X] T009 Write `ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS` DDL for three Phase 2 columns: `is_forwarded BOOLEAN NOT NULL DEFAULT false`, `forwarded_quote_snapshot JSONB`, `attachment_metadata JSONB` in migration file
- [X] T010 Write complete `send_secure_message(...)` SECURITY DEFINER plpgsql function DDL in migration file â€” all 7 steps: auth check â†’ participant check â†’ cross-room reply check â†’ blacklist loop â†’ blocked log + RAISE â†’ message INSERT â†’ sent log â†’ RETURN row; include REVOKE/GRANT
- [X] T011 Write Realtime publication DDL (add `chat_blacklist` + `chat_activity_log` to `supabase_realtime`) and bucket MIME type UPDATE for audio types in migration file
- [ ] T012 Apply migration to local Supabase (`supabase db push` or SQL Editor) and verify all tables, function, RLS, and publication entries exist

**Checkpoint**: DB schema live â€” user story implementation can now begin.

---

## Phase 3: User Story 1 â€” Word Filter & Blacklist (Priority: P1) ðŸŽ¯ MVP

**Goal**: Admin adds forbidden words; any matching message is blocked before storage and logged.

**Independent Test**: Add "ÙƒÙ„Ù…Ø© Ù…Ø­Ø¸ÙˆØ±Ø©" via blacklist UI â†’ user sends message containing it â†’ message absent from chat â†’ Activity Log shows `message_blocked` entry with matched word and no content.

### Implementation

- [X] T013 [P] [US1] Create `app/admin/chat/blacklist/_actions/addBlacklistWord.ts` Server Action: Zod schema (`wordOriginal` max 200, `matchMode` enum), admin role re-validation, compute `word_normalized` via `normalizeArabicText()`, Supabase INSERT into `chat_blacklist`, return inserted row or typed error
- [X] T014 [P] [US1] Create `app/admin/chat/blacklist/_actions/deleteBlacklistWord.ts` Server Action: Zod `wordId` UUID, admin role re-validation, DELETE from `chat_blacklist WHERE id = $wordId`, return `{ deleted: boolean }`
- [X] T015 [US1] Modify `app/dashboard/chat/_actions/sendMessage.ts` to call `supabase.rpc('send_secure_message', {...})` instead of direct INSERT; map SQLSTATE `P0001` / `MESSAGE='CONTENT_POLICY_VIOLATION'` to `{ error: 'CONTENT_POLICY_VIOLATION' }` (never expose `detail` to non-admin callers)
- [X] T016 [US1] Create `components/chat/BlacklistManager.tsx` (`"use client"`) â€” RTL data table showing `word_original`, `match_mode`, `created_at`; Add Word form (input + mode toggle + submit calling `addBlacklistWord`); delete icon per row calling `deleteBlacklistWord`; Realtime subscription `channel('chat-blacklist')` for live row refresh; â‰¤200 lines
- [X] T017 [US1] Create `app/admin/chat/blacklist/page.tsx` RSC â€” fetch blacklist rows via service role, render `<BlacklistManager initialWords={words} />`; add `loading.tsx` (skeleton rows) and `error.tsx` (Arabic error card) co-located

**Checkpoint**: US1 independently testable â€” blacklist CRUD + send blocking fully functional.

---

## Phase 4: User Story 6 â€” Admin Activity Log (Priority: P2)

**Goal**: Real-time append-only audit feed with event-type and date-range filters.

**Independent Test**: Open `/admin/chat/logs` â†’ see real-time `message_sent` events; apply "Ø±Ø³Ø§Ø¦Ù„ Ù…Ø­Ø¸ÙˆØ±Ø©" filter â†’ only blocked events; apply date range â†’ filtered results; no delete/clear control exists anywhere.

### Implementation

- [X] T018 [US6] Create `app/admin/chat/logs/_actions/getActivityLogs.ts` Server Action: Zod schema (`eventType` enum + `'all'`, `dateFrom`/`dateTo` ISO datetime optional, `page` int min 1, `includeArchive` boolean); admin role check; query `chat_activity_log` or `chat_activity_archive`; apply filters; paginate 50/page ordered `created_at DESC`; return `{ data, meta: { total, page, totalPages } }`
- [X] T019 [US6] Create `components/chat/ActivityLogFeed.tsx` (`"use client"`) â€” RTL event feed; segmented filter control (all / message_sent / message_blocked / session_event); date-range pickers; paginator; Realtime `channel('chat-activity-log')` prepends new INSERT events to list top; event rows styled per type (emerald for sent, amber for blocked, slate for session); â‰¤200 lines (split sub-components if needed)
- [X] T020 [P] [US6] Create `components/chat/ActivityLogEventRow.tsx` â€” single log event row component: icon by type, `actor_display_name`, `details` fields (room_name, matched_word), formatted `created_at` RTL timestamp; no delete action rendered
- [X] T021 [US6] Create `app/admin/chat/logs/page.tsx` RSC â€” fetch first page of logs via `getActivityLogs`, render `<ActivityLogFeed initialData={...} />`; add `loading.tsx` and `error.tsx` co-located
- [ ] T022 [P] [US6] Create Supabase Edge Function `supabase/functions/archive-chat-logs/index.ts` â€” service role client; DELETE FROM `chat_activity_log` WHERE `event_type='message_sent' AND created_at < now()-90days` RETURNING *; INSERT moved rows into `chat_activity_archive`; log count archived; schedule at `0 2 * * *` via Supabase Dashboard Cron

**Checkpoint**: US6 independently testable â€” Activity Log shows real-time events, filters work, archive toggle works, no modify controls present.

---

## Phase 5: User Story 2 â€” Voice Messages (Priority: P2)

**Goal**: Tap-to-toggle voice recording with preview; inline audio players in thread.

**Independent Test**: In group with `audio_allowed=true`, tap mic â†’ timer shows â†’ tap again â†’ preview player â†’ send â†’ audio bubble appears in thread; Admin sets `audio_allowed=false` â†’ mic disappears within 5s.

### Implementation

- [X] T023 [P] [US2] Create `lib/chat/useVoiceRecorder.ts` (`"use client"`) â€” custom hook: state machine `idle|recording|preview|sent|discarded`; `getUserMedia({audio:true})`; MIME detection (`audio/webm;codecs=opus` else `audio/mp4`); `MediaRecorder` start/stop; `ondataavailable` blob accumulation; 120s auto-stop `setTimeout`; cleanup `stream.getTracks().forEach(t=>t.stop())`; optional `AnalyserNode` amplitude sampling for waveform array; returns `{ state, startRecording, stopRecording, discard, audioBlob, mimeType, durationSeconds, waveform }`
- [X] T024 [P] [US2] Create `components/chat/AudioPlayer.tsx` (`"use client"`) â€” receives `{ src: string, durationSeconds: number, waveform?: number[] }` as props; HTML `<audio>` element with `src`; custom RTL play/pause button, elapsed/total time display; optional waveform bar visualization (progressive enhancement only â€” player functions without it); â‰¤200 lines
- [X] T025 [US2] Create `components/chat/VoiceRecorder.tsx` (`"use client"`) â€” uses `useVoiceRecorder` hook; renders mic toggle button (idle state), recording timer + animated indicator (recording state), preview player with Ø¥Ø±Ø³Ø§Ù„/Ø­Ø°Ù buttons (preview state); on send: uploads blob to `secure-chat-media` bucket via signed upload URL, then calls `sendMessage` Server Action with audio attachment fields + `attachment_metadata: { waveform, duration_seconds }`; â‰¤200 lines
- [X] T026 [US2] Extend `app/dashboard/chat/_actions/sendMessage.ts`: before calling `send_secure_message` RPC for audio messages, re-fetch `chat_rooms.media_settings` and assert `audio_allowed = true`; reject with `{ error: 'AUDIO_NOT_ALLOWED' }` if false regardless of client state
- [X] T027 [US2] Update `components/chat/MessageInput.tsx` (Phase 1 component): conditionally render `<VoiceRecorder />` when `room.media_settings.audio_allowed = true`; hide mic button otherwise; receive `audio_allowed` as prop from RSC parent
- [X] T028 [US2] Update `components/chat/MessageBubble.tsx` (Phase 1 component): when `attachment_mime_type` starts with `audio/`, render `<AudioPlayer src={presignedUrl} durationSeconds={metadata.duration_seconds} waveform={metadata.waveform} />` instead of generic file attachment

**Checkpoint**: US2 independently testable â€” voice recording, preview, send, and inline playback fully functional.

---

## Phase 6: User Story 3 â€” Delivery & Read Receipts (Priority: P2)

**Goal**: DM-only status progression `sent â†’ delivered â†’ read` via Realtime + IntersectionObserver.

**Independent Test**: User sends DM â†’ single checkmark; Admin client connects â†’ double checkmark within 3s; Admin opens conversation and scrolls to message â†’ blue double checkmark within 3s; group messages show no checkmarks.

### Implementation

- [X] T029 [P] [US3] Create `app/dashboard/chat/_actions/markMessageDelivered.ts` Server Action: Zod `{ messageId: UUID, roomId: UUID }`; verify `room_type='direct_message'`; verify caller is participant; `UPDATE chat_messages SET delivery_status='delivered', updated_at=now() WHERE id=$1 AND delivery_status='sent' AND sender_id != auth.uid()`; return `{ updated: boolean }`
- [X] T030 [P] [US3] Create `app/dashboard/chat/_actions/markMessagesAsRead.ts` Server Action: Zod `{ roomId: UUID, messageIds: UUID[] min 1 max 50 }`; verify `room_type='direct_message'`; batch `UPDATE chat_messages SET delivery_status='read' WHERE id=ANY($1) AND room_id=$2 AND sender_id!=auth.uid()`; update `chat_participants.last_read_position` to latest message ID; return `{ updatedCount: number }`
- [X] T031 [P] [US3] Create `components/chat/MessageStatusBadge.tsx` â€” receives `{ status: 'sent'|'delivered'|'read', isDM: boolean }`; renders nothing if `!isDM`; single grey checkmark for `sent`; double grey checkmark for `delivered`; double emerald checkmark for `read`; lucide-react icons or SVG inline; RTL-aware positioning
- [X] T032 [US3] Update `components/chat/ChatWindow.tsx` (`"use client"`, Phase 1): (a) add Realtime UPDATE subscription on `chat_messages` filtered by `room_id` to handle `delivery_status` changes and re-render status badges; (b) on receiving new DM INSERT event, call `markMessageDelivered` Server Action for that message; (c) initialize `IntersectionObserver` watching `.msg-bubble[data-unread="true"]` elements with 300ms debounce that calls `markMessagesAsRead` with accumulated IDs; clean up observer on unmount
- [X] T033 [US3] Update `components/chat/MessageBubble.tsx` (Phase 1): render `<MessageStatusBadge status={msg.delivery_status} isDM={isDirectMessage} />` beneath own messages only; add `data-unread={msg.delivery_status !== 'read' && !isOwnMessage}` data attribute for IntersectionObserver targeting

**Checkpoint**: US3 independently testable â€” DM status progression works end-to-end; group messages unaffected.

---

## Phase 7: User Story 4 â€” Reply / Threading (Priority: P2)

**Goal**: Tap reply on any message â†’ quoted preview in input â†’ sent reply shows quote block.

**Independent Test**: Admin sends message â†’ user taps Reply â†’ quote preview appears in input â†’ user sends reply â†’ reply appears in thread with correct quote block; deleted parent shows placeholder; blind group shows `"Ø¹Ø¶Ùˆ"` label in quote.

### Implementation

- [X] T034 [P] [US4] Create `components/chat/ReplyPreview.tsx` â€” receives `{ parentMessage: QuotedMessage | null, onCancel: () => void }`; renders RTL quote bar above input: sender label (resolved by caller per blind rules) + first 100 chars of content (or `"Ø§Ù„Ø±Ø³Ø§Ù„Ø© Ø§Ù„Ø£ØµÙ„ÙŠØ© Ù…Ø­Ø°ÙˆÙØ©"` if `is_deleted`); X cancel button clears reply state; hidden when `parentMessage` is null
- [X] T035 [P] [US4] Create `components/chat/MessageContextMenu.tsx` (`"use client"`) â€” receives `{ message, isOwnMessage, isDeleted, onReply, onForward }`; renders on long-press / right-click / swipe; shows Reply option always (when not deleted); shows Forward option only when `!isDeleted` (FR-P2-023); uses RTL-aware positioning; lucide-react icons
- [X] T036 [US4] Update `components/chat/ChatWindow.tsx`: add `replyTo: QuotedMessage | null` state; pass `onReply` handler to each `MessageContextMenu`; render `<ReplyPreview parentMessage={replyTo} onCancel={() => setReplyTo(null)} />` above `MessageInput`; pass `parentMessageId` to `sendMessage` call when `replyTo` is set; clear `replyTo` after successful send
- [X] T037 [US4] Update `components/chat/MessageBubble.tsx`: when `msg.parent_message_id` is set, render a quote block above the bubble content: fetch parent from local message cache (already loaded in thread); apply blind-identity rule to parent sender label; show `"Ø§Ù„Ø±Ø³Ø§Ù„Ø© Ø§Ù„Ø£ØµÙ„ÙŠØ© Ù…Ø­Ø°ÙˆÙØ©"` if parent `is_deleted`; show first 100 chars of parent content; style with left border accent

**Checkpoint**: US4 independently testable â€” reply flow, quote block rendering, deleted-parent placeholder, blind identity all work.

---

## Phase 8: User Story 5 â€” Forwarding (Priority: P3)

**Goal**: Forward any non-deleted message to any accessible room with "ØªÙ… Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„ØªÙˆØ¬ÙŠÙ‡" label.

**Independent Test**: Admin forwards DM message to group â†’ message appears in group with label; attachment path reused (no copy); sender label anonymized per destination blind rules; forwarding soft-deleted message: forward button absent.

### Implementation

- [X] T038 [P] [US5] Create `app/dashboard/chat/_actions/forwardMessage.ts` Server Action: Zod `{ sourceMsgId: UUID, destinationRoomId: UUID }`; fetch source message via service role client; assert `!source.is_deleted` (return `{ error: 'SOURCE_DELETED' }` otherwise); build `forwarded_quote_snapshot` JSONB server-side if source has `parent_message_id` (fetch parent, apply destination-room blind rules to `sender_label`, set `is_deleted` flag); call `send_secure_message` RPC with copied content + attachment fields, `is_forwarded: true`, snapshot; return new message or error
- [X] T039 [P] [US5] Create `components/chat/ForwardPicker.tsx` (`"use client"`) â€” modal/bottom-sheet listing rooms user participates in (excluding source room); search input; room item shows name/type; on confirm calls `forwardMessage` Server Action; shows empty state `"Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ø­Ø§Ø¯Ø«Ø§Øª Ø£Ø®Ø±Ù‰ Ù…ØªØ§Ø­Ø©"` if no rooms; RTL layout; â‰¤200 lines
- [X] T040 [US5] Update `components/chat/MessageContextMenu.tsx` (T035): wire Forward option to open `<ForwardPicker>` modal passing `sourceMsgId`; hide Forward option completely when `message.is_deleted = true` (not disabled â€” hidden per FR-P2-023)
- [X] T041 [US5] Update `components/chat/MessageBubble.tsx`: when `msg.is_forwarded = true` render a small "ØªÙ… Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„ØªÙˆØ¬ÙŠÙ‡ â†©" label above bubble content; when `msg.forwarded_quote_snapshot` is set, render quote block from snapshot data (not from live parent FK)

**Checkpoint**: US5 independently testable â€” forward flow, label display, snapshot quote, no-file-copy, deleted-message guard all work.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: RTL/UI consistency, route guards, error boundaries, AGENTS.md sync.

- [X] T042 [P] Verify all new `/admin/chat/blacklist` and `/admin/chat/logs` routes are protected by existing `middleware.ts` RBAC gate â€” add route patterns to middleware matcher config if missing
- [X] T043 [P] Add sidebar navigation links for "Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„ÙƒÙ„Ù…Ø§Øª Ø§Ù„Ù…Ø­Ø¸ÙˆØ±Ø©" and "Ø³Ø¬Ù„ Ø§Ù„Ù†Ø´Ø§Ø·" to admin chat navigation component
- [X] T044 [P] Audit all new `"use client"` boundary files and confirm each has a justification comment per Constitution Principle I
- [X] T045 [P] Add `aria-label` attributes (Arabic) to all new interactive elements: mic button, send/discard recording buttons, reply/forward context menu items, blacklist add/delete controls
- [ ] T046 Run quickstart.md validation: apply migration on clean branch, exercise all 6 user story acceptance scenarios manually, confirm no console errors
- [X] T047 Update `AGENTS.md` active technologies section with Phase 2 additions: `MediaRecorder API`, `chat_blacklist`, `chat_activity_log`, `send_secure_message RPC`, `normalize_arabic_text`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies â€” start immediately; T002 and T003 are parallel.
- **Phase 2 (Foundational)**: Depends on Phase 1. BLOCKS all user stories. T005/T006/T008 are parallel within this phase.
- **Phase 3â€“8 (User Stories)**: All depend on Phase 2 completion. Can proceed in priority order or in parallel by different developers.
- **Phase 9 (Polish)**: Depends on all desired user stories being complete.

### User Story Dependencies

| Story | Depends On | Notes |
|---|---|---|
| US1 (P1) â€” Blacklist | Phase 2 | Independent MVP â€” deliver first |
| US6 (P2) â€” Activity Log | Phase 2 + US1 | Shares `chat_activity_log` inserts from US1's RPC |
| US2 (P2) â€” Voice | Phase 2 | Independent of US1/US6 |
| US3 (P2) â€” Read Receipts | Phase 2 | Independent â€” uses Phase 1 `delivery_status` field |
| US4 (P2) â€” Reply | Phase 2 | Independent â€” uses Phase 1 `parent_message_id` field |
| US5 (P3) â€” Forward | Phase 2 + US4 | Reuses `MessageContextMenu` from US4; build after US4 |

### Parallel Opportunities Within Stories

```
Phase 2:  T005 â•‘ T006 â•‘ T008  (run together)
Phase 3:  T013 â•‘ T014         (parallel Server Actions)
Phase 5:  T023 â•‘ T024         (hook and player independent)
Phase 6:  T029 â•‘ T030 â•‘ T031  (three independent files)
Phase 7:  T034 â•‘ T035         (two independent components)
Phase 8:  T038 â•‘ T039         (action and picker independent)
Phase 9:  T042 â•‘ T043 â•‘ T044 â•‘ T045 (all independent)
```

---

## Implementation Strategy

### MVP (US1 Only â€” Phases 1â€“3)

1. Complete Phase 1: Setup (T001â€“T003)
2. Complete Phase 2: Foundational (T004â€“T012)
3. Complete Phase 3: US1 Blacklist (T013â€“T017)
4. **STOP & VALIDATE**: Add word â†’ send blocked message â†’ check log entry â†’ confirm no content stored
5. Deploy / demo MVP

### Incremental Delivery

| Increment | Stories | Value Delivered |
|---|---|---|
| 1 | US1 | Content safety live â€” zero-content block + log |
| 2 | US6 | Admin audit visibility â€” real-time log feed |
| 3 | US3 | Trust signal â€” DM read receipts |
| 4 | US4 | Contextual replies â€” threading UX |
| 5 | US2 | Voice messaging â€” audio UX |
| 6 | US5 | Cross-room forwarding |
| 7 | Polish | Accessibility, guards, AGENTS.md |

---

## Summary

| Phase | Tasks | Parallel? |
|---|---|---|
| Phase 1: Setup | T001â€“T003 | T002, T003 parallel |
| Phase 2: Foundational | T004â€“T012 | T005, T006, T008 parallel |
| Phase 3: US1 Blacklist | T013â€“T017 | T013, T014 parallel |
| Phase 4: US6 Activity Log | T018â€“T022 | T020, T022 parallel |
| Phase 5: US2 Voice | T023â€“T028 | T023, T024 parallel |
| Phase 6: US3 Read Receipts | T029â€“T033 | T029, T030, T031 parallel |
| Phase 7: US4 Reply | T034â€“T037 | T034, T035 parallel |
| Phase 8: US5 Forward | T038â€“T041 | T038, T039 parallel |
| Phase 9: Polish | T042â€“T047 | All parallel |
| **Total** | **47 tasks** | **17 parallelizable** |

