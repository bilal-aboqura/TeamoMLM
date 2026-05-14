# Server Action Contracts: نظام المحادثة المغلقة

**Branch**: `014-blind-chat-system` | **Date**: 2026-05-10  
**Type**: Next.js Server Action interface contracts

> All mutations in this system are executed through Server Actions (never client-side Supabase calls for writes). Read-heavy paths use RSC async data fetching. Realtime updates use client-side Supabase subscriptions for live message delivery only.

---

## Contract Format

Each contract documents:
- **Action path** — where the function lives
- **Input** — Zod-validated shape
- **Authorization** — who may call it
- **Output** — success/error shape
- **Side effects** — DB/storage changes and Realtime events triggered

---

## 1. `sendMessage`

**Path**: `app/dashboard/chat/_actions/sendMessage.ts`  
**Authorization**: Authenticated user who is a Participant of the target room

### Input (Zod)
```typescript
{
  roomId:     z.string().uuid(),
  content:    z.string().max(4000).optional(),
  // Either content or attachment must be present — validated in action body
  attachment: z.object({
    path:     z.string(),      // Storage path, already uploaded
    name:     z.string().max(255),
    size:     z.number().positive().max(26_214_400), // 25 MB ceiling
    mimeType: z.string(),      // Validated against allowlist
  }).optional(),
}
```

### Authorization Logic
1. Verify `auth.uid()` is a Participant of `roomId`
2. Verify `is_deleted = false` on room
3. If `attachment` present: verify `media_settings` flag for the MIME type is `true`
4. Verify MIME type against server-side allowlist

### Output
```typescript
{ success: true; messageId: string }
| { success: false; error: 'UNAUTHORIZED' | 'MEDIA_DISABLED' | 'INVALID_FILE_TYPE' | 'ROOM_NOT_FOUND' | 'VALIDATION_ERROR' }
```

### Side Effects
- `INSERT` into `chat_messages`
- Supabase Realtime broadcasts `INSERT` event to `room:{roomId}` channel subscribers

---

## 2. `getMessages`

**Path**: `app/dashboard/chat/_actions/getMessages.ts`  
**Authorization**: Authenticated user who is a Participant of the target room  
**Type**: Server Action (called by RSC on initial load; re-called on cursor fetch)

### Input (Zod)
```typescript
{
  roomId:       z.string().uuid(),
  cursor:       z.object({          // Omit for first page (most recent 50)
    timestamp:  z.string(),         // ISO timestamptz
    id:         z.string().uuid(),
  }).optional(),
  limit:        z.number().int().min(1).max(50).default(50),
}
```

### Authorization Logic
1. Verify `auth.uid()` is a Participant of `roomId`
2. Apply RLS (implicit via anon key + auth.uid())
3. Server resolves sender identity: own messages → `"أنت"`, Admin/Moderator → `display_name`, peer User → `"عضو"`

### Output
```typescript
{
  messages: Array<{
    id:             string;
    content:        string | null;
    senderLabel:    string;        // "أنت" | display_name | "عضو"
    senderRole:     'admin' | 'moderator' | 'member';
    isOwn:          boolean;
    serverTimestamp: string;
    isDeleted:      boolean;
    attachment: {
      name: string;
      size: number;
      mimeType: string;
      signedUrl: string;           // 1-hour presigned URL — generated server-side
    } | null;
    parentMessageId: string | null; // Phase 2 — present in schema, null in Phase 1 UI
  }>;
  nextCursor: { timestamp: string; id: string } | null; // null = no more history
}
```

> **Security**: Raw `sender_id` UUIDs MUST NOT appear in the output payload. The server resolves identity before returning.

---

## 3. `getAttachmentUrl`

**Path**: `app/dashboard/chat/_actions/getAttachmentUrl.ts`  
**Authorization**: Authenticated user who is a Participant of the room containing the message

### Input (Zod)
```typescript
{
  messageId: z.string().uuid(),  // Used to verify room participation before signing
}
```

### Authorization Logic
1. Fetch `attachment_path` and `room_id` from `chat_messages` (RLS ensures access)
2. Verify Participant record exists for `auth.uid()` in `room_id`
3. Call `supabase.storage.from('secure-chat-media').createSignedUrl(path, 3600)` using service role

### Output
```typescript
{ success: true; signedUrl: string; expiresIn: 3600 }
| { success: false; error: 'UNAUTHORIZED' | 'NOT_FOUND' }
```

---

## 4. `createTicket`

**Path**: `app/dashboard/chat/_actions/createTicket.ts`  
**Authorization**: Authenticated User (global_role = 'user') only — Admins cannot initiate tickets

### Input (Zod)
```typescript
{
  subject: z.string().min(5).max(120),
  initialMessage: z.string().min(10).max(4000),
}
```

### Authorization Logic
1. Verify `auth.uid()` has `global_role = 'user'` — reject if Admin
2. Create `chat_rooms` row (type: `ticket`, name: subject, media_settings: images+files allowed)
3. Insert two `chat_participants` rows: the user (role: `member`) + a system Admin participant
4. Insert initial message

