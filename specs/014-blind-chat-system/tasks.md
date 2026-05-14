# Tasks: Ù†Ø¸Ø§Ù… Ø§Ù„Ù…Ø­Ø§Ø¯Ø«Ø© Ø§Ù„Ù…ØºÙ„Ù‚Ø© â€” Blind Chat System (Phase 1)

**Branch**: `014-blind-chat-system` | **Date**: 2026-05-10  
**Stack**: Next.js 14 App Router Â· Supabase PostgreSQL + Storage Â· Tailwind CSS v3 Â· TypeScript 5  
**Total Tasks**: 62 | **User Stories**: 6

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Foundational files, constants, and type definitions that everything else depends on.

- [X] T001 Create directory structure: `app/dashboard/chat/`, `app/admin/chat/`, `lib/chat/`, `components/chat/`, `supabase/migrations/`
- [X] T002 [P] Create shared TypeScript types in `lib/chat/types.ts` â€” `ChatRoom`, `ChatMessage`, `ChatParticipant`, `ChatProfile`, `MessagePayload`, `MediaSettings`, `SenderLabel` interfaces
- [X] T003 [P] Create predefined avatar constants in `lib/chat/avatars.ts` â€” 12 avatar entries with `id`, `label` (Arabic), `src` fields; export `PREDEFINED_AVATARS` const array and `AvatarId` type
- [X] T004 [P] Create server-side MIME type allowlist in `lib/chat/allowlist.ts` â€” export `ALLOWED_IMAGE_TYPES`, `ALLOWED_FILE_TYPES`, and `isAllowedMimeType(mime, mediaSettings)` helper
- [X] T005 Create Supabase server client helper in `lib/supabase/server.ts` â€” `createServerClient()` (anon key, cookie-based) and `createServiceClient()` (service role, server-only)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, RLS policies, storage bucket, and Realtime setup. MUST be 100% complete before any user story work begins.

> âš ï¸ **CRITICAL**: No user story work can begin until this phase is complete.

- [X] T006 Write full Supabase migration in `supabase/migrations/YYYYMMDDHHMMSS_014_blind_chat_system.sql` â€” all 4 enums (`global_role_enum`, `room_type_enum`, `room_role_enum`, `delivery_status_enum`)
- [X] T007 Add `chat_profiles` table to migration â€” columns: `user_id` PK FK, `display_name`, `avatar_id` with CHECK constraint against 12 valid IDs, `global_role`, `created_at`, `updated_at`
- [X] T008 Add `chat_rooms` table to migration â€” columns: `id` UUID PK, `room_type`, `name`, `description`, `media_settings` JSONB default all-false, `is_deleted`, `created_by`, `created_at`, `updated_at`
- [X] T009 Add `chat_messages` table to migration â€” all columns per data-model.md including Phase 2 fields `delivery_status` (nullable), `parent_message_id` (nullable FK self-ref), CHECK constraint `content IS NOT NULL OR attachment_path IS NOT NULL`
- [X] T010 Add `chat_participants` table to migration â€” composite PK `(room_id, user_id)`, `room_role`, `last_read_position` nullable FK â†’ `chat_messages`, `is_muted`, `joined_at`
- [X] T011 Add all indexes to migration â€” `idx_chat_messages_room_ts ON (room_id, server_timestamp DESC)` as primary pagination index, plus all secondary indexes per data-model.md
- [X] T012 Add `updated_at` trigger function and triggers to migration for `chat_profiles`, `chat_rooms`, `chat_messages`
- [X] T013 Add `ENABLE ROW LEVEL SECURITY` statements for all 4 tables to migration
- [X] T014 Add RLS policies to migration: `chat_profiles` â€” own-row SELECT/INSERT/UPDATE
- [X] T015 Add RLS policies to migration: `chat_rooms` â€” SELECT via `chat_participants` subquery; INSERT/UPDATE/DELETE blocked for non-service-role
- [X] T016 Add RLS policies to migration: `chat_participants` â€” SELECT `user_id = auth.uid()` only (blind membership); UPDATE own `last_read_position` only
- [X] T017 Add RLS policies to migration: `chat_messages` â€” SELECT via participant subquery; INSERT with `sender_id = auth.uid()` + participant check; UPDATE soft-delete own messages only
- [X] T018 Add Realtime publication statements to migration â€” `ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages` and `chat_rooms` (NOT `chat_participants`)
- [ ] T019 Apply migration to Supabase project and verify all tables, indexes, policies, and triggers exist
- [X] T020 Create `secure-chat-media` storage bucket in Supabase â€” PRIVATE, 25 MB limit, MIME type allowlist per quickstart.md
- [X] T021 [P] Protect `/admin/chat` route tree in `middleware.ts` â€” verify JWT `global_role` claim is `admin` or `moderator`; return 403 on failure (never redirect)

