# Data Model: نظام المحادثة المغلقة — Phase 2 Additions

**Branch**: `015-chat-phase2-enhanced` | **Date**: 2026-05-14
**Depends On**: `014-blind-chat-system` — all Phase 1 tables must be present and live.

---

## Entity Relationship (Phase 2 Delta)

```
auth.users (existing)
    └──► chat_blacklist          (NEW — platform-wide forbidden word list, admin-only)

chat_messages (existing, MODIFIED)
    │   + is_forwarded BOOLEAN
    │   + forwarded_quote_snapshot JSONB
    │   + attachment_metadata JSONB  (waveform data for audio; optional)
    │
    └──► self (parent_message_id — Phase 1 field, Phase 2 UI activated)

chat_activity_log               (NEW — append-only audit events)
    └──► chat_activity_archive   (NEW — cold archive for message_sent > 90 days)
```

---

## Enum Additions

```sql
CREATE TYPE public.blacklist_match_mode_enum AS ENUM ('whole_word', 'substring');
CREATE TYPE public.activity_event_type_enum  AS ENUM ('message_sent', 'message_blocked', 'session_event');
```

---

## Table: `chat_blacklist` (NEW)

Platform-wide forbidden word registry. **Immutable after creation** (no UPDATE — Admin can only
DELETE and re-add).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | |
| `word_original` | `text` | NOT NULL, `char_length BETWEEN 1 AND 200` | Admin's exact input; displayed in UI |
| `word_normalized` | `text` | NOT NULL | Pre-computed via `normalize_arabic_text()` at insert time |
| `match_mode` | `blacklist_match_mode_enum` | NOT NULL, DEFAULT `'whole_word'` | Matching strategy |
| `created_by` | `uuid` | FK → `auth.users(id) ON DELETE SET NULL` | Admin who added the word |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | |

> No `updated_at` — rows are immutable after creation.

**Indexes**:
- `idx_chat_blacklist_normalized` ON `word_normalized` — used by `send_secure_message` scan.

**RLS Policies**:
- `SELECT`: `EXISTS (SELECT 1 FROM chat_profiles WHERE user_id = auth.uid() AND global_role = 'admin')`
- `INSERT`: Admin only (same condition)
- `DELETE`: Admin only (same condition)
- No `UPDATE` policy — rows cannot be edited, only deleted and re-created.

**Realtime**: Added to `supabase_realtime` publication so Admin UI reflects live additions.

---

## Table: `chat_activity_log` (NEW)

Append-only audit event stream. **No UPDATE or DELETE policy exists on this table for any role.**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT `gen_random_uuid()` | |
| `event_type` | `activity_event_type_enum` | NOT NULL | `message_sent`, `message_blocked`, or `session_event` |
| `room_id` | `uuid` | NULLABLE, FK → `chat_rooms(id) ON DELETE SET NULL` | NULL for `session_event` |
| `actor_display_name` | `text` | NOT NULL | Admin-visible display name — never a peer-visible identity |
| `details` | `jsonb` | NOT NULL | Event-specific metadata. **Strictly NO message content.** See shapes below. |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Server-assigned; immutable |

**`details` JSONB shapes by event type**:

```jsonc
// message_sent
{ "room_name": "اسم الغرفة", "message_id": "uuid" }

// message_blocked
{ "room_name": "اسم الغرفة", "matched_word": "الكلمة المحظورة" }

// session_event
{ "event": "login" | "logout" }
```

> `message_blocked` stores **only the matched forbidden word** — no message content excerpt or hash.

**Indexes**:
- `idx_activity_log_event_type` ON `event_type`
- `idx_activity_log_created_at` ON `created_at DESC` — supports date-range filters
- `idx_activity_log_room_id` ON `room_id` WHERE `room_id IS NOT NULL` (partial)

**RLS Policies**:
- `SELECT`: Admin only (same `chat_profiles.global_role = 'admin'` check)
- `INSERT`: SECURITY DEFINER functions only — no direct client INSERT permitted
- No `UPDATE` or `DELETE` policies — truly append-only at the DB level

**Realtime**: Added to `supabase_realtime` publication for Admin live feed (SC-P2-010).

---

## Table: `chat_activity_archive` (NEW)

Cold storage for `message_sent` log entries older than 90 days. Identical column structure to
`chat_activity_log`. Populated exclusively by the archival Edge Function / pg_cron job.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK | Same UUID as origin row in `chat_activity_log` |
| `event_type` | `activity_event_type_enum` | NOT NULL | Always `message_sent` in practice |
| `room_id` | `uuid` | NULLABLE | |
| `actor_display_name` | `text` | NOT NULL | |
| `details` | `jsonb` | NOT NULL | |
| `archived_at` | `timestamptz` | NOT NULL, DEFAULT `now()` | Set at archival time |
| `created_at` | `timestamptz` | NOT NULL | Original creation timestamp from source row |

**Indexes**:
- `idx_activity_archive_created_at` ON `created_at DESC`

**RLS Policies**:
- `SELECT`: Admin only
- No `INSERT`/`UPDATE`/`DELETE` for client roles — archival is service-role-only

---

## Table: `chat_messages` — Phase 2 Column Additions

Three new columns are added via a `ALTER TABLE` migration. All existing rows default safely.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `is_forwarded` | `boolean` | NOT NULL, DEFAULT `false` | Flag indicating a forwarded copy |
| `forwarded_quote_snapshot` | `jsonb` | NULLABLE | Quote context snapshot — only set when forwarding a reply. Shape: `{ sender_label, content_excerpt, is_deleted }` |
| `attachment_metadata` | `jsonb` | NULLABLE | Audio waveform data for voice notes: `{ waveform: number[], duration_seconds: number }`. NULL for non-audio attachments. |

