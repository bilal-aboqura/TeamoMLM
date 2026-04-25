-- ============================================================
-- Migration: Investment and trading cycles
-- Feature: 010-investment-trading-cycles
-- ============================================================

ALTER TABLE public.financial_audit_log
  DROP CONSTRAINT IF EXISTS financial_audit_log_record_type_check;

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
    'investment_withdrawal'
  ));

CREATE TABLE IF NOT EXISTS public.investment_accounts (
  user_id                 UUID          PRIMARY KEY REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  total_capital           NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_capital >= 0),
  withdrawn_profits       NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (withdrawn_profits >= 0),
  last_cycle_start        TIMESTAMPTZ,
  current_tier_percentage NUMERIC(5,2),
  status                  TEXT          NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.investment_deposits (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID          NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  amount            NUMERIC(12,2) NOT NULL CHECK (amount >= 100),
  tier_percentage   NUMERIC(5,2)  NOT NULL,
  receipt_url       TEXT          NOT NULL,
  status            TEXT          NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  rejection_reason  TEXT,
  reviewed_at       TIMESTAMPTZ,
  reviewed_by       UUID          REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.investment_withdrawals (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID          NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  amount            NUMERIC(12,2) NOT NULL CHECK (amount >= 10),
  status            TEXT          NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  rejection_reason  TEXT,
  reviewed_at       TIMESTAMPTZ,
  reviewed_by       UUID          REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.in_app_notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message    TEXT        NOT NULL,
  is_read    BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'investment_accounts_updated_at') THEN
    CREATE TRIGGER investment_accounts_updated_at
      BEFORE UPDATE ON public.investment_accounts
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'investment_deposits_updated_at') THEN
    CREATE TRIGGER investment_deposits_updated_at
      BEFORE UPDATE ON public.investment_deposits
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'investment_withdrawals_updated_at') THEN
    CREATE TRIGGER investment_withdrawals_updated_at
      BEFORE UPDATE ON public.investment_withdrawals
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS investment_deposits_one_active_or_pending
  ON public.investment_deposits (user_id)
  WHERE status IN ('pending', 'accepted');