**Checkpoint**: Run `supabase db diff` â€” zero pending migrations. Verify RLS by attempting a cross-user query in SQL Editor â€” it must return 0 rows.

---

## Phase 3: US1 â€” User Sends a DM to Admin (Priority: P1) ðŸš€ MVP

**Goal**: A logged-in user can open their DM conversation with an Admin, send a text message, and see it appear in real-time. Admin replies appear without page refresh.

**Independent Test**: Log in as User A, navigate to `/dashboard/chat`, open the DM, send "Ù…Ø±Ø­Ø¨Ø§", confirm it appears. Log in as Admin, reply. Confirm reply appears on User A's screen within 2 seconds.

### Implementation for US1

- [X] T022 [US1] Create `app/dashboard/chat/_actions/getMessages.ts` â€” Server Action: verify participation via RLS, fetch 50 messages DESC using `(server_timestamp, id)` cursor, resolve sender identity server-side (`"Ø£Ù†Øª"` / `display_name` for admin or mod / `"Ø¹Ø¶Ùˆ"` for peer), generate 1-hour presigned URL for any `attachment_path` via service client, return typed `MessagePayload[]` with `nextCursor`
- [X] T023 [US1] Create `app/dashboard/chat/_actions/sendMessage.ts` â€” Server Action: Zod validate `{roomId, content?, attachment?}`, verify participation, verify media flag if attachment present, verify MIME against allowlist, INSERT into `chat_messages`, return `{success, messageId}`
- [X] T024 [US1] Create `app/dashboard/chat/page.tsx` â€” RSC: fetch user's DM rooms via `chat_participants` (own rows only), render `<ChatSidebar>` with room list; redirect to first DM if only one exists
- [X] T025 [US1] Create `app/dashboard/chat/loading.tsx` and `app/dashboard/chat/error.tsx` â€” RTL skeleton loader and Arabic error message
- [X] T026 [US1] Create `app/dashboard/chat/[roomId]/page.tsx` â€” RSC: validate user is participant of `roomId` (else 404), call `getMessages`, pass initial messages as props to `<ChatWindow>`
- [X] T027 [US1] Create `app/dashboard/chat/[roomId]/loading.tsx` and `app/dashboard/chat/[roomId]/error.tsx`
- [X] T028 [P] [US1] Create `components/chat/ChatSidebar.tsx` â€” Client Component: list of DM and group rooms; active room highlight; RTL layout using `ps-`, `pe-`, `start-`, `end-` utilities; `bg-white` cards with `border-slate-100` per design system
- [X] T029 [US1] Create `components/chat/ChatWindow.tsx` â€” Client Component: establishes Supabase Realtime subscription to `room:{roomId}` channel filtering `chat_messages` INSERT by `room_id`; on new INSERT applies blind-identity check (`isOwn || senderRole !== 'member'` â†’ show label, else `"Ø¹Ø¶Ùˆ"`); renders `<MessageList>`; manages cursor-based fetch-older on scroll-to-top
- [X] T030 [US1] Create `components/chat/MessageList.tsx` â€” renders `<MessageBubble>` for each message; scroll-to-bottom on new own message; scroll anchor from `last_read_position`; "ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…Ø²ÙŠØ¯" button triggers cursor fetch
- [X] T031 [US1] Create `components/chat/MessageBubble.tsx` â€” handles 4 states: own message (right-aligned emerald bubble), admin/mod message (left-aligned slate bubble with `display_name`), peer user message (left-aligned grey, label `"Ø¹Ø¶Ùˆ"`), soft-deleted message (italic `"ØªÙ… Ø­Ø°Ù Ù‡Ø°Ù‡ Ø§Ù„Ø±Ø³Ø§Ù„Ø©"` â€” hidden from regular users, shown to admin/mod)
- [X] T032 [US1] Create `components/chat/MessageInput.tsx` â€” Client Component: controlled textarea (max 4000 chars); send button calls `sendMessage` action; disable send while pending; show char counter when > 3500; no attachment controls in this task (added in US4)

