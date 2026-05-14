# Implementation Plan: نظام المحادثة المغلقة — Blind Chat System (Phase 1)

**Branch**: `014-blind-chat-system` | **Date**: 2026-05-10 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/014-blind-chat-system/spec.md`

---

## Summary

Build Phase 1 of the Ultimate Secure & Blind Chat System — a unified real-time messaging platform enforcing strict blind identity between users. Users interact only with Admins/Moderators; peer identity is structurally invisible via Supabase Row-Level Security. The system uses a single room model supporting Direct Messages, Blind Groups, and Support Tickets. Media permissions are controlled per-group via three independent JSONB flags. The schema is designed Phase-2-forward with threading and delivery status fields present but dormant.

---

## Technical Context

**Language/Version**: TypeScript 5 / Node 20  
**Primary Dependencies**: Next.js 14 (App Router, RSC, Server Actions), Supabase JS v2, Zod, Tailwind CSS v3, lucide-react  
**Storage**: Supabase PostgreSQL (RLS-enforced) + Supabase Storage bucket `secure-chat-media` (PRIVATE)  
**Testing**: Manual cross-account testing for blind identity; Supabase local dev for RLS policy validation  
**Target Platform**: Web (mobile-first RTL, Arabic-language)  
**Performance Goals**: Message delivery ≤ 2s; history batch load ≤ 1.5s; media toggle propagation ≤ 5s  
**Constraints**: Strict blind identity — no `sender_id` UUID ever reaches client payload; all identity resolution is server-side  
**Scale/Scope**: Phase 1 target: 100 concurrent users; schema supports horizontal growth without breaking changes

---

## Constitution Check

| # | Principle | Gate Question | Status |
|---|-----------|---------------|--------|
| I | Architecture & Stack | Does this feature use Next.js App Router, Supabase Auth/DB, and Tailwind CSS only? | ✅ Pass |
| II | RTL & UI/UX | Are all new components RTL-first, using logical Tailwind utilities (`start-`/`end-`/`ps-`/`pe-`) and the approved color palette? | ✅ Pass |
| III | Data Integrity | Do all new financial records have `status`, `created_at`, `updated_at`, and are balance writes admin-only? | ✅ Pass (chat tables are non-financial; `created_at`/`updated_at` present on all tables; no balance mutations) |
| IV | RBAC | Are admin routes protected at middleware + server level, with RLS policies on all new tables? | ✅ Pass — 4 tables with RLS + middleware gate on `/admin/chat/**` |
| V | Component Modularity | Are components < 200 lines, server-first, with `loading.tsx` / `error.tsx` co-located? | ✅ Pass — 8 decomposed components planned, all under 200 lines |

**Result: All 5 gates pass. No violations.**

---

## Project Structure

### Documentation (this feature)

```text
specs/014-blind-chat-system/
├── plan.md              ← This file
├── spec.md              ← Feature specification (with clarifications)
├── research.md          ← Phase 0 decisions
├── data-model.md        ← Phase 1 DB schema
├── quickstart.md        ← Migration SQL + dev setup
├── contracts/
│   └── server-actions.md ← Server Action interface contracts
└── tasks.md             ← Phase 2 output (via /speckit-tasks)
```

### Source Code

```text
app/
├── dashboard/
│   └── chat/
│       ├── page.tsx                    # RSC: user room list sidebar + entry point
│       ├── loading.tsx
│       ├── error.tsx
│       ├── [roomId]/
│       │   ├── page.tsx                # RSC: conversation view for a specific room
│       │   ├── loading.tsx
│       │   └── error.tsx
│       └── _actions/
│           ├── sendMessage.ts
│           ├── getMessages.ts
│           ├── getAttachmentUrl.ts
│           ├── createTicket.ts
│           └── updateAvatarSelection.ts
│
└── admin/
    └── chat/
        ├── page.tsx                    # RSC: admin room overview (all rooms, full identity)
        ├── loading.tsx
        ├── error.tsx
        ├── [roomId]/
        │   ├── page.tsx                # RSC: full-visibility chat window
        │   ├── loading.tsx
        │   └── error.tsx
        ├── groups/
        │   ├── new/page.tsx            # Create blind group form
        │   └── [groupId]/settings/page.tsx  # Media settings + member management
        └── _actions/
            ├── createGroup.ts
            ├── updateMediaSettings.ts
            ├── deleteMessage.ts
            └── assignModeratorRole.ts

lib/
└── chat/
    ├── avatars.ts                      # 12 predefined avatar constants
    ├── allowlist.ts                    # MIME type server-side allowlist
    └── types.ts                        # Shared TypeScript interfaces

components/
└── chat/
    ├── ChatSidebar.tsx                 # Room list — DMs, Groups, Tickets (user view)
    ├── ChatWindow.tsx                  # Client component: real-time message thread
    ├── MessageList.tsx                 # Scrollable message list with cursor pagination
    ├── MessageBubble.tsx               # Single message: text, attachment, deleted states
    ├── MessageInput.tsx                # Text input + conditional attachment controls
    ├── AttachmentPicker.tsx            # Image/file pickers gated by media_settings flags
    ├── AvatarPicker.tsx                # Predefined avatar grid (profile settings)
    └── MediaSettingsPanel.tsx          # Admin: 3 independent toggle switches per group

supabase/
└── migrations/
    └── YYYYMMDDHHMMSS_014_blind_chat_system.sql
```

**Structure Decision**: Next.js App Router convention — page-adjacent `_actions/` for Server Actions, `_components/` for page-specific RSCs, global `components/chat/` for shared chat UI. Admin and user surfaces are separate route trees protected by middleware.

---

## Architecture Decisions

### Blind Identity Enforcement (Two-Layer)

```
Layer 1 — DB/RLS:  User session cannot query other users' chat_participants rows
                   → membership is structurally blind
                   
Layer 2 — Server:  getMessages() Server Action resolves sender identity before
                   returning payload — raw sender_id never reaches client bundle
                   → "عضو" label for peer users, display_name only for Admins/Mods
```

### Real-time Architecture

```
Supabase Realtime (chat_messages INSERT) → ChatWindow Client Component
  ├── Filter: room_id = current room
  └── Blind check: if senderRole = 'member' AND !isOwn → label as "عضو"

Supabase Realtime (chat_rooms UPDATE) → MessageInput Client Component  
  └── Refresh media_settings → show/hide image/file pickers
```

### Cursor Pagination

```
Initial load: SELECT ... ORDER BY server_timestamp DESC, id DESC LIMIT 50
Cursor fetch:  WHERE (server_timestamp, id) < ($cursor_ts, $cursor_id)
               ORDER BY server_timestamp DESC, id DESC LIMIT 50
Display:       Reverse result array → oldest at top, newest at bottom
```

### Media Settings Toggle (JSONB atomic update)

```sql
UPDATE chat_rooms
SET media_settings = jsonb_set(media_settings, '{images_allowed}', 'true'::jsonb),
    updated_at = now()
WHERE id = $roomId;
-- Each flag updated independently to prevent concurrent write collision
```

---

## Key Risks & Mitigations

| Risk | Mitigation |
|---|---|
| RLS policy bug exposes peer identity | Defense-in-depth: server-side identity resolution as second layer; systematic cross-account test matrix |
| Realtime `sender_id` in payload leaks identity | Sender identity resolved server-side in `getMessages`; Realtime payload sanitized in `ChatWindow` before render |
| `jsonb_set` concurrent writes overwrite sibling flags | Use targeted `jsonb_set` per key, not full JSONB replacement |
| Presigned URL cached/stored by client | `getAttachmentUrl` returns URL only; never stored in DB or client state beyond component lifecycle |
| Large group membership visible via Realtime | `chat_participants` NOT added to Realtime publication; only `chat_messages` and `chat_rooms` are published |

---

## Phase 2 Forward-Compatibility Checklist

| Phase 2 Feature | Phase 1 Schema Field | Status |
|---|---|---|
| Message threading | `chat_messages.parent_message_id` (nullable UUID) | ✅ Present |
| Read receipts | `chat_messages.delivery_status` (nullable enum) | ✅ Present |
| Read position | `chat_participants.last_read_position` (nullable FK) | ✅ Present |
| Audio messages | `media_settings.audio_allowed` (boolean, default false) | ✅ Present |
| Future room types | `room_type_enum` includes `'other'` reserved value | ✅ Present |
| Member muting | `chat_participants.is_muted` (boolean, default false) | ✅ Present |
