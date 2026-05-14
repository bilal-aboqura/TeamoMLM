# Data Model: نظام المحادثة المغلقة

**Branch**: `014-blind-chat-system` | **Date**: 2026-05-10  
**Phase 1 & Phase 2 Ready Schema**

---

## Entity Overview

```
auth.users (existing)
    │
    ├──► chat_profiles      (1:1 — user identity & avatar)
    │
    └──► chat_participants  (M:M junction)
              │
              └──► chat_rooms  (1:N — conversation containers)
                        │
                        └──► chat_messages  (1:N — message records)
                                  │
                                  └──► self (parent_message_id — Phase 2 threading)
```

---

## Table: `chat_profiles`

Extends the base authentication identity. One row per authenticated user.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `user_id` | `uuid` | PK, FK → `auth.users(id) ON DELETE CASCADE` | Mirrors auth identity |
| `display_name` | `text` | NOT NULL, max 60 chars | Visible to Admins only in chat; never to peer users |
| `avatar_id` | `text` | NOT NULL, DEFAULT `'avatar_01'` | References predefined avatar constant ID |
| `global_role` | `global_role_enum` | NOT NULL, DEFAULT `'user'` | Platform-wide role |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Auto-updated by trigger |

**Enum**: `global_role_enum` → `('admin', 'moderator', 'user')`

**Triggers**: `updated_at` auto-update on every mutation.

**RLS Policies**:
- `SELECT`: `user_id = auth.uid()` (own profile only)
- `INSERT`: `user_id = auth.uid()` (create own profile)
- `UPDATE`: `user_id = auth.uid()` (update own profile)
- Admins bypass via service role in Server Actions (never via client)

---

## Table: `chat_rooms`

Unified container for all conversation types.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | |
| `room_type` | `room_type_enum` | NOT NULL | Discriminator |
| `name` | `text` | NULLABLE | NULL for DMs and Tickets; required for Groups |
| `description` | `text` | NULLABLE | Optional group description |
| `media_settings` | `jsonb` | NOT NULL, DEFAULT `'{"images_allowed":false,"files_allowed":false,"audio_allowed":false}'` | Granular per-type media control |
| `is_deleted` | `boolean` | NOT NULL, DEFAULT `false` | Soft-delete |
| `created_by` | `uuid` | FK → `auth.users(id) ON DELETE SET NULL` | Creator reference |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Auto-updated by trigger |

**Enum**: `room_type_enum` → `('direct_message', 'blind_group', 'ticket', 'other')`

**`media_settings` invariants**:
- DM rooms are created with `{"images_allowed":true,"files_allowed":true,"audio_allowed":false}`
- Blind Group rooms default to all-false; Admin must explicitly enable each flag
- Ticket rooms default to `{"images_allowed":true,"files_allowed":true,"audio_allowed":false}` (same as DM)

**Triggers**: `updated_at` auto-update on every mutation.

**Indexes**:
- `idx_chat_rooms_type` ON `room_type`
- `idx_chat_rooms_created_by` ON `created_by`

**RLS Policies**:
- `SELECT`: `id IN (SELECT room_id FROM chat_participants WHERE user_id = auth.uid())`
- `INSERT`: Admin only (via service role Server Action)
- `UPDATE`: Admin only (via service role Server Action — `media_settings` toggle, name change)
- `DELETE`: Soft-delete only; hard DELETE blocked at policy level

**Realtime**: Added to `supabase_realtime` publication for `media_settings` propagation.

---

## Table: `chat_participants`