**Checkpoint**: User Story 1 complete and independently testable. DM send/receive works. Real-time delivery confirmed. Blind identity confirmed (user sees only own + admin messages).

---

## Phase 4: US2 â€” User Participates in a Blind Group (Priority: P2)

**Goal**: A user added to a blind group sees only their own messages and Admin/Moderator messages. Peer user messages are invisible. Member count is shown but identities are hidden.

**Independent Test**: Add User A and User B to the same group. User A sends a message â€” logged in as User B it is invisible. Admin broadcasts â€” both see it. Each user sees their own messages labeled `"Ø£Ù†Øª"`.

### Implementation for US2

- [X] T033 [US2] Update `app/dashboard/chat/page.tsx` â€” extend RSC to also fetch blind group rooms from `chat_participants` (own rows); render groups section in `<ChatSidebar>` below DMs; show member count (not names) via `COUNT(*)` aggregate on server only
- [X] T034 [US2] Update `components/chat/ChatSidebar.tsx` â€” add Groups section with group name and member count badge; no member names or avatars shown; RTL section headers in Arabic (`"Ø§Ù„Ù…Ø¬Ù…ÙˆØ¹Ø§Øª"`, `"Ø§Ù„Ø±Ø³Ø§Ø¦Ù„ Ø§Ù„Ù…Ø¨Ø§Ø´Ø±Ø©"`)
- [ ] T035 [US2] Verify `getMessages.ts` already handles blind groups correctly â€” sender identity resolution must produce `"Ø¹Ø¶Ùˆ"` for any `room_role = 'member'` sender who is not `auth.uid()`; add explicit unit-test-style manual check with two test accounts
- [X] T036 [US2] Update `components/chat/ChatWindow.tsx` â€” for `room_type = 'blind_group'`: suppress any UI element that could reveal peer count dynamically (do not expose live subscriber count from Realtime presence); show static member count from RSC prop only

**Checkpoint**: Cross-account blind group test passes: User B cannot see User A's messages. Admin broadcast visible to all.

---

## Phase 5: US3 â€” Admin Broadcasts and Moderates a Group (Priority: P2)

**Goal**: Admin creates a group, adds members, sends broadcasts with full visibility, and can delete messages and toggle per-type media settings.

**Independent Test**: Admin creates group "Ø§Ø®ØªØ¨Ø§Ø±", adds 2 users, sends message, sees all member messages, toggles `images_allowed` off, confirms users lose image picker, deletes a message, confirms placeholder shown.

### Implementation for US3

