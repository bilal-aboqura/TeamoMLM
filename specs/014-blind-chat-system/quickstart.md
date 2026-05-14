# Quickstart: نظام المحادثة المغلقة — Developer Setup

**Branch**: `014-blind-chat-system` | **Date**: 2026-05-10

---

## Prerequisites

- Node 20+, npm 10+
- Supabase project with service role key
- Branch: `014-blind-chat-system` checked out

---

## Step 1: Environment Variables

Add to `.env.local` (never commit):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>   # Server-only — never expose to client
```

---

## Step 2: Run Database Migration

Apply the following in order in Supabase SQL Editor or via `supabase db push`:

**File**: `supabase/migrations/YYYYMMDDHHMMSS_014_blind_chat_system.sql`

```sql
-- 1. Enums
CREATE TYPE global_role_enum     AS ENUM ('admin', 'moderator', 'user');
CREATE TYPE room_type_enum       AS ENUM ('direct_message', 'blind_group', 'ticket', 'other');
CREATE TYPE room_role_enum       AS ENUM ('admin', 'moderator', 'member');
CREATE TYPE delivery_status_enum AS ENUM ('sent', 'delivered', 'read');

-- 2. chat_profiles
CREATE TABLE public.chat_profiles (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 60),
  avatar_id    TEXT NOT NULL DEFAULT 'avatar_01'
               CHECK (avatar_id = ANY(ARRAY[
                 'avatar_01','avatar_02','avatar_03','avatar_04',
                 'avatar_05','avatar_06','avatar_07','avatar_08',
                 'avatar_09','avatar_10','avatar_11','avatar_12'
               ])),
  global_role  global_role_enum NOT NULL DEFAULT 'user',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. chat_rooms
CREATE TABLE public.chat_rooms (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type      room_type_enum NOT NULL,
  name           TEXT,
  description    TEXT,
  media_settings JSONB NOT NULL DEFAULT '{"images_allowed":false,"files_allowed":false,"audio_allowed":false}',
  is_deleted     BOOLEAN NOT NULL DEFAULT false,
  created_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. chat_messages (forward-declare before chat_participants due to last_read_position FK)
CREATE TABLE public.chat_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id           UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  content           TEXT CHECK (char_length(content) <= 4000),
  attachment_path   TEXT,
  attachment_name   TEXT,
  attachment_size   NUMERIC,
  attachment_mime_type TEXT,
  server_timestamp  TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted        BOOLEAN NOT NULL DEFAULT false,
  delivery_status   delivery_status_enum,                      -- Phase 2
  parent_message_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL, -- Phase 2
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT content_or_attachment CHECK (content IS NOT NULL OR attachment_path IS NOT NULL)
);

-- 5. chat_participants
CREATE TABLE public.chat_participants (
  room_id            UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_role          room_role_enum NOT NULL DEFAULT 'member',
  last_read_position UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  is_muted           BOOLEAN NOT NULL DEFAULT false,
  joined_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

-- 6. Indexes
CREATE INDEX idx_chat_rooms_type           ON public.chat_rooms(room_type);
CREATE INDEX idx_chat_rooms_created_by     ON public.chat_rooms(created_by);
CREATE INDEX idx_chat_participants_user    ON public.chat_participants(user_id);
CREATE INDEX idx_chat_participants_room    ON public.chat_participants(room_id);
CREATE INDEX idx_chat_messages_room_ts     ON public.chat_messages(room_id, server_timestamp DESC);
CREATE INDEX idx_chat_messages_sender      ON public.chat_messages(sender_id);
CREATE INDEX idx_chat_messages_parent      ON public.chat_messages(parent_message_id)
  WHERE parent_message_id IS NOT NULL;

-- 7. updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_chat_profiles_updated_at
  BEFORE UPDATE ON public.chat_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_chat_rooms_updated_at
  BEFORE UPDATE ON public.chat_rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_chat_messages_updated_at
  BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 8. Enable RLS
ALTER TABLE public.chat_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages     ENABLE ROW LEVEL SECURITY;

-- 9. RLS Policies

-- chat_profiles
CREATE POLICY "Users read own profile"   ON public.chat_profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users insert own profile" ON public.chat_profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own profile" ON public.chat_profiles FOR UPDATE USING (user_id = auth.uid());

-- chat_rooms
CREATE POLICY "Participants read rooms"  ON public.chat_rooms FOR SELECT
  USING (id IN (SELECT room_id FROM public.chat_participants WHERE user_id = auth.uid()));

-- chat_participants (BLIND: users see only their own row)
CREATE POLICY "Users see own participation" ON public.chat_participants FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "Users update own read position" ON public.chat_participants FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- chat_messages
CREATE POLICY "Participants read messages" ON public.chat_messages FOR SELECT
  USING (room_id IN (SELECT room_id FROM public.chat_participants WHERE user_id = auth.uid()));
CREATE POLICY "Participants insert messages" ON public.chat_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    room_id IN (SELECT room_id FROM public.chat_participants WHERE user_id = auth.uid())
  );
