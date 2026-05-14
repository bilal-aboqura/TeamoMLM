-- ============================================================
-- Feature 014: Blind Chat System
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'global_role_enum') THEN
    CREATE TYPE public.global_role_enum AS ENUM ('admin', 'moderator', 'user');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'room_type_enum') THEN
    CREATE TYPE public.room_type_enum AS ENUM ('direct_message', 'blind_group', 'ticket', 'other');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'room_role_enum') THEN
    CREATE TYPE public.room_role_enum AS ENUM ('admin', 'moderator', 'member');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_status_enum') THEN
    CREATE TYPE public.delivery_status_enum AS ENUM ('sent', 'delivered', 'read');
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND constraint_name = 'users_role_check'
  ) THEN
    ALTER TABLE public.users DROP CONSTRAINT users_role_check;
    ALTER TABLE public.users
      ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin', 'moderator'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.chat_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 60),
  avatar_id TEXT NOT NULL DEFAULT 'avatar_01'
    CHECK (avatar_id = ANY (ARRAY[
      'avatar_01','avatar_02','avatar_03','avatar_04',
      'avatar_05','avatar_06','avatar_07','avatar_08',
      'avatar_09','avatar_10','avatar_11','avatar_12'
    ])),
  global_role public.global_role_enum NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type public.room_type_enum NOT NULL,
  name TEXT,
  description TEXT,
  media_settings JSONB NOT NULL DEFAULT '{"images_allowed":false,"files_allowed":false,"audio_allowed":false}'::jsonb,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT CHECK (content IS NULL OR char_length(content) <= 4000),
  attachment_path TEXT,
  attachment_name TEXT,
  attachment_size NUMERIC,
  attachment_mime_type TEXT,
  server_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  delivery_status public.delivery_status_enum,
  parent_message_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chat_messages_content_or_attachment CHECK (
    content IS NOT NULL OR attachment_path IS NOT NULL
  )
);

CREATE TABLE IF NOT EXISTS public.chat_participants (
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_role public.room_role_enum NOT NULL DEFAULT 'member',
  last_read_position UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  is_muted BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_rooms_type ON public.chat_rooms(room_type);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_created_by ON public.chat_rooms(created_by);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON public.chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_room_id ON public.chat_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_ts ON public.chat_messages(room_id, server_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON public.chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_parent ON public.chat_messages(parent_message_id)
  WHERE parent_message_id IS NOT NULL;

DROP TRIGGER IF EXISTS chat_profiles_updated_at ON public.chat_profiles;
CREATE TRIGGER chat_profiles_updated_at
  BEFORE UPDATE ON public.chat_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS chat_rooms_updated_at ON public.chat_rooms;
CREATE TRIGGER chat_rooms_updated_at
  BEFORE UPDATE ON public.chat_rooms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS chat_messages_updated_at ON public.chat_messages;
CREATE TRIGGER chat_messages_updated_at
  BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.chat_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own chat profile" ON public.chat_profiles;
CREATE POLICY "Users read own chat profile" ON public.chat_profiles
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own chat profile" ON public.chat_profiles;
CREATE POLICY "Users insert own chat profile" ON public.chat_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own chat profile" ON public.chat_profiles;
CREATE POLICY "Users update own chat profile" ON public.chat_profiles
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Participants read chat rooms" ON public.chat_rooms;
CREATE POLICY "Participants read chat rooms" ON public.chat_rooms
  FOR SELECT USING (
    id IN (
      SELECT room_id FROM public.chat_participants
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users see own chat participation" ON public.chat_participants;
CREATE POLICY "Users see own chat participation" ON public.chat_participants
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own chat read position" ON public.chat_participants;
CREATE POLICY "Users update own chat read position" ON public.chat_participants
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Participants read chat messages" ON public.chat_messages;
CREATE POLICY "Participants read chat messages" ON public.chat_messages
  FOR SELECT USING (
    room_id IN (
      SELECT room_id FROM public.chat_participants
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Participants insert chat messages" ON public.chat_messages;
CREATE POLICY "Participants insert chat messages" ON public.chat_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND room_id IN (
      SELECT room_id FROM public.chat_participants
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users soft delete own chat messages" ON public.chat_messages;
CREATE POLICY "Users soft delete own chat messages" ON public.chat_messages
  FOR UPDATE USING (sender_id = auth.uid()) WITH CHECK (is_deleted = true);

GRANT SELECT, INSERT, UPDATE ON public.chat_profiles TO authenticated;
GRANT SELECT ON public.chat_rooms TO authenticated;
GRANT SELECT, UPDATE ON public.chat_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.chat_messages TO authenticated;

CREATE OR REPLACE FUNCTION public.update_chat_media_settings(
  p_room_id UUID,
  p_images_allowed BOOLEAN,
  p_files_allowed BOOLEAN,
  p_audio_allowed BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_rooms
  SET media_settings = jsonb_set(
      jsonb_set(
        jsonb_set(media_settings, '{images_allowed}', to_jsonb(p_images_allowed), true),
        '{files_allowed}',
        to_jsonb(p_files_allowed),
        true
      ),
      '{audio_allowed}',
      to_jsonb(p_audio_allowed),
      true
    )
  WHERE id = p_room_id
    AND is_deleted = false;
END;
$$;

REVOKE ALL ON FUNCTION public.update_chat_media_settings(UUID, BOOLEAN, BOOLEAN, BOOLEAN) FROM PUBLIC;

INSERT INTO public.chat_profiles (user_id, display_name, global_role)
SELECT
  u.id,
  LEFT(COALESCE(NULLIF(u.full_name, ''), 'User'), 60),
  CASE WHEN u.role = 'admin' THEN 'admin'::public.global_role_enum
       WHEN u.role = 'moderator' THEN 'moderator'::public.global_role_enum
       ELSE 'user'::public.global_role_enum
  END
FROM public.users u
ON CONFLICT (user_id) DO UPDATE
SET
  display_name = EXCLUDED.display_name,
  global_role = EXCLUDED.global_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'chat_rooms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'secure-chat-media',
  'secure-chat-media',
  false,
  26214400,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = 26214400,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Participants upload secure chat media" ON storage.objects;
CREATE POLICY "Participants upload secure chat media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'secure-chat-media'
    AND (storage.foldername(name))[1] = 'chat'
    AND EXISTS (
      SELECT 1
      FROM public.chat_participants cp
      WHERE cp.room_id::text = (storage.foldername(name))[2]
        AND cp.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.chat_profiles IS 'Blind chat profile metadata, one row per Supabase auth user.';
COMMENT ON TABLE public.chat_rooms IS 'Unified chat containers for DMs, blind groups, support tickets, and future room types.';
COMMENT ON TABLE public.chat_participants IS 'Blind room membership and per-room role state.';
COMMENT ON TABLE public.chat_messages IS 'Chat message records. Sender identity is resolved server-side before reaching UI payloads.';