- [X] T037 [US3] Create `app/admin/chat/_actions/createGroup.ts` â€” Server Action: Zod validate `{name, description?, memberIds[]}`, verify caller `global_role = 'admin'` via service client, verify all memberIds exist in `chat_profiles`, INSERT `chat_rooms` (type: `blind_group`, all media flags false), INSERT `chat_participants` for caller (role: `admin`) + all memberIds (role: `member`)
- [X] T038 [US3] Create `app/admin/chat/_actions/updateMediaSettings.ts` â€” Server Action: verify admin role, use `jsonb_set` per flag independently (not full object replacement), UPDATE `chat_rooms SET media_settings = jsonb_set(...)` for each flag, return `{success}`
- [X] T039 [US3] Create `app/admin/chat/_actions/deleteMessage.ts` â€” Server Action: verify `global_role = 'admin'` OR (`global_role = 'moderator'` AND participant of room), soft-delete: `UPDATE chat_messages SET is_deleted = true WHERE id = $messageId`, return `{success}`
- [X] T040 [US3] Create `app/admin/chat/page.tsx` â€” RSC: fetch ALL rooms admin participates in (using service client to bypass user-scope RLS), render admin room list with full member names visible
- [X] T041 [US3] Create `app/admin/chat/loading.tsx` and `app/admin/chat/error.tsx`
- [X] T042 [US3] Create `app/admin/chat/[roomId]/page.tsx` â€” RSC: full-visibility chat window; call `getMessages` with admin service client (resolves all sender `display_name`s); pass to `<ChatWindow>` with `isAdmin={true}` prop enabling delete controls per message
- [X] T043 [US3] Create `app/admin/chat/[roomId]/loading.tsx` and `app/admin/chat/[roomId]/error.tsx`
- [X] T044 [US3] Create `app/admin/chat/groups/new/page.tsx` â€” RSC form: group name, description, member search (server-side typeahead against `chat_profiles`); submit calls `createGroup` action; redirect to new group on success
- [X] T045 [US3] Create `app/admin/chat/groups/[groupId]/settings/page.tsx` â€” RSC: load group `media_settings`; render `<MediaSettingsPanel>`; render member list with role management
- [X] T046 [P] [US3] Create `components/chat/MediaSettingsPanel.tsx` â€” 3 independent toggle switches: `images_allowed`, `files_allowed`, `audio_allowed` (disabled/greyed in Phase 1 UI, present in DOM); each toggle calls `updateMediaSettings`; subscribes to `room-settings:{roomId}` Realtime channel for live sync; RTL layout, emerald active state per design system
- [X] T047 [US3] Update `components/chat/ChatWindow.tsx` â€” when `isAdmin={true}`: render delete button on hover for each `<MessageBubble>`; show soft-deleted message placeholder to admin (not hidden); show full sender `display_name` (not `"Ø¹Ø¶Ùˆ"`)

**Checkpoint**: Admin can create group, toggle media flags independently, delete messages. Realtime propagation of `media_settings` change verified within 5 seconds.

---

## Phase 6: US4 â€” User Sends Image or File in Permitted Chat (Priority: P3)

**Goal**: In rooms where the corresponding media flag is true, users can attach images (â‰¤10 MB) or files (â‰¤25 MB). When a flag is false, that picker is hidden with an Arabic tooltip.

**Independent Test**: Enable `images_allowed` only for a group. User sees image picker but not file picker. Upload 1 MB PNG â€” appears as thumbnail within 3 seconds. Disable flag â€” picker disappears within 5 seconds.

### Implementation for US4