Junction table linking Users to Rooms with per-room roles.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `room_id` | `uuid` | PK (composite), FK → `chat_rooms(id) ON DELETE CASCADE` | |
| `user_id` | `uuid` | PK (composite), FK → `auth.users(id) ON DELETE CASCADE` | |
| `room_role` | `room_role_enum` | NOT NULL, DEFAULT `'member'` | Role within this specific room |
| `last_read_position` | `uuid` | NULLABLE, FK → `chat_messages(id) ON DELETE SET NULL` | Cursor for read position & Phase 2 read receipts |
| `is_muted` | `boolean` | NOT NULL, DEFAULT `false` | Future moderation use |
| `joined_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |

**PRIMARY KEY**: `(room_id, user_id)`

**Enum**: `room_role_enum` → `('admin', 'moderator', 'member')`

**Indexes**:
- `idx_chat_participants_user_id` ON `user_id` — critical for all RLS subquery lookups
- `idx_chat_participants_room_id` ON `room_id`

**RLS Policies**:
- `SELECT`: `user_id = auth.uid()` — users can only see their own participant rows (enforces blind membership)
- `INSERT`: Admin only (via service role Server Action)
- `UPDATE`: Admin only for `room_role`/`is_muted`; own user allowed to update `last_read_position` only
- `DELETE`: Admin only (remove member from room)

> **Critical**: This policy is what makes group membership "blind" — a user cannot query how many or who the other participants are. They can only observe that they themselves are a participant.

---

## Table: `chat_messages`

Core message record. Phase 1 & Phase 2 fields co-located.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | |
| `room_id` | `uuid` | NOT NULL, FK → `chat_rooms(id) ON DELETE CASCADE` | |
| `sender_id` | `uuid` | NOT NULL, FK → `auth.users(id) ON DELETE SET NULL` | Raw sender UUID; identity resolved server-side |
| `content` | `text` | NULLABLE | NULL if message is attachment-only |
| `content_length_check` | — | CHECK `char_length(content) <= 4000` | Enforced at DB level |
| `attachment_path` | `text` | NULLABLE | Storage path ONLY — never a URL |
| `attachment_name` | `text` | NULLABLE | Original filename for display |
| `attachment_size` | `numeric` | NULLABLE | File size in bytes |
| `attachment_mime_type` | `text` | NULLABLE | Validated MIME type (server-side allowlist) |
| `server_timestamp` | `timestamptz` | NOT NULL, DEFAULT `now()` | Authoritative ordering timestamp |
| `is_deleted` | `boolean` | NOT NULL, DEFAULT `false` | Soft-delete; deleted messages show placeholder |
| `delivery_status` | `delivery_status_enum` | NULLABLE | **Phase 2** — NULL in Phase 1 |
| `parent_message_id` | `uuid` | NULLABLE, FK → `chat_messages(id) ON DELETE SET NULL` | **Phase 2** threading |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Immutable insert timestamp |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Auto-updated by trigger |

**Enum**: `delivery_status_enum` → `('sent', 'delivered', 'read')`

**CHECK constraints**:
- Either `content IS NOT NULL` OR `attachment_path IS NOT NULL` (message must have at least one)

**Triggers**: `updated_at` auto-update on every mutation.

**Indexes**:
- `idx_chat_messages_room_timestamp` ON `(room_id, server_timestamp DESC)` — **primary pagination index** (keyset cursor)
- `idx_chat_messages_room_id` ON `room_id`
- `idx_chat_messages_sender_id` ON `sender_id`
- `idx_chat_messages_parent` ON `parent_message_id` WHERE `parent_message_id IS NOT NULL` (partial index — Phase 2)

**RLS Policies**:
- `SELECT`: `room_id IN (SELECT room_id FROM chat_participants WHERE user_id = auth.uid())`
- `INSERT`: `sender_id = auth.uid()` AND room participation verified in the same policy via subquery
- `UPDATE`: Soft-delete only (`is_deleted = true`); allowed for own messages and for Admins/Moderators via Server Action with service role
- `DELETE`: Blocked at policy level (use soft-delete)

**Realtime**: Added to `supabase_realtime` publication. Clients subscribe filtered by `room_id`.

---

## Enums Summary

```sql
CREATE TYPE global_role_enum AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE room_type_enum   AS ENUM ('direct_message', 'blind_group', 'ticket', 'other');
CREATE TYPE room_role_enum   AS ENUM ('admin', 'moderator', 'member');
CREATE TYPE delivery_status_enum AS ENUM ('sent', 'delivered', 'read');
```

---

## State Transitions

### Room Lifecycle
```
[Created] → [Active] → [Soft-Deleted]
               │
               └─(media_settings toggle)──► [Active, media updated]
```

### Message Lifecycle
```
[Sent/INSERT] → [Visible] → [Soft-Deleted: is_deleted=true]
                    │
                    └─(Phase 2)──► [Delivered] → [Read]
```

### Participant Role Transitions (per-room)
```
[member] ←──► [moderator]   ← Admin assigns/revokes
[member] ←──► [admin]       ← Admin assigns/revokes (room-level admin)
```

---

## Supabase Storage

**Bucket**: `secure-chat-media`  
**Access**: PRIVATE (no public access)  
**Path convention**: `chat/{room_id}/{message_id}/{filename}`  
**URL generation**: 1-hour presigned URLs via `createSignedUrl` — server-side only, never persisted  

**Storage RLS policies** (bucket-level):
- `INSERT`: Authenticated users may upload to `chat/{room_id}/*` only if they are a participant of `room_id`
- `SELECT`: Signed URL generation is server-side only; no direct client SELECT policy needed

---

## Predefined Avatar Constants

Stored in `/lib/chat/avatars.ts`. Not a DB table — static codebase constants.

```typescript
// 12 predefined avatars
export const PREDEFINED_AVATARS = [
  { id: 'avatar_01', label: 'فارس', src: '/avatars/avatar_01.png' },
  { id: 'avatar_02', label: 'نجمة', src: '/avatars/avatar_02.png' },
  // ... 10 more
] as const;

export type AvatarId = typeof PREDEFINED_AVATARS[number]['id'];
```

The `avatar_id` column on `chat_profiles` stores one of these IDs. Validation is enforced via a CHECK constraint: `avatar_id = ANY(ARRAY['avatar_01','avatar_02',...,'avatar_12'])`.

---

## Migration Order

1. Create enums
2. Create `chat_profiles`
3. Create `chat_rooms`
4. Create `chat_participants` (FK → both above)
5. Create `chat_messages` (FK → `chat_rooms`, `chat_participants` via `sender_id`)
6. Create indexes
7. Enable RLS on all tables
8. Apply RLS policies
9. Add tables to `supabase_realtime` publication
10. Create storage bucket `secure-chat-media`
