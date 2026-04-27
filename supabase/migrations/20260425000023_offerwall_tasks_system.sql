-- ============================================================
-- Migration: Offerwall Tasks System
-- Feature: 012-offerwall-tasks-system
-- ============================================================

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN public.tasks.description IS
  'Step-by-step instructions shown to the user in the task detail modal.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tasks'
      AND policyname = 'tasks_admin_all'
  ) THEN
    CREATE POLICY "tasks_admin_all" ON public.tasks
      FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'financial_audit_log_record_type_check'
      AND conrelid = 'public.financial_audit_log'::regclass
  ) THEN
    ALTER TABLE public.financial_audit_log
      DROP CONSTRAINT financial_audit_log_record_type_check;
  END IF;

  ALTER TABLE public.financial_audit_log
    ADD CONSTRAINT financial_audit_log_record_type_check
    CHECK (record_type IN (
      'package_subscription_request',
      'task_completion_log',
      'withdrawal_request',
      'referral_commission',
      'manual_adjustment',
      'leadership_reward',
      'leadership_salary',
      'investment_deposit',
      'investment_withdrawal',
      'offerwall_submission'
    ));
END $$;

CREATE TABLE IF NOT EXISTS public.offerwall_submissions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id          UUID        NOT NULL REFERENCES public.tasks(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  user_id          UUID        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  screenshot_path  TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  reviewed_at      TIMESTAMPTZ,
  reviewed_by      UUID        REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS offerwall_submissions_updated_at ON public.offerwall_submissions;
CREATE TRIGGER offerwall_submissions_updated_at
  BEFORE UPDATE ON public.offerwall_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS offerwall_submissions_one_active
  ON public.offerwall_submissions (user_id, task_id)
  WHERE status IN ('pending', 'approved');

CREATE INDEX IF NOT EXISTS idx_offerwall_submissions_pending
  ON public.offerwall_submissions (created_at ASC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_offerwall_submissions_user
  ON public.offerwall_submissions (user_id, task_id, status);

ALTER TABLE public.offerwall_submissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'offerwall_submissions'
      AND policyname = 'offerwall_sub_select_own'
  ) THEN
    CREATE POLICY "offerwall_sub_select_own" ON public.offerwall_submissions
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'offerwall_submissions'
      AND policyname = 'offerwall_sub_admin_all'
  ) THEN
    CREATE POLICY "offerwall_sub_admin_all" ON public.offerwall_submissions
      FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID          NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  amount           NUMERIC(10,4) NOT NULL CHECK (amount > 0),
  transaction_type TEXT          NOT NULL CHECK (transaction_type IN ('task_reward')),
  source_label     TEXT          NOT NULL,
  status           TEXT          NOT NULL DEFAULT 'Credited',
  submission_id    UUID          REFERENCES public.offerwall_submissions(id) ON DELETE RESTRICT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user
  ON public.wallet_transactions (user_id, created_at DESC);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'wallet_transactions'
      AND policyname = 'wallet_tx_select_own'
  ) THEN
    CREATE POLICY "wallet_tx_select_own" ON public.wallet_transactions
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'wallet_transactions'
      AND policyname = 'wallet_tx_admin_all'
  ) THEN
    CREATE POLICY "wallet_tx_admin_all" ON public.wallet_transactions
      FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.user_submit_offerwall_proof(
  p_task_id UUID,
  p_screenshot_path TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id     UUID := auth.uid();
  v_rejection_cnt INT;
  v_task          RECORD;
  v_new_id        UUID;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  SELECT id, reward_amount
    INTO v_task
    FROM public.tasks
    WHERE id = p_task_id AND is_active = true
    FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'task_not_found';
  END IF;

  IF v_task.reward_amount IS NULL OR v_task.reward_amount <= 0 THEN
    RAISE EXCEPTION 'task_no_reward';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.offerwall_submissions
    WHERE user_id = v_caller_id
      AND task_id = p_task_id
      AND status IN ('pending', 'approved')
  ) THEN
    RAISE EXCEPTION 'already_submitted';
  END IF;

  SELECT COUNT(*)
    INTO v_rejection_cnt
    FROM public.offerwall_submissions
    WHERE user_id = v_caller_id
      AND task_id = p_task_id
      AND status = 'rejected';

  IF v_rejection_cnt >= 3 THEN
    RAISE EXCEPTION 'max_attempts_reached';
  END IF;

  INSERT INTO public.offerwall_submissions (task_id, user_id, screenshot_path, status)
  VALUES (p_task_id, v_caller_id, p_screenshot_path, 'pending')
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_approve_offerwall_submission(
  p_submission_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id   UUID := auth.uid();
  v_caller_role TEXT;
  v_row         RECORD;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  SELECT role INTO v_caller_role
    FROM public.users
    WHERE id = v_caller_id;

  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT os.user_id, os.status, os.task_id, t.reward_amount, t.title
    INTO v_row
    FROM public.offerwall_submissions os
    JOIN public.tasks t ON t.id = os.task_id
    WHERE os.id = p_submission_id
    FOR UPDATE OF os;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  IF v_row.status != 'pending' THEN
    RAISE EXCEPTION 'not_pending';
  END IF;

  IF v_row.reward_amount IS NULL OR v_row.reward_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_reward';
  END IF;

  UPDATE public.offerwall_submissions
    SET status = 'approved',
        reviewed_at = now(),
        reviewed_by = v_caller_id
    WHERE id = p_submission_id;

  UPDATE public.users
    SET wallet_balance = wallet_balance + v_row.reward_amount,
        total_earned = total_earned + v_row.reward_amount
    WHERE id = v_row.user_id;

  INSERT INTO public.wallet_transactions
    (user_id, amount, transaction_type, source_label, status, submission_id)
  VALUES
    (v_row.user_id, v_row.reward_amount, 'task_reward', v_row.title, 'Credited', p_submission_id);

  INSERT INTO public.financial_audit_log
    (record_id, record_type, old_status, new_status, changed_by)
  VALUES
    (p_submission_id, 'offerwall_submission', 'pending', 'approved', v_caller_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_offerwall_submission(
  p_submission_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id   UUID := auth.uid();
  v_caller_role TEXT;
  v_status      TEXT;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  SELECT role INTO v_caller_role
    FROM public.users
    WHERE id = v_caller_id;

  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT status
    INTO v_status
    FROM public.offerwall_submissions
    WHERE id = p_submission_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'not_pending';
  END IF;

  UPDATE public.offerwall_submissions
    SET status = 'rejected',
        rejection_reason = p_reason,
        reviewed_at = now(),
        reviewed_by = v_caller_id
    WHERE id = p_submission_id;

  INSERT INTO public.financial_audit_log
    (record_id, record_type, old_status, new_status, changed_by)
  VALUES
    (p_submission_id, 'offerwall_submission', 'pending', 'rejected', v_caller_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_submit_offerwall_proof(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_offerwall_submission(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_offerwall_submission(UUID, TEXT) TO authenticated;