- [X] T048 [US4] Create `app/dashboard/chat/_actions/getAttachmentUrl.ts` â€” Server Action: fetch `attachment_path` + `room_id` from `chat_messages` (RLS implicit), verify participant, call `createSignedUrl(path, 3600)` using service client, return `{success, signedUrl, expiresIn: 3600}`
- [X] T049 [US4] Create `components/chat/AttachmentPicker.tsx` â€” Client Component: receives `mediaSettings: MediaSettings` prop; renders image picker button only if `images_allowed`; renders file picker button only if `files_allowed`; each button hidden (not disabled) when flag is false; tooltip on hidden state reads `"Ø±ÙØ¹ Ø§Ù„ÙˆØ³Ø§Ø¦Ø· Ù…Ø¹Ø·Ù„ ÙÙŠ Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø¬Ù…ÙˆØ¹Ø©"`; validates file size client-side before upload (10 MB for images, 25 MB for files); calls server action to upload to `secure-chat-media/{roomId}/{messageId}/{filename}` path
- [X] T050 [US4] Update `components/chat/MessageInput.tsx` â€” integrate `<AttachmentPicker>` below textarea; pass current `mediaSettings` from room; show selected file preview before send; clear preview on successful send
- [X] T051 [US4] Update `components/chat/MessageBubble.tsx` â€” handle attachment display: image MIME â†’ render `<Image>` thumbnail using `signedUrl` from `getAttachmentUrl`; non-image â†’ render file card with filename, size, and download link using signed URL; handle loading state while URL is fetched
- [X] T052 [US4] Update `app/dashboard/chat/[roomId]/page.tsx` â€” pass `mediaSettings` from room record as prop to `<ChatWindow>` so `<AttachmentPicker>` can render correctly on initial load
- [X] T053 [US4] Update `components/chat/ChatWindow.tsx` â€” subscribe to `room-settings:{roomId}` Realtime channel on `chat_rooms` UPDATE; refresh `mediaSettings` state so `<AttachmentPicker>` visibility updates within 5 seconds of Admin toggle

**Checkpoint**: Image upload end-to-end works with presigned URL. File picker hidden when `files_allowed=false`. Realtime media toggle propagation confirmed.

---

## Phase 7: US5 â€” User Selects a Predefined Avatar (Priority: P3)

**Goal**: Users can select from 12 predefined avatars in profile settings. No custom upload control exists. Selected avatar is visible only in own profile view, never in shared chat spaces.

**Independent Test**: User selects `avatar_03`, saves, returns to profile â€” `avatar_03` shown. Log in as different user, open same group â€” first user's avatar never appears.

### Implementation for US5

- [X] T054 [US5] Create `app/dashboard/chat/_actions/updateAvatarSelection.ts` â€” Server Action: Zod validate `avatarId` against `PREDEFINED_AVATARS` ID enum, UPDATE `chat_profiles SET avatar_id = $avatarId` (RLS enforces own-row only), return `{success}`
- [X] T055 [P] [US5] Create `components/chat/AvatarPicker.tsx` â€” Client Component: renders 3Ã—4 grid of predefined avatars from `PREDEFINED_AVATARS` constant; selected avatar shown with emerald ring; click calls `updateAvatarSelection`; no file upload input exists anywhere in this component; Arabic `label` shown beneath each avatar option
- [X] T056 [US5] Add avatar picker section to user profile settings â€” integrate `<AvatarPicker>` into existing profile settings page or create `app/dashboard/settings/profile/page.tsx` if not present; show current avatar in page header; RTL layout

**Checkpoint**: Avatar selection round-trip works. Verified that no peer avatar is ever rendered in `<MessageBubble>` or `<ChatSidebar>` for regular users.

---

## Phase 8: US6 â€” Moderator Reviews Group Activity (Priority: P3)

**Goal**: A user assigned `room_role = 'moderator'` for a group sees all messages (full visibility like admin), can delete messages, but has no access to group settings or media toggles.

**Independent Test**: Assign Moderator role to User M on Group G. Log in as M â€” see all messages including peer user messages. Delete a message â€” placeholder shown. Attempt to navigate to group settings â€” access denied.

### Implementation for US6

