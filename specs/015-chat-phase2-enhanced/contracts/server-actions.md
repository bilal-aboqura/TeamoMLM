# Server Action Contracts: نظام المحادثة المغلقة — Phase 2

**Branch**: `015-chat-phase2-enhanced` | **Date**: 2026-05-14

All Server Actions are in `app/**/chat/_actions/*.ts`. All accept Zod-validated inputs.
All require `auth.getUser()` — unauthenticated calls return `{ error: 'UNAUTHORIZED' }`.

---

## 1. `sendMessage` (MODIFIED — replaces direct INSERT)

**File**: `app/dashboard/chat/_actions/sendMessage.ts`
**Location**: Calls `send_secure_message` RPC via Supabase service client.

**Input (Zod schema)**:
```ts
{
  roomId: z.string().uuid(),
  content: z.string().max(4000).optional(),
  attachmentPath: z.string().optional(),
  attachmentName: z.string().optional(),
  attachmentSize: z.number().optional(),
  attachmentMimeType: z.string().optional(),
  attachmentMetadata: z.object({
    waveform: z.array(z.number()).optional(),
    duration_seconds: z.number().optional(),
  }).optional(),
  parentMessageId: z.string().uuid().optional(),
  isForwarded: z.boolean().default(false),
  forwardedQuoteSnapshot: z.object({
    sender_label: z.string(),
    content_excerpt: z.string(),
    is_deleted: z.boolean(),
  }).optional(),
}
// Constraint: content OR attachmentPath must be present
```

**Returns**:
```ts
{ data: ChatMessage } | { error: 'CONTENT_POLICY_VIOLATION', detail: string }
  | { error: 'NOT_PARTICIPANT' } | { error: 'CROSS_ROOM_REPLY' }
```

**Error mapping**: Catches Supabase SQLSTATE `P0001` → maps `MESSAGE` field to `error` string;
returns `detail` (matched word) only to Admin callers — regular users receive generic message.

---

## 2. `markMessagesAsRead` (NEW)

**File**: `app/dashboard/chat/_actions/markMessagesAsRead.ts`

**Input**:
```ts
{
  roomId: z.string().uuid(),
  messageIds: z.array(z.string().uuid()).min(1).max(50),
}
```

**Server logic**:
1. Verify caller is participant of `roomId`
2. Verify `room_type = 'direct_message'` — silently no-op for groups
3. `UPDATE chat_messages SET delivery_status = 'read', updated_at = now()
   WHERE id = ANY($messageIds) AND room_id = $roomId AND sender_id != auth.uid()`
4. Update `chat_participants.last_read_position` to the latest `messageId` in the batch

**Returns**: `{ data: { updatedCount: number } } | { error: string }`

---

## 3. `markMessageDelivered` (NEW)

**File**: `app/dashboard/chat/_actions/markMessageDelivered.ts`

**Input**:
```ts
{ messageId: z.string().uuid(), roomId: z.string().uuid() }
```

**Server logic**:
1. Verify `room_type = 'direct_message'`
2. Verify caller is a participant (recipient)
3. `UPDATE chat_messages SET delivery_status = 'delivered', updated_at = now()
   WHERE id = $messageId AND delivery_status = 'sent' AND sender_id != auth.uid()`
   (Only upgrades `sent → delivered`; never downgrades `read → delivered`)

**Returns**: `{ data: { updated: boolean } } | { error: string }`

---

## 4. `forwardMessage` (NEW)

**File**: `app/dashboard/chat/_actions/forwardMessage.ts`

**Input**:
```ts
{
  sourceMsgId: z.string().uuid(),
  destinationRoomId: z.string().uuid(),
}
```

**Server logic**:
1. Verify caller is participant of `destinationRoomId`
2. Fetch source message via service role (to handle cross-room reads safely)
3. Assert `source.is_deleted = false` (hidden in UI but double-checked server-side)
4. Build `forwarded_quote_snapshot` if `source.parent_message_id IS NOT NULL`:
   - Fetch parent message; if soft-deleted set `is_deleted: true` in snapshot
   - Apply blind-identity rules of **destination** room to `sender_label`
5. Call `send_secure_message` RPC with source content + attachment fields, `is_forwarded: true`,
   and the constructed snapshot

**Returns**: `{ data: ChatMessage } | { error: 'CONTENT_POLICY_VIOLATION' | 'NOT_PARTICIPANT' | 'SOURCE_DELETED' }`

---

## 5. `addBlacklistWord` (NEW — Admin only)

**File**: `app/admin/chat/blacklist/_actions/addBlacklistWord.ts`

**Input**:
```ts
{
  wordOriginal: z.string().min(1).max(200).trim(),
  matchMode: z.enum(['whole_word', 'substring']).default('whole_word'),
}
```

**Server logic**:
1. Verify `global_role = 'admin'` (re-validate session — never trust client)
2. Compute `word_normalized = normalizeArabicText(wordOriginal)` (TypeScript util)
3. `INSERT INTO chat_blacklist (word_original, word_normalized, match_mode, created_by)`
4. Return inserted row

**Returns**: `{ data: BlacklistEntry } | { error: string }`

---

## 6. `deleteBlacklistWord` (NEW — Admin only)

**File**: `app/admin/chat/blacklist/_actions/deleteBlacklistWord.ts`

**Input**:
```ts
{ wordId: z.string().uuid() }
```

**Server logic**:
1. Verify `global_role = 'admin'`
2. `DELETE FROM chat_blacklist WHERE id = $wordId`

**Returns**: `{ data: { deleted: boolean } } | { error: string }`

---

## 7. `getActivityLogs` (NEW — Admin only)

**File**: `app/admin/chat/logs/_actions/getActivityLogs.ts`

**Input**:
```ts
{
  eventType: z.enum(['message_sent', 'message_blocked', 'session_event', 'all']).default('all'),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.number().int().min(1).default(1),
  includeArchive: z.boolean().default(false),
}
```

**Server logic**:
1. Verify `global_role = 'admin'`
2. Query `chat_activity_log` (or `chat_activity_archive` if `includeArchive: true`)
3. Apply `event_type` filter if not `'all'`; apply `created_at` date range
4. Paginate: 50 rows per page, ordered `created_at DESC`

**Returns**:
```ts
{
  data: ActivityLogEvent[],
  meta: { total: number, page: number, totalPages: number }
} | { error: string }
```