CREATE INDEX IF NOT EXISTS idx_investment_deposits_user_id
  ON public.investment_deposits (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_investment_deposits_pending
  ON public.investment_deposits (created_at ASC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_investment_withdrawals_user_id
  ON public.investment_withdrawals (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_investment_withdrawals_pending
  ON public.investment_withdrawals (created_at ASC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user_unread
  ON public.in_app_notifications (user_id, is_read, created_at DESC);

ALTER TABLE public.investment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "investment_accounts_select_own" ON public.investment_accounts;
CREATE POLICY "investment_accounts_select_own" ON public.investment_accounts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "investment_deposits_select_own" ON public.investment_deposits;
CREATE POLICY "investment_deposits_select_own" ON public.investment_deposits
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "investment_withdrawals_select_own" ON public.investment_withdrawals;
CREATE POLICY "investment_withdrawals_select_own" ON public.investment_withdrawals
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "investment_deposits_admin_select" ON public.investment_deposits;
CREATE POLICY "investment_deposits_admin_select" ON public.investment_deposits
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "investment_withdrawals_admin_select" ON public.investment_withdrawals;
CREATE POLICY "investment_withdrawals_admin_select" ON public.investment_withdrawals
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "in_app_notifications_select_own" ON public.in_app_notifications;
CREATE POLICY "in_app_notifications_select_own" ON public.in_app_notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "in_app_notifications_update_own" ON public.in_app_notifications;
CREATE POLICY "in_app_notifications_update_own" ON public.in_app_notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public)
VALUES ('investment-receipts', 'investment-receipts', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "investment_receipts_insert_own_folder" ON storage.objects;
CREATE POLICY "investment_receipts_insert_own_folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'investment-receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "investment_receipts_select_own_folder" ON storage.objects;
CREATE POLICY "investment_receipts_select_own_folder" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'investment-receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "investment_receipts_admin_select" ON storage.objects;
CREATE POLICY "investment_receipts_admin_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'investment-receipts'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION public.user_submit_investment_deposit(
  p_user_id UUID,
  p_amount NUMERIC,
  p_tier_pct NUMERIC,
  p_receipt_url TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deposit_id UUID;
  v_existing UUID;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_amount < 100 THEN
    RAISE EXCEPTION 'below_minimum';
  END IF;

  IF p_tier_pct NOT IN (5, 8, 12, 18, 25) THEN
    RAISE EXCEPTION 'invalid_tier';
  END IF;

  PERFORM 1 FROM public.users WHERE id = p_user_id FOR UPDATE;

  SELECT id
  INTO v_existing
  FROM public.investment_deposits
  WHERE user_id = p_user_id
    AND status IN ('pending', 'accepted')
  LIMIT 1
  FOR UPDATE;

  IF v_existing IS NOT NULL THEN
    RAISE EXCEPTION 'already_active';
  END IF;

  INSERT INTO public.investment_deposits (
    user_id, amount, tier_percentage, receipt_url, status
  )
  VALUES (
    p_user_id, p_amount, p_tier_pct, p_receipt_url, 'pending'
  )
  RETURNING id INTO v_deposit_id;

  RETURN v_deposit_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_approve_investment_deposit(
  p_request_id UUID,
  p_admin_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deposit public.investment_deposits%ROWTYPE;
  v_is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = p_admin_id AND role = 'admin'
  )
  INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT * INTO v_deposit
  FROM public.investment_deposits
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  IF v_deposit.status <> 'pending' THEN
    RAISE EXCEPTION 'not_pending';
  END IF;

  UPDATE public.investment_deposits
  SET status = 'accepted',
      reviewed_at = now(),
      reviewed_by = p_admin_id,
      rejection_reason = NULL
  WHERE id = p_request_id;

  INSERT INTO public.investment_accounts (
    user_id, total_capital, withdrawn_profits, last_cycle_start,
    current_tier_percentage, status
  )
  VALUES (
    v_deposit.user_id, v_deposit.amount, 0, now(),
    v_deposit.tier_percentage, 'active'
  )
  ON CONFLICT (user_id) DO UPDATE
    SET total_capital = investment_accounts.total_capital + EXCLUDED.total_capital,
        last_cycle_start = now(),
        current_tier_percentage = EXCLUDED.current_tier_percentage,
        status = 'active';

  INSERT INTO public.financial_audit_log (
    record_id, record_type, old_status, new_status, changed_by
  )
  VALUES (p_request_id, 'investment_deposit', 'pending', 'accepted', p_admin_id);

  INSERT INTO public.in_app_notifications (user_id, message)
  VALUES (v_deposit.user_id, 'تم قبول طلب إيداع الاستثمار الخاص بك.');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_investment_deposit(
  p_request_id UUID,
  p_admin_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deposit public.investment_deposits%ROWTYPE;
  v_is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = p_admin_id AND role = 'admin'
  )
  INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT * INTO v_deposit
  FROM public.investment_deposits
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  IF v_deposit.status <> 'pending' THEN
    RAISE EXCEPTION 'not_pending';
  END IF;

  UPDATE public.investment_deposits
  SET status = 'rejected',
      reviewed_at = now(),
      reviewed_by = p_admin_id,
      rejection_reason = NULLIF(p_reason, '')
  WHERE id = p_request_id;

  INSERT INTO public.financial_audit_log (
    record_id, record_type, old_status, new_status, changed_by
  )
  VALUES (p_request_id, 'investment_deposit', 'pending', 'rejected', p_admin_id);

  INSERT INTO public.in_app_notifications (user_id, message)
  VALUES (v_deposit.user_id, 'تم رفض طلب إيداع الاستثمار الخاص بك.');
END;
$$;

CREATE OR REPLACE FUNCTION public.user_submit_investment_withdrawal(
  p_user_id UUID,
  p_amount NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account public.investment_accounts%ROWTYPE;
  v_pending NUMERIC;
  v_cycles INTEGER;
  v_profit_per_cycle NUMERIC;
  v_available NUMERIC;
  v_withdrawal_id UUID;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_amount < 10 THEN
    RAISE EXCEPTION 'below_minimum';
  END IF;

  SELECT * INTO v_account
  FROM public.investment_accounts
  WHERE user_id = p_user_id
    AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND OR v_account.last_cycle_start IS NULL THEN
    RAISE EXCEPTION 'no_active_investment';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.investment_withdrawals
    WHERE user_id = p_user_id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'pending_withdrawal_exists';
  END IF;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_pending
  FROM public.investment_withdrawals
  WHERE user_id = p_user_id
    AND status = 'pending';

  v_cycles := FLOOR(EXTRACT(EPOCH FROM (now() - v_account.last_cycle_start)) / 604800);
  v_profit_per_cycle := FLOOR(v_account.total_capital * v_account.current_tier_percentage / 100 * 100) / 100;
  v_available := GREATEST(0, (v_cycles * v_profit_per_cycle) - v_account.withdrawn_profits - v_pending);

  IF p_amount > v_available THEN
    RAISE EXCEPTION 'insufficient_profit';
  END IF;

  INSERT INTO public.investment_withdrawals (user_id, amount, status)
  VALUES (p_user_id, p_amount, 'pending')
  RETURNING id INTO v_withdrawal_id;

  RETURN v_withdrawal_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_approve_investment_withdrawal(
  p_request_id UUID,
  p_admin_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_withdrawal public.investment_withdrawals%ROWTYPE;
  v_is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = p_admin_id AND role = 'admin'
  )
  INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT * INTO v_withdrawal
  FROM public.investment_withdrawals
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  IF v_withdrawal.status <> 'pending' THEN
    RAISE EXCEPTION 'not_pending';
  END IF;

  PERFORM 1
  FROM public.investment_accounts
  WHERE user_id = v_withdrawal.user_id
  FOR UPDATE;

  UPDATE public.investment_withdrawals
  SET status = 'accepted',
      reviewed_at = now(),
      reviewed_by = p_admin_id,
      rejection_reason = NULL
  WHERE id = p_request_id;

  UPDATE public.investment_accounts
  SET withdrawn_profits = withdrawn_profits + v_withdrawal.amount
  WHERE user_id = v_withdrawal.user_id;

  INSERT INTO public.financial_audit_log (
    record_id, record_type, old_status, new_status, changed_by
  )
  VALUES (p_request_id, 'investment_withdrawal', 'pending', 'accepted', p_admin_id);

  INSERT INTO public.in_app_notifications (user_id, message)
  VALUES (v_withdrawal.user_id, 'تم قبول طلب سحب أرباح الاستثمار.');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_investment_withdrawal(
  p_request_id UUID,
  p_admin_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_withdrawal public.investment_withdrawals%ROWTYPE;
  v_is_admin BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = p_admin_id AND role = 'admin'
  )
  INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT * INTO v_withdrawal
  FROM public.investment_withdrawals
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  IF v_withdrawal.status <> 'pending' THEN
    RAISE EXCEPTION 'not_pending';
  END IF;

  UPDATE public.investment_withdrawals
  SET status = 'rejected',
      reviewed_at = now(),
      reviewed_by = p_admin_id,
      rejection_reason = NULLIF(p_reason, '')
  WHERE id = p_request_id;

  INSERT INTO public.financial_audit_log (
    record_id, record_type, old_status, new_status, changed_by
  )
  VALUES (p_request_id, 'investment_withdrawal', 'pending', 'rejected', p_admin_id);

  INSERT INTO public.in_app_notifications (user_id, message)
  VALUES (v_withdrawal.user_id, 'تم رفض طلب سحب أرباح الاستثمار.');
END;
$$;
