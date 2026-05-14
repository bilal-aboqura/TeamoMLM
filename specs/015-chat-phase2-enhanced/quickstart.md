# Quickstart: نظام المحادثة المغلقة — Phase 2 Developer Setup

**Branch**: `015-chat-phase2-enhanced` | **Date**: 2026-05-14

---

## Prerequisites

- Phase 1 (`014-blind-chat-system`) fully deployed and live.
- Node 20+, npm 10+.
- Supabase project with service role key.
- Branch: `015-chat-phase2-enhanced` checked out.

---

## Step 1: Run the Phase 2 Migration

Apply in Supabase SQL Editor or via `supabase db push`:

**File**: `supabase/migrations/20260514000015_015_chat_phase2_enhanced.sql`

```sql
-- =======================================================
-- Feature 015: Chat Phase 2 — Blacklist, Voice, Statuses,
-- Replies/Forwarding, Activity Log
-- =======================================================

-- 1. New Enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'blacklist_match_mode_enum') THEN
    CREATE TYPE public.blacklist_match_mode_enum AS ENUM ('whole_word', 'substring');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_event_type_enum') THEN
    CREATE TYPE public.activity_event_type_enum AS ENUM ('message_sent','message_blocked','session_event');
  END IF;
END $$;

-- 2. Arabic normalization function
CREATE OR REPLACE FUNCTION public.normalize_arabic_text(p_text TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
  SELECT trim(regexp_replace(
    translate(
      regexp_replace(lower(p_text), '[\u064B-\u065F\u0670]', '', 'g'),
      'أإآٱةىؤئ', 'اااahيوي'
    ),
  '\s+', ' ', 'g'))
$$;

-- 3. chat_blacklist
CREATE TABLE IF NOT EXISTS public.chat_blacklist (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word_original   TEXT NOT NULL CHECK (char_length(word_original) BETWEEN 1 AND 200),
  word_normalized TEXT NOT NULL,
  match_mode      public.blacklist_match_mode_enum NOT NULL DEFAULT 'whole_word',
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_blacklist_normalized ON public.chat_blacklist(word_normalized);

-- 4. chat_activity_log
CREATE TABLE IF NOT EXISTS public.chat_activity_log (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type           public.activity_event_type_enum NOT NULL,
  room_id              UUID REFERENCES public.chat_rooms(id) ON DELETE SET NULL,
  actor_display_name   TEXT NOT NULL,
  details              JSONB NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_log_event_type  ON public.chat_activity_log(event_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at  ON public.chat_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_room_id     ON public.chat_activity_log(room_id) WHERE room_id IS NOT NULL;

-- 5. chat_activity_archive (identical structure + archived_at)
CREATE TABLE IF NOT EXISTS public.chat_activity_archive (
  id                   UUID PRIMARY KEY,
  event_type           public.activity_event_type_enum NOT NULL,
  room_id              UUID,
  actor_display_name   TEXT NOT NULL,
  details              JSONB NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL,
  archived_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_archive_created_at ON public.chat_activity_archive(created_at DESC);

-- 6. Extend chat_messages with Phase 2 columns
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS is_forwarded              BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS forwarded_quote_snapshot  JSONB,
  ADD COLUMN IF NOT EXISTS attachment_metadata       JSONB;

-- 7. Enable RLS
ALTER TABLE public.chat_blacklist         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_activity_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_activity_archive  ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies
-- chat_blacklist (admin-only)
DROP POLICY IF EXISTS "Admins manage blacklist" ON public.chat_blacklist;
CREATE POLICY "Admins manage blacklist" ON public.chat_blacklist
  USING (EXISTS (
    SELECT 1 FROM public.chat_profiles
    WHERE user_id = auth.uid() AND global_role = 'admin'
  ));

-- chat_activity_log (admin SELECT only — no client INSERT/UPDATE/DELETE)
DROP POLICY IF EXISTS "Admins read activity log" ON public.chat_activity_log;
CREATE POLICY "Admins read activity log" ON public.chat_activity_log
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.chat_profiles
    WHERE user_id = auth.uid() AND global_role = 'admin'
  ));

-- chat_activity_archive
DROP POLICY IF EXISTS "Admins read activity archive" ON public.chat_activity_archive;
CREATE POLICY "Admins read activity archive" ON public.chat_activity_archive
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.chat_profiles
    WHERE user_id = auth.uid() AND global_role = 'admin'
  ));

-- 9. send_secure_message RPC
CREATE OR REPLACE FUNCTION public.send_secure_message(
  p_room_id                  UUID,
  p_content                  TEXT    DEFAULT NULL,
  p_attachment_path          TEXT    DEFAULT NULL,
  p_attachment_name          TEXT    DEFAULT NULL,
  p_attachment_size          NUMERIC DEFAULT NULL,
  p_attachment_mime_type     TEXT    DEFAULT NULL,
  p_attachment_metadata      JSONB   DEFAULT NULL,
  p_parent_message_id        UUID    DEFAULT NULL,
  p_is_forwarded             BOOLEAN DEFAULT FALSE,
  p_forwarded_quote_snapshot JSONB   DEFAULT NULL
)
RETURNS public.chat_messages
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id       UUID := auth.uid();
  v_display_name  TEXT;
  v_room_name     TEXT;
  v_normalized    TEXT;
  v_entry         RECORD;
  v_new_msg_id    UUID;
  v_result        public.chat_messages;
BEGIN
  -- Auth check
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE = '42501';
  END IF;

  -- Participant check
  IF NOT EXISTS (
    SELECT 1 FROM chat_participants
    WHERE room_id = p_room_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'NOT_PARTICIPANT' USING ERRCODE = 'P0001';
  END IF;

  -- Cross-room reply check
  IF p_parent_message_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM chat_messages
      WHERE id = p_parent_message_id AND room_id = p_room_id
    ) THEN
      RAISE EXCEPTION 'CROSS_ROOM_REPLY' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Blacklist check (text messages only)
  IF p_content IS NOT NULL THEN
    v_normalized := normalize_arabic_text(p_content);

    SELECT display_name INTO v_display_name
    FROM chat_profiles WHERE user_id = v_user_id;

    SELECT name INTO v_room_name FROM chat_rooms WHERE id = p_room_id;

    FOR v_entry IN SELECT word_normalized, match_mode FROM chat_blacklist LOOP
      IF (v_entry.match_mode = 'whole_word'
          AND v_normalized ~ ('(^|\s)' || v_entry.word_normalized || '($|\s)'))
      OR (v_entry.match_mode = 'substring'
          AND v_normalized LIKE ('%' || v_entry.word_normalized || '%'))
      THEN
        INSERT INTO chat_activity_log (event_type, room_id, actor_display_name, details)
        VALUES (
          'message_blocked', p_room_id, v_display_name,
          jsonb_build_object('room_name', v_room_name, 'matched_word', v_entry.word_normalized)
        );
        RAISE EXCEPTION 'CONTENT_POLICY_VIOLATION'
          USING ERRCODE = 'P0001', DETAIL = v_entry.word_normalized;
      END IF;
    END LOOP;
  END IF;

  -- Insert message
  INSERT INTO chat_messages (
    room_id, sender_id, content,
    attachment_path, attachment_name, attachment_size,
    attachment_mime_type, attachment_metadata,
    parent_message_id, is_forwarded, forwarded_quote_snapshot,
    delivery_status
  ) VALUES (
    p_room_id, v_user_id, p_content,
    p_attachment_path, p_attachment_name, p_attachment_size,
    p_attachment_mime_type, p_attachment_metadata,
    p_parent_message_id, p_is_forwarded, p_forwarded_quote_snapshot,
    'sent'
  ) RETURNING id INTO v_new_msg_id;

  -- Log the sent event
  IF v_display_name IS NULL THEN
    SELECT display_name INTO v_display_name FROM chat_profiles WHERE user_id = v_user_id;
  END IF;
  IF v_room_name IS NULL THEN
    SELECT name INTO v_room_name FROM chat_rooms WHERE id = p_room_id;
  END IF;

  INSERT INTO chat_activity_log (event_type, room_id, actor_display_name, details)
  VALUES (
    'message_sent', p_room_id, v_display_name,
    jsonb_build_object('room_name', v_room_name, 'message_id', v_new_msg_id)
  );

  SELECT * INTO v_result FROM chat_messages WHERE id = v_new_msg_id;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.send_secure_message(UUID,TEXT,TEXT,TEXT,NUMERIC,TEXT,JSONB,UUID,BOOLEAN,JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_secure_message(UUID,TEXT,TEXT,TEXT,NUMERIC,TEXT,JSONB,UUID,BOOLEAN,JSONB) TO authenticated;

-- 10. Add to Realtime publication
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND tablename='chat_blacklist') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_blacklist;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND tablename='chat_activity_log') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_activity_log;
  END IF;
END $$;

-- 11. Extend secure-chat-media bucket with audio MIME types
UPDATE storage.buckets
SET allowed_mime_types = array_cat(
  COALESCE(allowed_mime_types, ARRAY[]::text[]),
  ARRAY['audio/webm','audio/webm;codecs=opus','audio/mp4','audio/mpeg','audio/ogg','audio/wav']
)
WHERE id = 'secure-chat-media'
  AND NOT (allowed_mime_types @> ARRAY['audio/webm']);
```