- [X] T057 [US6] Create `app/admin/chat/_actions/assignModeratorRole.ts` â€” Server Action: Zod validate `{roomId, userId, role: 'moderator'|'member'}`, verify caller `global_role = 'admin'`, verify target is participant, UPDATE `chat_participants SET room_role = role`, return `{success}`
- [X] T058 [US6] Add member role management UI to `app/admin/chat/groups/[groupId]/settings/page.tsx` â€” list participants with current `room_role`, "ØªØ¹ÙŠÙŠÙ† Ù…Ø´Ø±Ù" / "Ø¥Ø²Ø§Ù„Ø© Ø§Ù„Ù…Ø´Ø±Ù" button per member row; calls `assignModeratorRole` action
- [X] T059 [US6] Update `middleware.ts` â€” extend `/admin/chat/**` gate to also allow `global_role = 'moderator'`; block group settings route (`/admin/chat/groups/*/settings`) for moderators â€” return 403
- [X] T060 [US6] Update `app/admin/chat/[roomId]/page.tsx` â€” detect if caller is moderator (vs admin) via `chat_participants.room_role`; hide "Group Settings" link and media toggle panel from moderator view; show delete button per message (moderators can delete)

**Checkpoint**: Moderator sees all messages. Delete works. Settings page returns 403. Role revocation works and takes effect on next session.

---

## Phase 9: US1 Ticket Extension â€” Support Ticket Initiation

**Goal**: A regular user can open a new Support Ticket (user-initiated only). Ticket shares the DM interface. Admin cannot initiate.

**Independent Test**: User clicks "ÙØªØ­ ØªØ°ÙƒØ±Ø© Ø¯Ø¹Ù…", fills subject + initial message, ticket room created, user lands in conversation, Admin sees it in their inbox.

### Implementation for Ticket Extension

- [X] T061 [US1] Create `app/dashboard/chat/_actions/createTicket.ts` â€” Server Action: Zod validate `{subject: min 5 max 120, initialMessage: min 10 max 4000}`, verify caller `global_role = 'user'` (reject if admin), INSERT `chat_rooms` (type: `ticket`, name: subject, media: images+files enabled), INSERT two `chat_participants` rows (user as `member`, default admin as `admin`), INSERT initial message, return `{success, roomId}`
- [X] T062 [US1] Add "ÙØªØ­ ØªØ°ÙƒØ±Ø© Ø¯Ø¹Ù…" button to `app/dashboard/chat/page.tsx` sidebar â€” modal or inline form with subject and initial message fields; submit calls `createTicket`; redirect to new ticket room on success; hide button for users who already have an open ticket (optional Phase 1 constraint)

**Checkpoint**: Ticket creation end-to-end works. Ticket appears in user's chat sidebar under "Ø§Ù„ØªØ°Ø§ÙƒØ±". Admin sees it in admin chat inbox.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: RTL audit, empty states, error handling hardening, edge cases from spec.

- [X] T063 [P] RTL audit â€” review all new components for `text-start`/`text-end`, `ps-`/`pe-`/`ms-`/`me-`, `start-`/`end-` Tailwind utilities; replace any `left-`/`right-`/`pl-`/`pr-` instances
- [X] T064 [P] Empty state â€” add `"Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ø­Ø§Ø¯Ø«Ø§Øª Ø¨Ø¹Ø¯"` empty state to `app/dashboard/chat/page.tsx` when user has no rooms
- [ ] T065 [P] Optimistic UI â€” add optimistic message insert in `<ChatWindow>` before `sendMessage` resolves; show "failed to send" indicator with retry on action error; prevent duplicate on retry using idempotency key
- [ ] T066 [P] Removed-from-group edge case â€” in `<ChatWindow>` Realtime handler, listen for own `chat_participants` row deletion; redirect to room list with Arabic notification `"Ù„Ù… ØªØ¹Ø¯ Ø¹Ø¶ÙˆÙ‹Ø§ ÙÙŠ Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø¬Ù…ÙˆØ¹Ø©"`
- [X] T067 [P] File size rejection â€” in `<AttachmentPicker>`, add client-side file size check before upload attempt; show Arabic error toast for oversized files; never initiate upload if file exceeds limit
- [ ] T068 Validate migration `quickstart.md` steps end-to-end â€” fresh Supabase project, apply migration, create bucket, run dev server, complete all checkpoint tests from US1 through US6

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies â€” start immediately; all tasks [P] parallelizable
- **Phase 2 (Foundational)**: Depends on Phase 1 â€” **BLOCKS ALL user stories**
- **Phase 3 (US1 â€” DM)**: Depends on Phase 2 â€” **MVP gate**
- **Phase 4 (US2 â€” Blind Group)**: Depends on Phase 2; shares `getMessages` from Phase 3
- **Phase 5 (US3 â€” Admin)**: Depends on Phase 2; extends Phase 4 group rooms
- **Phase 6 (US4 â€” Media)**: Depends on Phase 3 (MessageInput) + Phase 5 (media_settings)
- **Phase 7 (US5 â€” Avatar)**: Depends on Phase 2 only â€” fully independent
- **Phase 8 (US6 â€” Moderator)**: Depends on Phase 5 (admin routes exist)
- **Phase 9 (Ticket)**: Extends Phase 3 (DM interface)
- **Phase 10 (Polish)**: Depends on all desired stories complete

