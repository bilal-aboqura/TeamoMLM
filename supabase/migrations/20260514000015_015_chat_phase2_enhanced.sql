-- =======================================================
-- Feature 015: Chat Phase 2 - blacklist, voice, receipts,
-- replies, forwarding, and activity log.
-- =======================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'blacklist_match_mode_enum') THEN
    CREATE TYPE public.blacklist_match_mode_enum AS ENUM ('whole_word', 'substring');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_event_type_enum') THEN
    CREATE TYPE public.activity_event_type_enum AS ENUM ('message_sent', 'message_blocked', 'session_event');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.normalize_arabic_text(p_text TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
AS $$
  SELECT trim(
    regexp_replace(
      translate(
        regexp_replace(lower(p_text), U&'[\064B-\065F\0670]', '', 'g'),
        'أإآٱةىؤئ',
        'ااااهيوي'
      ),
      '\s+',
      ' ',
      'g'
    )
  )
$$;

CREATE TABLE IF NOT EXISTS public.chat_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word_original TEXT NOT NULL CHECK (char_length(word_original) BETWEEN 1 AND 200),
  word_normalized TEXT NOT NULL,
  match_mode public.blacklist_match_mode_enum NOT NULL DEFAULT 'whole_word',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_blacklist_normalized
  ON public.chat_blacklist(word_normalized);

ALTER TABLE public.chat_blacklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read blacklist" ON public.chat_blacklist;
CREATE POLICY "Admins read blacklist" ON public.chat_blacklist
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_profiles
      WHERE user_id = auth.uid() AND global_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins insert blacklist" ON public.chat_blacklist;
CREATE POLICY "Admins insert blacklist" ON public.chat_blacklist
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_profiles
      WHERE user_id = auth.uid() AND global_role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins delete blacklist" ON public.chat_blacklist;
CREATE POLICY "Admins delete blacklist" ON public.chat_blacklist
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.chat_profiles
      WHERE user_id = auth.uid() AND global_role = 'admin'
    )
  );

CREATE TABLE IF NOT EXISTS public.chat_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type public.activity_event_type_enum NOT NULL,
  room_id UUID REFERENCES public.chat_rooms(id) ON DELETE SET NULL,
  actor_display_name TEXT NOT NULL,
  details JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_event_type
  ON public.chat_activity_log(event_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at
  ON public.chat_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_room_id
  ON public.chat_activity_log(room_id)
  WHERE room_id IS NOT NULL;

ALTER TABLE public.chat_activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read activity log" ON public.chat_activity_log;
CREATE POLICY "Admins read activity log" ON public.chat_activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_profiles
      WHERE user_id = auth.uid() AND global_role = 'admin'
    )
  );

CREATE TABLE IF NOT EXISTS public.chat_activity_archive (
  id UUID PRIMARY KEY,
  event_type public.activity_event_type_enum NOT NULL,
  room_id UUID REFERENCES public.chat_rooms(id) ON DELETE SET NULL,
  actor_display_name TEXT NOT NULL,
  details JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_archive_created_at
  ON public.chat_activity_archive(created_at DESC);

ALTER TABLE public.chat_activity_archive ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read activity archive" ON public.chat_activity_archive;
CREATE POLICY "Admins read activity archive" ON public.chat_activity_archive
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_profiles
      WHERE user_id = auth.uid() AND global_role = 'admin'
    )
  );

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS is_forwarded BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS forwarded_quote_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS attachment_metadata JSONB;