> No FK to a source message is stored — cross-room source references would violate RLS.
> The `delivery_status` and `parent_message_id` columns (Phase 1) are now actively used.

---

## Postgres Functions (NEW)

### `normalize_arabic_text(p_text TEXT) RETURNS TEXT`

Pure deterministic SQL/PLpgSQL function. Strips Tashkeel, normalizes Alef variants, Ta Marbuta,
Alef Maksura, Hamza forms, and folds to lowercase. Called inside `send_secure_message` to normalize
incoming message content before blacklist comparison.

```
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
```

---

### `send_secure_message(...)` — CRITICAL RPC

`SECURITY DEFINER` function. Replaces direct `chat_messages` INSERT from all client paths.

**Parameters**:

| Param | Type | Notes |
|---|---|---|
| `p_room_id` | `uuid` | Target room |
| `p_content` | `text` | Message text (nullable if attachment-only) |
| `p_attachment_path` | `text` | Storage path (nullable) |
| `p_attachment_name` | `text` | Nullable |
| `p_attachment_size` | `numeric` | Nullable |
| `p_attachment_mime_type` | `text` | Nullable |
| `p_attachment_metadata` | `jsonb` | Nullable (audio waveform / duration) |
| `p_parent_message_id` | `uuid` | Nullable (reply threading) |
| `p_is_forwarded` | `boolean` | DEFAULT false |
| `p_forwarded_quote_snapshot` | `jsonb` | Nullable |

**Execution logic (single transaction)**:

```
1. ASSERT auth.uid() IS NOT NULL → raise 'UNAUTHORIZED'
2. ASSERT participant: SELECT 1 FROM chat_participants WHERE room_id = p_room_id AND user_id = auth.uid()
   → raise 'NOT_PARTICIPANT' if missing
3. IF p_parent_message_id IS NOT NULL:
     ASSERT parent belongs to same room_id → raise 'CROSS_ROOM_REPLY'
4. IF p_content IS NOT NULL:
     normalized_msg := normalize_arabic_text(p_content)
     FOR EACH entry IN (SELECT word_normalized, match_mode FROM chat_blacklist):
       IF whole_word: check normalized_msg ~ word boundary regex
       IF substring: check normalized_msg LIKE '%word%'
       ON MATCH:
         INSERT INTO chat_activity_log (event_type='message_blocked', room_id=p_room_id,
           actor_display_name=(SELECT display_name FROM chat_profiles WHERE user_id=auth.uid()),
           details={ room_name, matched_word })
         RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='CONTENT_POLICY_VIOLATION',
           DETAIL=matched_word
5. INSERT INTO chat_messages (all params + sender_id=auth.uid(), delivery_status='sent')
   RETURNING id INTO new_message_id
6. INSERT INTO chat_activity_log (event_type='message_sent', room_id=p_room_id,
     actor_display_name=..., details={ room_name, message_id=new_message_id })
7. RETURN (SELECT * FROM chat_messages WHERE id = new_message_id)
```

**Permissions**: `REVOKE ALL ... FROM PUBLIC; GRANT EXECUTE ... TO authenticated;`

---

## Storage Bucket Update

The existing `secure-chat-media` bucket `allowed_mime_types` array is extended to include audio:

```sql
UPDATE storage.buckets
SET allowed_mime_types = array_cat(
  allowed_mime_types,
  ARRAY[
    'audio/webm',
    'audio/webm;codecs=opus',
    'audio/mp4',
    'audio/mpeg',
    'audio/ogg',
    'audio/wav'
  ]
)
WHERE id = 'secure-chat-media';
```

---

## Migration Order

```
1.  Create enums: blacklist_match_mode_enum, activity_event_type_enum
2.  Create normalize_arabic_text() SQL function
3.  Create chat_blacklist table + indexes + RLS
4.  Create chat_activity_log table + indexes + RLS
5.  Create chat_activity_archive table + indexes + RLS
6.  ALTER chat_messages: ADD COLUMN is_forwarded, forwarded_quote_snapshot, attachment_metadata
7.  Create send_secure_message() SECURITY DEFINER function
8.  Add chat_blacklist + chat_activity_log to supabase_realtime publication
9.  Update secure-chat-media bucket allowed_mime_types (audio additions)
```

---

## State Transitions

### Blacklist Word Lifecycle
```
[Admin adds word] → [Active in blacklist]
                                │
                                └──► [Admin deletes] → [Removed — new messages no longer checked against it]
```

### Message Lifecycle (Phase 2 Complete)
```
[send_secure_message RPC called]
    │
    ├──[blacklist match]──► [REJECTED — logged to chat_activity_log as 'message_blocked']
    │
    └──[no match]──► [INSERT chat_messages: delivery_status='sent']
                           │
                           ├──► Recipient client receives Realtime INSERT
                           │         └──► markMessageDelivered() → delivery_status='delivered'
                           │
                           └──► Recipient scrolls to message (IntersectionObserver)
                                     └──► markMessagesAsRead() → delivery_status='read'
```

### Activity Log Lifecycle
```
[Event occurs] → INSERT chat_activity_log
                              │
                 (if message_sent AND age > 90 days)
                              │
                              └──► Edge Function / pg_cron → MOVE to chat_activity_archive
```