### Output
```typescript
{ success: true; roomId: string }
| { success: false; error: 'UNAUTHORIZED' | 'VALIDATION_ERROR' }
```

---

## 5. `createGroup` (Admin only)

**Path**: `app/admin/chat/_actions/createGroup.ts`  
**Authorization**: `global_role = 'admin'`

### Input (Zod)
```typescript
{
  name:        z.string().min(2).max(80),
  description: z.string().max(300).optional(),
  memberIds:   z.array(z.string().uuid()).min(1).max(500),
}
```

### Authorization Logic
1. Verify caller is Admin
2. Verify all `memberIds` exist in `chat_profiles`
3. Create `chat_rooms` (type: `blind_group`, media_settings: all false by default)
4. Insert `chat_participants`: Admin as `admin`, all memberIds as `member`

### Output
```typescript
{ success: true; roomId: string }
| { success: false; error: 'UNAUTHORIZED' | 'VALIDATION_ERROR' | 'MEMBERS_NOT_FOUND' }
```

---

## 6. `updateMediaSettings` (Admin only)

**Path**: `app/admin/chat/_actions/updateMediaSettings.ts`  
**Authorization**: `global_role = 'admin'` AND is a Participant (admin role) of target room

### Input (Zod)
```typescript
{
  roomId: z.string().uuid(),
  settings: z.object({
    images_allowed: z.boolean(),
    files_allowed:  z.boolean(),
    audio_allowed:  z.boolean(),   // Reserved — Phase 2; accepted but no UI control in Phase 1
  }),
}
```

### Authorization Logic
1. Verify caller is Admin
2. Verify room exists and is not soft-deleted
3. Update `media_settings` JSONB atomically using `jsonb_build_object` (not merge — full replacement of known keys)

### Output
```typescript
{ success: true }
| { success: false; error: 'UNAUTHORIZED' | 'ROOM_NOT_FOUND' }
```

### Side Effects
- `UPDATE chat_rooms SET media_settings = ..., updated_at = now()`
- Supabase Realtime broadcasts `UPDATE` event on `chat_rooms` to subscribed clients → UI hides/shows attachment controls within 5 seconds

---

## 7. `deleteMessage` (Admin/Moderator)

**Path**: `app/admin/chat/_actions/deleteMessage.ts`  
**Authorization**: `global_role = 'admin'` OR (`global_role = 'moderator'` AND is Participant of the room)

### Input (Zod)
```typescript
{
  messageId: z.string().uuid(),
}
```

### Authorization Logic
1. Verify caller role (admin or moderator with room participation)
2. `UPDATE chat_messages SET is_deleted = true, updated_at = now()`

### Output
```typescript
{ success: true }
| { success: false; error: 'UNAUTHORIZED' | 'NOT_FOUND' }
```

### Side Effects
- Soft-delete only — physical row retained for audit
- Realtime UPDATE event triggers UI to replace message with `"تم حذف هذه الرسالة"` placeholder (visible to Admins/Moderators; row hidden from regular users' next fetch)

---

## 8. `assignModeratorRole` (Admin only)

**Path**: `app/admin/chat/_actions/assignModeratorRole.ts`  
**Authorization**: `global_role = 'admin'`

### Input (Zod)
```typescript
{
  roomId: z.string().uuid(),
  userId: z.string().uuid(),
  role:   z.enum(['moderator', 'member']),  // Revoke by setting back to 'member'
}
```

### Authorization Logic
1. Verify caller is Admin
2. Verify target user is a Participant of `roomId`
3. `UPDATE chat_participants SET room_role = role`

### Output
```typescript
{ success: true }
| { success: false; error: 'UNAUTHORIZED' | 'PARTICIPANT_NOT_FOUND' }
```

---

## 9. `updateAvatarSelection` (User)

**Path**: `app/dashboard/chat/_actions/updateAvatarSelection.ts`  
**Authorization**: Own profile only

### Input (Zod)
```typescript
{
  avatarId: z.enum(['avatar_01', 'avatar_02', ..., 'avatar_12']),
}
```

### Authorization Logic
1. Verified via RLS — user can only UPDATE their own `chat_profiles` row

### Output
```typescript
{ success: true }
| { success: false; error: 'INVALID_AVATAR_ID' }
```

---

## Realtime Channel Subscriptions (Client-Side)

| Channel name | Table | Filter | Event | Consumer |
|---|---|---|---|---|
| `room:{roomId}` | `chat_messages` | `room_id=eq.{roomId}` | `INSERT` | `<ChatWindow>` — append new message |
| `room-settings:{roomId}` | `chat_rooms` | `id=eq.{roomId}` | `UPDATE` | `<MessageInput>` — refresh media_settings |

> Subscriptions are established in Client Components using `useEffect` and cleaned up on unmount. Initial data always loads via RSC Server Actions, not Realtime.
