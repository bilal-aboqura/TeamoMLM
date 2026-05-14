# Research: نظام المحادثة المغلقة — Phase 0

**Branch**: `014-blind-chat-system` | **Date**: 2026-05-10  
**Status**: Complete — all decisions resolved, no NEEDS CLARIFICATION remaining.

---

## 1. RLS Strategy for Blind Identity Enforcement

**Decision**: Database-level Row-Level Security (RLS) is the primary enforcement mechanism. Application-layer filtering is a secondary UX concern only.

**Rationale**: The clarification session (Q1) confirmed this. Supabase PostgreSQL supports fine-grained RLS using `auth.uid()` and `auth.jwt()`. For the blind group use case, two separate policy layers are required:

- **Layer 1 — Room access**: A user may only SELECT from `chat_messages` where `room_id` is a room in which they are a Participant. This is enforced via a policy on `chat_messages` that uses a subquery against `chat_participants`.
- **Layer 2 — Sender identity**: In blind groups, the application layer is responsible for rendering sender identity (since RLS cannot suppress a column value based on another column's value without a view). However, the RLS policy prevents the user from ever querying `chat_profiles` or `chat_participants` for other users in those rooms. The sender identity revealed in the message row (`sender_id`) must be resolved to a display identity only for Admin/Moderator roles via server-side logic.

**Key RLS policies required**:
- `chat_participants`: `SELECT` policy → `user_id = auth.uid()` (users see only themselves); bypassed for admins via `global_role` check.
- `chat_messages`: `SELECT` policy → `room_id IN (SELECT room_id FROM chat_participants WHERE user_id = auth.uid())`.
- `chat_rooms`: `SELECT` policy → `id IN (SELECT room_id FROM chat_participants WHERE user_id = auth.uid())`.
- `chat_profiles`: `SELECT` policy → own profile only (`user_id = auth.uid()`). Admins bypass via service role on server actions.

**Alternatives considered**: Application-layer-only filtering — rejected because a single bug in the server action could leak cross-user data. View-based row filtering — acceptable but adds schema complexity not warranted for Phase 1.

---

## 2. Real-time Architecture (Supabase WebSockets)

**Decision**: `supabase_realtime` publication on `chat_messages` table. Clients subscribe to a channel filtered by `room_id`.

**Rationale**: Supabase Realtime's Postgres Changes feature broadcasts `INSERT` events on `chat_messages`. Clients filter the subscription by `room_id` so they only receive messages for the open conversation. This avoids client-side fan-out filtering.

**Key pattern**:
```
supabase
  .channel(`room:${roomId}`)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` }, handler)
  .subscribe()
