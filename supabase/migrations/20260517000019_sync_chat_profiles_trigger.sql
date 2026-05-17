-- ============================================================
-- Fix: Auto-sync chat_profiles with public.users
-- ============================================================
-- Problem: Users who registered after the initial chat deployment
--   (20260510000014) have no chat_profile row because the seed
--   INSERT ran only once at migration time with no ongoing trigger.
-- Solution:
--   1. Backfill all existing users that are missing a chat_profile.
--   2. Add an AFTER INSERT trigger on public.users so every new
--      registration automatically gets a chat_profile row.
-- ============================================================

-- 1. Backfill: insert chat_profiles for all users that don't have one yet
INSERT INTO public.chat_profiles (user_id, display_name, global_role)
SELECT
  u.id,
  LEFT(COALESCE(NULLIF(TRIM(u.full_name), ''), 'User'), 60),
  CASE
    WHEN u.role = 'admin'     THEN 'admin'::public.global_role_enum
    WHEN u.role = 'moderator' THEN 'moderator'::public.global_role_enum
    ELSE                           'user'::public.global_role_enum
  END
FROM public.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.chat_profiles cp WHERE cp.user_id = u.id
);

-- 2. Trigger function: called after every INSERT on public.users
CREATE OR REPLACE FUNCTION public.sync_chat_profile_on_user_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.chat_profiles (user_id, display_name, global_role)
  VALUES (
    NEW.id,
    LEFT(COALESCE(NULLIF(TRIM(NEW.full_name), ''), 'User'), 60),
    CASE
      WHEN NEW.role = 'admin'     THEN 'admin'::public.global_role_enum
      WHEN NEW.role = 'moderator' THEN 'moderator'::public.global_role_enum
      ELSE                             'user'::public.global_role_enum
    END
  )
  ON CONFLICT (user_id) DO NOTHING; -- idempotent: skip if already exists
  RETURN NEW;
END;
$$;

-- 3. Attach trigger to public.users
DROP TRIGGER IF EXISTS trg_sync_chat_profile_on_user_insert ON public.users;
CREATE TRIGGER trg_sync_chat_profile_on_user_insert
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_chat_profile_on_user_insert();

-- 4. Also keep display_name/global_role in sync when a user's role changes
CREATE OR REPLACE FUNCTION public.sync_chat_profile_on_user_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only run when role or full_name actually changed
  IF NEW.role IS DISTINCT FROM OLD.role OR NEW.full_name IS DISTINCT FROM OLD.full_name THEN
    UPDATE public.chat_profiles
    SET
      display_name = LEFT(COALESCE(NULLIF(TRIM(NEW.full_name), ''), 'User'), 60),
      global_role  = CASE
        WHEN NEW.role = 'admin'     THEN 'admin'::public.global_role_enum
        WHEN NEW.role = 'moderator' THEN 'moderator'::public.global_role_enum
        ELSE                             'user'::public.global_role_enum
      END
    WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_chat_profile_on_user_update ON public.users;
CREATE TRIGGER trg_sync_chat_profile_on_user_update
  AFTER UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_chat_profile_on_user_update();