CREATE OR REPLACE FUNCTION public.send_secure_message(
  p_room_id UUID,
  p_content TEXT DEFAULT NULL,
  p_attachment_path TEXT DEFAULT NULL,
  p_attachment_name TEXT DEFAULT NULL,
  p_attachment_size NUMERIC DEFAULT NULL,
  p_attachment_mime_type TEXT DEFAULT NULL,
  p_attachment_metadata JSONB DEFAULT NULL,
  p_parent_message_id UUID DEFAULT NULL,
  p_is_forwarded BOOLEAN DEFAULT FALSE,
  p_forwarded_quote_snapshot JSONB DEFAULT NULL
)
RETURNS public.chat_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_display_name TEXT;
  v_room_name TEXT;
  v_normalized TEXT;
  v_entry RECORD;
  v_new_message_id UUID;
  v_result public.chat_messages;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE room_id = p_room_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'NOT_PARTICIPANT' USING ERRCODE = 'P0001';
  END IF;

  IF p_parent_message_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.chat_messages
    WHERE id = p_parent_message_id AND room_id = p_room_id
  ) THEN
    RAISE EXCEPTION 'CROSS_ROOM_REPLY' USING ERRCODE = 'P0001';
  END IF;

  SELECT display_name INTO v_display_name
  FROM public.chat_profiles
  WHERE user_id = v_user_id;

  SELECT name INTO v_room_name
  FROM public.chat_rooms
  WHERE id = p_room_id;

  IF p_content IS NOT NULL AND btrim(p_content) <> '' THEN
    v_normalized := public.normalize_arabic_text(p_content);

    FOR v_entry IN
      SELECT word_original, word_normalized, match_mode
      FROM public.chat_blacklist
    LOOP
      IF (
        v_entry.match_mode = 'whole_word'
        AND v_normalized ~ ('(^|\s)' || regexp_replace(v_entry.word_normalized, '([\\.\+\*\?\[\^\]\$\(\)\{\}\=\!\<\>\|\:\-])', '\\\1', 'g') || '($|\s)')
      ) OR (
        v_entry.match_mode = 'substring'
        AND v_normalized LIKE ('%' || v_entry.word_normalized || '%')
      ) THEN
        INSERT INTO public.chat_activity_log (event_type, room_id, actor_display_name, details)
        VALUES (
          'message_blocked',
          p_room_id,
          COALESCE(v_display_name, 'مستخدم'),
          jsonb_build_object(
            'room_name', COALESCE(v_room_name, 'محادثة'),
            'matched_word', v_entry.word_original
          )
        );

        RAISE EXCEPTION 'CONTENT_POLICY_VIOLATION'
          USING ERRCODE = 'P0001', DETAIL = v_entry.word_original;
      END IF;
    END LOOP;
  END IF;

  INSERT INTO public.chat_messages (
    room_id,
    sender_id,
    content,
    attachment_path,
    attachment_name,
    attachment_size,
    attachment_mime_type,
    attachment_metadata,
    parent_message_id,
    is_forwarded,
    forwarded_quote_snapshot,
    delivery_status
  )
  VALUES (
    p_room_id,
    v_user_id,
    NULLIF(btrim(COALESCE(p_content, '')), ''),
    p_attachment_path,
    p_attachment_name,
    p_attachment_size,
    p_attachment_mime_type,
    p_attachment_metadata,
    p_parent_message_id,
    COALESCE(p_is_forwarded, FALSE),
    p_forwarded_quote_snapshot,
    'sent'
  )
  RETURNING id INTO v_new_message_id;

  INSERT INTO public.chat_activity_log (event_type, room_id, actor_display_name, details)
  VALUES (
    'message_sent',
    p_room_id,
    COALESCE(v_display_name, 'مستخدم'),
    jsonb_build_object(
      'room_name', COALESCE(v_room_name, 'محادثة'),
      'message_id', v_new_message_id
    )
  );

  SELECT * INTO v_result
  FROM public.chat_messages
  WHERE id = v_new_message_id;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.send_secure_message(UUID,TEXT,TEXT,TEXT,NUMERIC,TEXT,JSONB,UUID,BOOLEAN,JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_secure_message(UUID,TEXT,TEXT,TEXT,NUMERIC,TEXT,JSONB,UUID,BOOLEAN,JSONB) TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'chat_blacklist'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_blacklist;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'chat_activity_log'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_activity_log;
  END IF;
END $$;

UPDATE storage.buckets
SET allowed_mime_types = (
  SELECT ARRAY(
    SELECT DISTINCT mime
    FROM unnest(
      COALESCE(allowed_mime_types, ARRAY[]::text[])
      || ARRAY['audio/webm','audio/webm;codecs=opus','audio/mp4','audio/mpeg','audio/ogg','audio/wav']
    ) AS mime
  )
)
WHERE id = 'secure-chat-media';

COMMENT ON TABLE public.chat_blacklist IS 'Admin-managed normalized forbidden words for secure chat sends.';
COMMENT ON TABLE public.chat_activity_log IS 'Append-only admin audit stream for secure chat events. Message content is never stored here.';
COMMENT ON FUNCTION public.send_secure_message(UUID,TEXT,TEXT,TEXT,NUMERIC,TEXT,JSONB,UUID,BOOLEAN,JSONB) IS 'Atomic chat send RPC with participant checks, reply guard, blacklist enforcement, and audit logging.';
