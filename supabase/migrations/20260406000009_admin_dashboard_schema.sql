-- ============================================================
-- Migration: Admin Dashboard schema + RPC functions
-- Feature: 005-admin-dashboard
-- ============================================================

-- T001: Add leadership_level to users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'leadership_level'
  ) THEN
    ALTER TABLE public.users
      ADD COLUMN leadership_level SMALLINT NULL
        CONSTRAINT users_leadership_level_range CHECK (leadership_level BETWEEN 1 AND 6);
  END IF;
END $$;

COMMENT ON COLUMN public.users.leadership_level IS
  'Admin-assigned MLM rank: 1=L1 .. 6=L6. NULL = not yet assigned.';

-- T001: Add reviewed_at / reviewed_by to package_subscription_requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'package_subscription_requests' AND column_name = 'reviewed_at'
  ) THEN
    ALTER TABLE public.package_subscription_requests
      ADD COLUMN reviewed_at TIMESTAMPTZ NULL,
      ADD COLUMN reviewed_by UUID NULL REFERENCES public.users(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- T001: Add reviewed_at / reviewed_by to task_completion_logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'task_completion_logs' AND column_name = 'reviewed_at'
  ) THEN
    ALTER TABLE public.task_completion_logs
      ADD COLUMN reviewed_at TIMESTAMPTZ NULL,
      ADD COLUMN reviewed_by UUID NULL REFERENCES public.users(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- T001: Partial indexes for pending-status admin queue queries
CREATE INDEX IF NOT EXISTS idx_pkg_sub_requests_pending
  ON public.package_subscription_requests (created_at ASC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_task_logs_pending
  ON public.task_completion_logs (created_at ASC)
  WHERE status = 'pending';

-- ============================================================
-- T002: admin_approve_task — atomic approve + wallet credit + audit
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_approve_task(
  p_log_id UUID,
  p_admin_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row RECORD;
BEGIN
  SELECT user_id, reward_amount_snapshot, status
    INTO v_row
    FROM public.task_completion_logs
    WHERE id = p_log_id
    FOR UPDATE;

  IF v_row.status IS NULL THEN
    RAISE EXCEPTION 'Task completion log not found';
  END IF;

  IF v_row.status != 'pending' THEN
    RAISE EXCEPTION 'not_pending';
  END IF;

  UPDATE public.task_completion_logs
    SET status = 'approved',
        reviewed_at = now(),
        reviewed_by = p_admin_id
    WHERE id = p_log_id;

  UPDATE public.users
    SET wallet_balance = wallet_balance + v_row.reward_amount_snapshot,
        total_earned = total_earned + v_row.reward_amount_snapshot
    WHERE id = v_row.user_id;

  INSERT INTO public.financial_audit_log (record_id, record_type, old_status, new_status, changed_by)
    VALUES (p_log_id, 'task_completion_log', 'pending', 'approved', p_admin_id);
END;
$$;

-- ============================================================
-- T003: admin_reject_task — atomic reject + audit
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_reject_task(
  p_log_id UUID,
  p_admin_id UUID,
  p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status
    FROM public.task_completion_logs
    WHERE id = p_log_id
    FOR UPDATE;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Task completion log not found';
  END IF;

  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'not_pending';
  END IF;

  UPDATE public.task_completion_logs
    SET status = 'rejected',
        rejection_reason = p_reason,
        reviewed_at = now(),
        reviewed_by = p_admin_id
    WHERE id = p_log_id;

  INSERT INTO public.financial_audit_log (record_id, record_type, old_status, new_status, changed_by)
    VALUES (p_log_id, 'task_completion_log', 'pending', 'rejected', p_admin_id);
END;
$$;

-- ============================================================
-- T004: admin_approve_deposit — atomic approve + package level update + audit
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_approve_deposit(
  p_request_id UUID,
  p_admin_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row RECORD;
  v_package_name TEXT;
BEGIN
  SELECT r.user_id, r.package_id, r.status
    INTO v_row
    FROM public.package_subscription_requests r
    WHERE r.id = p_request_id
    FOR UPDATE;

  IF v_row.status IS NULL THEN
    RAISE EXCEPTION 'Package subscription request not found';
  END IF;

  IF v_row.status != 'pending' THEN
    RAISE EXCEPTION 'not_pending';
  END IF;

  SELECT name INTO v_package_name
    FROM public.packages
    WHERE id = v_row.package_id;

  UPDATE public.package_subscription_requests
    SET status = 'approved',
        reviewed_at = now(),
        reviewed_by = p_admin_id
    WHERE id = p_request_id;

  UPDATE public.users
    SET current_package_level = v_package_name
    WHERE id = v_row.user_id;

  INSERT INTO public.financial_audit_log (record_id, record_type, old_status, new_status, changed_by)
    VALUES (p_request_id, 'package_subscription_request', 'pending', 'approved', p_admin_id);
END;
$$;

-- ============================================================
-- T005: admin_reject_deposit — atomic reject + audit
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_reject_deposit(
  p_request_id UUID,
  p_admin_id UUID,
  p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status
    FROM public.package_subscription_requests
    WHERE id = p_request_id
    FOR UPDATE;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Package subscription request not found';
  END IF;

  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'not_pending';
  END IF;

  UPDATE public.package_subscription_requests
    SET status = 'rejected',
        rejection_reason = p_reason,
        reviewed_at = now(),
        reviewed_by = p_admin_id
    WHERE id = p_request_id;

  INSERT INTO public.financial_audit_log (record_id, record_type, old_status, new_status, changed_by)
    VALUES (p_request_id, 'package_subscription_request', 'pending', 'rejected', p_admin_id);
END;
$$;

-- ============================================================
-- T006: get_referral_tree — recursive CTE for referral tree
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_referral_tree(
  p_root_id UUID,
  p_max_depth INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  referral_code TEXT,
  leadership_level SMALLINT,
  parent_id UUID,
  depth INT
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
        0 AS depth
      FROM public.users u
      WHERE u.id = p_root_id

      UNION ALL

      SELECT
        child.id,
        child.full_name,
        child.referral_code,
        child.leadership_level,
        child.invited_by AS parent_id,
        parent.depth + 1
      FROM public.users child
      JOIN tree parent ON child.invited_by = parent.id
      WHERE parent.depth + 1 <= p_max_depth
    )
    SELECT * FROM tree;
END;
$$;
