-- =======================================================
-- Feature 017: Chat Phase 3 Polish
-- Member muting, unread badges, admin DMs, and room cleanup.
-- =======================================================

ALTER TABLE public.chat_participants
  ADD COLUMN IF NOT EXISTS can_send_messages BOOLEAN NOT NULL DEFAULT true;

UPDATE public.chat_participants
SET can_send_messages = false
WHERE is_muted = true;

CREATE INDEX IF NOT EXISTS idx_chat_participants_can_send
  ON public.chat_participants(room_id, user_id, can_send_messages);

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
    SELECT 1
    FROM public.chat_rooms cr
    JOIN public.chat_participants cp ON cp.room_id = cr.id
    WHERE cr.id = p_room_id
      AND cr.is_deleted = false
      AND cp.user_id = v_user_id
      AND cp.can_send_messages = true
  ) THEN
    RAISE EXCEPTION 'CANNOT_SEND_MESSAGES' USING ERRCODE = 'P0001';
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

COMMENT ON COLUMN public.chat_participants.can_send_messages IS 'When false, participant can read the room but cannot send text, attachments, or voice messages.';