CREATE POLICY "Soft-delete own messages" ON public.chat_messages FOR UPDATE
  USING (sender_id = auth.uid())
  WITH CHECK (is_deleted = true);  -- Users can only soft-delete, not edit content

-- 10. Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;
```

---

## Step 3: Create Storage Bucket

In Supabase Dashboard → Storage → New Bucket:
- **Name**: `secure-chat-media`
- **Public**: ❌ OFF (STRICTLY PRIVATE)
- **File size limit**: 25 MB
- **Allowed MIME types**: `image/jpeg, image/png, image/gif, image/webp, application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/zip`

---

## Step 4: Source Code Structure

```text
app/
├── dashboard/
│   └── chat/
│       ├── page.tsx                    # RSC: user room list
│       ├── loading.tsx
│       ├── error.tsx
│       ├── [roomId]/
│       │   ├── page.tsx                # RSC: chat window for a room
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
        ├── page.tsx                    # RSC: admin room overview
        ├── loading.tsx
        ├── error.tsx
        ├── [roomId]/
        │   ├── page.tsx                # RSC: full-visibility chat window
        │   ├── loading.tsx
        │   └── error.tsx
        ├── groups/
        │   ├── new/
        │   │   └── page.tsx            # Create group form
        │   └── [groupId]/
        │       └── settings/
        │           └── page.tsx        # Media settings + member management
        └── _actions/
            ├── createGroup.ts
            ├── updateMediaSettings.ts
            ├── deleteMessage.ts
            └── assignModeratorRole.ts

lib/
└── chat/
    ├── avatars.ts                      # Predefined avatar constants (12 avatars)
    ├── allowlist.ts                    # File MIME type allowlist
    └── types.ts                        # Shared TypeScript types

components/
└── chat/
    ├── ChatSidebar.tsx                 # Room list (user view)
    ├── ChatWindow.tsx                  # Message thread (client, real-time)
    ├── MessageList.tsx                 # Virtualized message list
    ├── MessageBubble.tsx               # Single message (handles deleted/attachment states)
    ├── MessageInput.tsx                # Text input + attachment picker
    ├── AttachmentPicker.tsx            # Conditional image/file pickers based on media_settings
    ├── AvatarPicker.tsx                # Predefined avatar grid (user profile)
    └── MediaSettingsPanel.tsx          # Admin toggle panel (3 independent switches)

supabase/
└── migrations/
    └── YYYYMMDDHHMMSS_014_blind_chat_system.sql
```

---

## Step 5: Run Dev Server

```bash
npm run dev
```

- User chat: `http://localhost:3000/dashboard/chat`
- Admin chat: `http://localhost:3000/admin/chat`

---

## Key Implementation Notes

1. **Never pass `sender_id` to client components** — resolve identity server-side in `getMessages` action before returning
2. **Always use service role key** for `createSignedUrl` in `getAttachmentUrl` — the anon key cannot sign private bucket URLs
3. **Media settings toggle**: Use `jsonb_set(media_settings, '{images_allowed}', 'true')` not a full object replacement — prevents concurrent flag collision
4. **Realtime channels**: Subscribe to `room:{roomId}` for messages and `room-settings:{roomId}` for media_settings; clean up subscriptions in `useEffect` return
5. **Blind group rendering**: Check `isOwn` and `senderRole` from `getMessages` output — never derive from raw sender UUID in client