---

## Step 2: Configure Activity Log Archival

### Option A: pg_cron (Supabase Pro / recommended)

```sql
-- Enable extension (Pro tier)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Daily archive job at 02:00 UTC
SELECT cron.schedule(
  'archive-chat-activity-logs',
  '0 2 * * *',
  $$
    WITH moved AS (
      DELETE FROM public.chat_activity_log
      WHERE event_type = 'message_sent'
        AND created_at < now() - INTERVAL '90 days'
      RETURNING *
    )
    INSERT INTO public.chat_activity_archive
      (id, event_type, room_id, actor_display_name, details, created_at)
    SELECT id, event_type, room_id, actor_display_name, details, created_at FROM moved;
  $$
);
```

### Option B: Supabase Edge Function (Free/Starter fallback)

Create `supabase/functions/archive-chat-logs/index.ts` and schedule it via the Supabase Dashboard
Cron Schedules at `0 2 * * *`.

---

## Step 3: Source Code Structure (New Files)

```text
app/
├── dashboard/chat/_actions/
│   ├── sendMessage.ts           # MODIFY: call send_secure_message RPC
│   ├── markMessagesAsRead.ts    # NEW
│   ├── markMessageDelivered.ts  # NEW
│   └── forwardMessage.ts        # NEW
│
└── admin/chat/
    ├── blacklist/
    │   ├── page.tsx             # NEW (RSC)
    │   ├── loading.tsx          # NEW
    │   ├── error.tsx            # NEW
    │   └── _actions/
    │       ├── addBlacklistWord.ts     # NEW
    │       └── deleteBlacklistWord.ts  # NEW
    └── logs/
        ├── page.tsx             # NEW (RSC)
        ├── loading.tsx          # NEW
        ├── error.tsx            # NEW
        └── _actions/
            └── getActivityLogs.ts  # NEW

components/chat/
    ├── VoiceRecorder.tsx        # NEW ("use client")
    ├── AudioPlayer.tsx          # NEW ("use client")
    ├── MessageStatusBadge.tsx   # NEW
    ├── ReplyPreview.tsx         # NEW
    ├── ForwardPicker.tsx        # NEW ("use client")
    ├── MessageContextMenu.tsx   # NEW ("use client")
    ├── ActivityLogFeed.tsx      # NEW ("use client")
    └── BlacklistManager.tsx     # NEW ("use client")

lib/chat/
    ├── normalize.ts             # NEW — Arabic normalization (mirrors Postgres function)
    └── useVoiceRecorder.ts      # NEW — MediaRecorder hook
```