```

**Media settings toggle propagation**: `chat_rooms` must also be added to the publication so that Admin `media_settings` changes propagate in real-time (within 5 seconds per SC-006). Clients subscribe to `chat_rooms` changes filtered by `id`.

**Blind identity on real-time inserts**: When a `chat_messages` INSERT arrives via Realtime, the payload includes `sender_id`. The client must determine whether to reveal the sender identity by checking if `sender_id === currentUserId` or if the user has Admin/Moderator `room_role`. If neither, the sender is rendered as anonymous.

**Alternatives considered**: Polling — rejected (violates 2-second delivery SLA). Server-Sent Events — Supabase natively supports WebSockets; SSE adds no benefit here.

---

## 3. Cursor-Based Pagination Pattern

**Decision**: Keyset (cursor) pagination using `(server_timestamp, id)` composite cursor. Initial load: 50 messages ordered `DESC`. Subsequent fetches: `WHERE (server_timestamp, id) < (cursor_timestamp, cursor_id)` ordered `DESC`, then reversed for display.

**Rationale**: Using `(timestamp, id)` composite avoids collisions when two messages have identical millisecond timestamps. The DESC ordering means we always get the newest first, then paginate backward. Results are reversed in memory before rendering so oldest appears at the top.

**`last_read_position` usage**: On conversation open, the client fetches the 50 most recent messages. If `last_read_position` is set on the Participant record, the UI scrolls to that message position. The `last_read_position` is updated via a server action whenever the user views new messages (Phase 2 read receipts; position tracking is Phase 1).

**Alternatives considered**: Offset pagination — rejected due to drift when new messages arrive (page 2 shifts). Time-only cursor — rejected due to timestamp collision risk.

---

## 4. `media_settings` JSONB Schema

**Decision**: JSONB column on `chat_rooms` with a fixed-key object and a reserved extensible structure:

```json
{
  "images_allowed": false,
  "files_allowed": false,
  "audio_allowed": false
}
```

**Rationale**: JSONB allows adding new keys (e.g., `video_allowed`) in Phase 3 without a schema migration — aligning with FR-013b. The default is all-false for groups; Direct Message rooms are seeded with all-true at creation. Supabase JSONB operators (`->>`, `@>`) allow RPC-level enforcement checks.

**Admin UI pattern**: Three independent toggle switches rendered for each flag. Each toggle fires a dedicated Server Action that performs a targeted `jsonb_set` update on the specific key only, preventing accidental overwrite of sibling flags.

**Realtime propagation**: The `chat_rooms` UPDATE event (triggered by a `media_settings` change) is received by subscribed clients within ~1 second under normal conditions, well within the 5-second SC-006 SLA.

---

## 5. Presigned URL Generation (1-Hour Expiry)

**Decision**: `supabase.storage.from('secure-chat-media').createSignedUrl(path, 3600)` called server-side on demand. Paths stored in `chat_messages.attachment_path`. URLs are never persisted.

**Rationale**: Q5 confirmed 1-hour expiry. The server action `getAttachmentUrl(attachmentPath)` is called when a conversation is rendered, generating fresh URLs for all visible attachments. Client components receive the temporary URL as a prop.

**Security pattern**:
- Bucket `secure-chat-media` is PRIVATE (no public access).
- The Server Action uses the **service role key** (server-only) to generate signed URLs.
- RLS on `chat_messages` ensures only participants of the room can trigger the Server Action for messages in that room (validated before `createSignedUrl` is called).

**File type enforcement**: Server Action validates MIME type against allowlist before calling `storage.upload`. Client-side `accept` attribute on file input is UX-only.

**Alternatives considered**: 15-minute expiry (A) — too aggressive for users who leave a tab open mid-session. 7-day (C) — excessive leak window for private media. Permanent URLs (D) — no temporal revocation possible.

---

## 6. Sender Identity Rendering in Blind Groups (Application-Layer UX)

**Decision**: The server action that fetches messages for a blind group MUST NOT resolve `sender_id` to a display name for peer users. Only Admin/Moderator senders get their `display_name` resolved. All other senders are rendered as `"عضو"` (Member) with a generic avatar.

**Implementation pattern**:
1. Server fetches messages via RLS-compliant query (only messages in rooms the user participates in).
2. Server identifies sender role for each message: if `sender_id === currentUserId` → "أنت"; if sender's `room_role` is `admin` or `moderator` → resolve `display_name` from `chat_profiles`; else → "عضو".
3. The resolved display label is injected server-side before the payload is sent to the client component.
4. Client components never receive raw `sender_id` UUIDs — only the resolved label and role.

**Alternatives considered**: Client-side resolution — rejected because it would require sending `sender_id` to the client, from which a determined user could query `chat_profiles`. Server-side resolution is mandatory.

---

## 7. Avatar System

**Decision**: 12 predefined avatars stored as constants in the codebase (`/lib/chat/avatars.ts`). Each has an `id`, `label` (Arabic), and `src` (path in Supabase Storage public bucket or static `/public/avatars/` folder).

**Rationale**: Avatars are non-sensitive, uniform, platform-managed assets. A static list in code avoids an extra DB table and allows fast rendering without network calls for the picker grid.

**Avatar visibility**: A user's selected avatar is displayed ONLY in their own profile view and potentially in admin views. In all group/DM contexts, peer user avatars are never shown to other users (enforced by sender identity rendering pattern above).

---

## 8. Route Architecture

**Decision**:

| Path | Type | Role |
|---|---|---|
| `/dashboard/chat` | Next.js Page (RSC) | User — room list + chat window |
| `/dashboard/chat/[roomId]` | Next.js Page (RSC) | User — specific conversation |
| `/admin/chat` | Next.js Page (RSC) | Admin/Moderator — full visibility dashboard |
| `/admin/chat/[roomId]` | Next.js Page (RSC) | Admin/Moderator — conversation with full identity |
| `/admin/chat/groups/new` | Next.js Page (RSC) | Admin — create group |
| `/admin/chat/groups/[groupId]/settings` | Next.js Page (RSC) | Admin — manage group, toggle media_settings |

All `/admin/chat/**` routes are protected by `middleware.ts` RBAC gate (Constitution Principle IV). Server Actions handle all mutations.

---

## 9. Constitution Compliance Pre-Check

All five principles are satisfiable with the chosen stack:

| Principle | Status | Notes |
|---|---|---|
| I — Stack | ✅ | Next.js 14 App Router + Supabase + Tailwind. No deviations. |
| II — RTL/UI | ✅ | All components use `start-`/`end-`/`ps-`/`pe-` Tailwind utilities. Arabic strings throughout. |
| III — Data Integrity | ⚠️ Partial | Chat tables are not financial, so `status` enum and `financial_audit_log` do not apply. `created_at`/`updated_at` timestamps required on all tables. |
| IV — RBAC | ✅ | RLS on all 4 tables + middleware gate on `/admin/chat/**`. |
| V — Modularity | ✅ | Component decomposition planned: `<ChatSidebar>`, `<ChatWindow>`, `<MessageList>`, `<MessageInput>`, `<AttachmentPicker>`, `<AvatarPicker>`, `<MediaSettingsPanel>`. Each under 200 lines. |
