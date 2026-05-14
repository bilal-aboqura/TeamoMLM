# RPC Contracts: نظام المحادثة المغلقة — Phase 2

**Branch**: `015-chat-phase2-enhanced` | **Date**: 2026-05-14

Postgres stored functions callable via `supabase.rpc(...)`. All require authenticated session.

---

## 1. `normalize_arabic_text`

**Type**: Pure deterministic SQL function  
**Security**: `SECURITY INVOKER` (no privileged access needed)  
**Language**: `sql IMMUTABLE STRICT PARALLEL SAFE`

```sql
CREATE OR REPLACE FUNCTION public.normalize_arabic_text(p_text TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
AS $$
  SELECT
    trim(regexp_replace(
      translate(
        -- 1. Strip Tashkeel (U+064B–U+065F, U+0670)
        regexp_replace(lower(p_text), '[\u064B-\u065F\u0670]', '', 'g'),
        -- 2. Normalize Arabic letter variants (translate: from → to, char-by-char)
        'أإآٱةىؤئ',
        'اااahيوي'
      ),
      '\s+', ' ', 'g'   -- 3. Collapse whitespace
    ))
$$;
```

> **Note**: The TypeScript mirror in `lib/chat/normalize.ts` applies identical transformations
> using `String.prototype.replace` with the same Unicode ranges. Both must be kept in sync.

**Called by**: `send_secure_message` internally. Not exposed to clients directly.

---

## 2. `send_secure_message`

**Type**: `SECURITY DEFINER` stored procedure  
**Security**: Runs as DB owner; caller is authenticated via `auth.uid()`  
**Language**: `plpgsql`

**Full Signature**:
```sql
CREATE OR REPLACE FUNCTION public.send_secure_message(
  p_room_id               UUID,
  p_content               TEXT    DEFAULT NULL,
  p_attachment_path       TEXT    DEFAULT NULL,
  p_attachment_name       TEXT    DEFAULT NULL,
  p_attachment_size       NUMERIC DEFAULT NULL,
  p_attachment_mime_type  TEXT    DEFAULT NULL,
  p_attachment_metadata   JSONB   DEFAULT NULL,
  p_parent_message_id     UUID    DEFAULT NULL,
  p_is_forwarded          BOOLEAN DEFAULT FALSE,
  p_forwarded_quote_snapshot JSONB DEFAULT NULL
)
RETURNS public.chat_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
```

**Behavior Contract**:

| Step | Condition | Action |
|---|---|---|
| 1 | `auth.uid() IS NULL` | `RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE = '42501'` |
| 2 | Not in `chat_participants(room_id, user_id)` | `RAISE EXCEPTION 'NOT_PARTICIPANT' USING ERRCODE = 'P0001'` |
| 3 | `p_parent_message_id` set AND parent's `room_id ≠ p_room_id` | `RAISE EXCEPTION 'CROSS_ROOM_REPLY' USING ERRCODE = 'P0001'` |
| 4 | `p_content IS NOT NULL` — iterate `chat_blacklist` | Normalize content; test each entry |
| 4a | Blacklist match found | INSERT `chat_activity_log` (`message_blocked`); `RAISE EXCEPTION 'CONTENT_POLICY_VIOLATION' USING ERRCODE = 'P0001', DETAIL = matched_word` |
| 5 | No match | INSERT `chat_messages` with `delivery_status = 'sent'` |
| 6 | After successful insert | INSERT `chat_activity_log` (`message_sent`) |
| 7 | Always | `RETURN` the newly inserted `chat_messages` row |

**Error SQLSTATE mapping (client-side)**:

| SQLSTATE | MESSAGE | Client action |
|---|---|---|
| `42501` | `UNAUTHORIZED` | Redirect to login |
| `P0001` | `NOT_PARTICIPANT` | Show "ليس لديك صلاحية الوصول إلى هذه المحادثة" |
| `P0001` | `CROSS_ROOM_REPLY` | Show "لا يمكن الرد عبر غرف مختلفة" |
| `P0001` | `CONTENT_POLICY_VIOLATION` | Show "تم رفض رسالتك بسبب انتهاك سياسة المحتوى" |

**Calling pattern (TypeScript)**:
```ts
const { data, error } = await supabase.rpc('send_secure_message', {
  p_room_id: roomId,
  p_content: content ?? null,
  p_attachment_path: attachmentPath ?? null,
  // ... other params
});

if (error) {
  const msg = error.message; // 'CONTENT_POLICY_VIOLATION' | 'NOT_PARTICIPANT' | etc.
  // map to Arabic UI message
}
```

**Permissions**:
```sql
REVOKE ALL ON FUNCTION public.send_secure_message(...) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_secure_message(...) TO authenticated;
```

---

## 3. Realtime Subscriptions (Client-Side Contracts)

### 3.1 Message Channel (Phase 1 — unchanged)
```ts
supabase
  .channel(`room:${roomId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'chat_messages',
    filter: `room_id=eq.${roomId}`,
  }, handleNewMessage)
  .on('postgres_changes', {
    event: 'UPDATE',      // NEW in Phase 2 — delivery_status changes
    schema: 'public',
    table: 'chat_messages',
    filter: `room_id=eq.${roomId}`,
  }, handleStatusUpdate)
  .subscribe();
```

### 3.2 Activity Log Channel (NEW)
```ts
// Admin-only; RLS prevents non-admin clients from receiving events
supabase
  .channel('chat-activity-log')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'chat_activity_log',
  }, handleNewLogEvent)
  .subscribe();
```

### 3.3 Blacklist Channel (NEW — Admin UI live refresh)
```ts
supabase
  .channel('chat-blacklist')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'chat_blacklist',
  }, handleBlacklistChange)
  .subscribe();
```
