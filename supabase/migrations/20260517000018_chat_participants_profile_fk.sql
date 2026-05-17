-- =========================================================
-- Fix: Add FK from chat_participants → chat_profiles
-- Required for PostgREST to resolve the relational join:
--   chat_participants.select("..., chat_profiles(display_name)")
-- Without this FK the join silently fails and returns NULL,
-- causing the admin group-settings page to show zero members.
-- =========================================================

ALTER TABLE public.chat_participants
  ADD CONSTRAINT fk_chat_participants_profile
  FOREIGN KEY (user_id)
  REFERENCES public.chat_profiles(user_id)
  ON DELETE CASCADE;