---

## Step 4: Run Dev Server

```bash
npm run dev
```

- Blacklist management: `http://localhost:3000/admin/chat/blacklist`
- Activity log: `http://localhost:3000/admin/chat/logs`
- User chat (with voice + reply + forward): `http://localhost:3000/dashboard/chat`

---

## Key Implementation Notes

### Blacklist
1. **Always call `send_secure_message` RPC** — never insert into `chat_messages` directly.
2. **Error handling**: Catch `error.message === 'CONTENT_POLICY_VIOLATION'` and show the Arabic
   toast. Do NOT expose `error.detail` (matched word) to non-admin users.
3. **`normalize_arabic_text` in TypeScript** must be kept in sync with the Postgres function.
   Add a unit test that runs both against the same inputs and asserts equality.

### Voice Recording
4. **`useVoiceRecorder` cleanup**: Always call `stream.getTracks().forEach(t => t.stop())` in the
   `useEffect` cleanup to release the microphone after recording or discard.
5. **Audio MIME check**: `MediaRecorder.isTypeSupported('audio/webm;codecs=opus')` — if false (Safari),
   fall back to `'audio/mp4'`. Store the detected MIME type in `attachment_mime_type`.
6. **Server-side `audio_allowed` re-check**: Before accepting an audio upload, the `sendMessage`
   Server Action must re-read `media_settings.audio_allowed` from `chat_rooms`. Client-side state
   can be stale or bypassed.

### Read Receipts
7. **Debounce the IntersectionObserver callback**: Use a 300 ms debounce before calling
   `markMessagesAsRead` to batch all messages that became visible in the same scroll event.
8. **Avoid downgrade**: The `UPDATE` for `markMessageDelivered` uses `WHERE delivery_status = 'sent'`
   to never overwrite a `'read'` status with `'delivered'`.

### Forwarding
9. **Build `forwarded_quote_snapshot` server-side** in `forwardMessage.ts`. Never trust the client
   to supply this — the client may provide a stale or forged snapshot.
10. **Cross-room source fetch**: Use the **service role** Supabase client in `forwardMessage.ts`
    to read the source message — the caller's anon session may not have RLS access to the source room.

### Activity Log
11. **Append-only enforcement**: The `chat_activity_log` table has **no UPDATE or DELETE RLS policy**
    for any role. Confirm this in the migration — absence of a policy blocks the operation at DB level.
12. **Archive toggle in UI**: The "عرض الأرشيف" toggle in the log page switches the Server Action's
    query source between `chat_activity_log` and `chat_activity_archive`. These are separate queries,
    not a UNION, to keep pagination simple and performant.