### User Story Dependencies

| Story | Depends On | Independently Testable |
|---|---|---|
| US1 â€” DM | Phase 2 only | âœ… Yes |
| US2 â€” Blind Group | Phase 2 + US1 shared actions | âœ… Yes |
| US3 â€” Admin | Phase 2 + US2 routes | âœ… Yes |
| US4 â€” Media | Phase 2 + US3 (media_settings) | âœ… Yes |
| US5 â€” Avatar | Phase 2 only | âœ… Yes |
| US6 â€” Moderator | Phase 2 + US3 (admin routes) | âœ… Yes |

### Parallel Opportunities Within Stories

```
Phase 1:  T001 â†’ T002 + T003 + T004 + T005 (all parallel after T001)

Phase 2:  T006 â†’ T007 â†’ T008 â†’ T009 â†’ T010 (sequential, FK deps)
          T011 + T012 + T013 (parallel after T010)
          T014 + T015 + T016 + T017 (parallel after T013)
          T018 â†’ T019 â†’ T020 + T021 (T020, T021 parallel)

Phase 3:  T022 + T023 + T028 (parallel)
          T024 + T029 + T030 + T031 + T032 (parallel after T022)

Phase 5:  T037 + T038 + T039 + T046 (parallel)

Phase 6:  T048 + T049 + T055 (parallel)
```

---

## Implementation Strategy

### MVP First (US1 Only â€” ~2 days)

1. Complete **Phase 1** (Setup) â€” ~1 hour
2. Complete **Phase 2** (Foundation) â€” ~4 hours (migration + bucket + middleware)
3. Complete **Phase 3** (US1 â€” DM send/receive) â€” ~6 hours
4. âœ… **STOP & VALIDATE**: DM works end-to-end with real-time delivery and blind identity

### Incremental Delivery

| Sprint | Adds | Deliverable |
|---|---|---|
| Sprint 1 | Phase 1 + 2 + 3 | Working DM + Realtime + Blind identity (MVP) |
| Sprint 2 | Phase 4 + 5 | Blind Groups + Admin moderation panel |
| Sprint 3 | Phase 6 + 9 | Media uploads + Support Tickets |
| Sprint 4 | Phase 7 + 8 + 10 | Avatar picker + Moderator role + Polish |

---

## Notes

- `[P]` = task operates on distinct files with no in-flight dependencies â€” safe to parallelize
- `[US#]` = maps task to user story for traceability
- **Never pass `sender_id` UUID to client components** â€” always resolve to label server-side in `getMessages`
- **Always use service client** (`createServiceClient`) for `createSignedUrl` â€” anon key cannot sign private bucket URLs
- **`jsonb_set` per flag** â€” never replace entire `media_settings` object to prevent concurrent admin edits colliding
- Commit after each checkpoint; use `git stash` if switching between story branches mid-sprint
