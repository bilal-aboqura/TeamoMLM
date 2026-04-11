-- ============================================================
-- Hotfix: get_referral_tree — add created_at to returned columns
-- Must DROP first because PostgreSQL cannot change return type via CREATE OR REPLACE
-- ============================================================
DROP FUNCTION IF EXISTS public.get_referral_tree(UUID, INT);

CREATE OR REPLACE FUNCTION public.get_referral_tree(
  p_root_id UUID,
  p_max_depth INT DEFAULT 5
)
RETURNS TABLE (
  id               UUID,
  full_name        TEXT,
  referral_code    TEXT,
  leadership_level SMALLINT,
  parent_id        UUID,
  depth            INT,
  created_at       TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
    WITH RECURSIVE tree AS (
      SELECT
        u.id,
        u.full_name,
        u.referral_code,
        u.leadership_level,
        u.invited_by AS parent_id,
        0 AS depth,
        u.created_at
      FROM public.users u
      WHERE u.id = p_root_id

      UNION ALL

      SELECT
        child.id,
        child.full_name,
        child.referral_code,
        child.leadership_level,
        child.invited_by AS parent_id,
        parent.depth + 1,
        child.created_at
      FROM public.users child
      JOIN tree parent ON child.invited_by = parent.id
      WHERE parent.depth + 1 <= p_max_depth
    )
    SELECT * FROM tree;
END;
$$;
