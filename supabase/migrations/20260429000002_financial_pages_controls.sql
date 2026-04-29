-- ============================================================
-- Migration: Financial page controls and retry fixes
-- Feature: 014-financial-pages-controls
-- ============================================================

CREATE TABLE IF NOT EXISTS public.platform_payment_targets (
  scope       TEXT PRIMARY KEY CHECK (scope IN ('packages', 'profit_shares', 'investment', 'pay_later')),
  label       TEXT NOT NULL DEFAULT 'USDT',
  address     TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS platform_payment_targets_updated_at ON public.platform_payment_targets;
CREATE TRIGGER platform_payment_targets_updated_at
  BEFORE UPDATE ON public.platform_payment_targets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.platform_payment_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_payment_targets_select_authenticated" ON public.platform_payment_targets;
CREATE POLICY "platform_payment_targets_select_authenticated" ON public.platform_payment_targets
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "platform_payment_targets_admin_all" ON public.platform_payment_targets;
CREATE POLICY "platform_payment_targets_admin_all" ON public.platform_payment_targets
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

INSERT INTO public.platform_payment_targets (scope, label, address)
SELECT scope, COALESCE(s.payment_method_label, 'USDT'), COALESCE(s.payment_address, '')
FROM (VALUES ('packages'), ('profit_shares'), ('investment'), ('pay_later')) AS v(scope)
LEFT JOIN LATERAL (
  SELECT payment_method_label, payment_address
  FROM public.admin_settings
  WHERE is_active = true
  LIMIT 1
) s ON true
ON CONFLICT (scope) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.profit_share_settings (
  id                     BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  manual_sold_percentage NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (manual_sold_percentage >= 0 AND manual_sold_percentage <= 30),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS profit_share_settings_updated_at ON public.profit_share_settings;
CREATE TRIGGER profit_share_settings_updated_at
  BEFORE UPDATE ON public.profit_share_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.profit_share_settings (id)
VALUES (true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.profit_share_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profit_share_settings_select_authenticated" ON public.profit_share_settings;
CREATE POLICY "profit_share_settings_select_authenticated" ON public.profit_share_settings
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profit_share_settings_admin_all" ON public.profit_share_settings;
CREATE POLICY "profit_share_settings_admin_all" ON public.profit_share_settings
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

ALTER TABLE public.profit_share_requests
  ADD COLUMN IF NOT EXISTS buyer_email TEXT,
  ADD COLUMN IF NOT EXISTS buyer_phone TEXT;

ALTER TABLE public.profit_share_requests
  ALTER COLUMN sponsor_referral_code DROP NOT NULL;

CREATE TABLE IF NOT EXISTS public.investment_trading_reports (
  id                    BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  total_trades           INT NOT NULL DEFAULT 0 CHECK (total_trades >= 0),
  won_trades             INT NOT NULL DEFAULT 0 CHECK (won_trades >= 0),
  lost_trades            INT NOT NULL DEFAULT 0 CHECK (lost_trades >= 0),
  period_start           DATE,
  period_end             DATE,
  details                TEXT NOT NULL DEFAULT '',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (won_trades + lost_trades <= total_trades),
  CHECK (period_start IS NULL OR period_end IS NULL OR period_end >= period_start)
);

DROP TRIGGER IF EXISTS investment_trading_reports_updated_at ON public.investment_trading_reports;
CREATE TRIGGER investment_trading_reports_updated_at
  BEFORE UPDATE ON public.investment_trading_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.investment_trading_reports (id, total_trades, won_trades, lost_trades, details)
VALUES (true, 12, 9, 3, '')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.investment_trading_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "investment_trading_reports_select_authenticated" ON public.investment_trading_reports;
CREATE POLICY "investment_trading_reports_select_authenticated" ON public.investment_trading_reports
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "investment_trading_reports_admin_all" ON public.investment_trading_reports;
CREATE POLICY "investment_trading_reports_admin_all" ON public.investment_trading_reports
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE TABLE IF NOT EXISTS public.investment_manual_profits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  reason      TEXT NOT NULL DEFAULT '',
  created_by  UUID REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_investment_manual_profits_user
  ON public.investment_manual_profits (user_id, created_at DESC);

ALTER TABLE public.investment_manual_profits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "investment_manual_profits_select_own" ON public.investment_manual_profits;
CREATE POLICY "investment_manual_profits_select_own" ON public.investment_manual_profits
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "investment_manual_profits_admin_all" ON public.investment_manual_profits;
CREATE POLICY "investment_manual_profits_admin_all" ON public.investment_manual_profits
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE TABLE IF NOT EXISTS public.app_profit_package_limits (
  package_key TEXT PRIMARY KEY,
  app_limit   INT NOT NULL DEFAULT 999 CHECK (app_limit >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS app_profit_package_limits_updated_at ON public.app_profit_package_limits;
CREATE TRIGGER app_profit_package_limits_updated_at
  BEFORE UPDATE ON public.app_profit_package_limits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.app_profit_package_limits (package_key, app_limit)
VALUES ('A1', 999), ('A2', 999), ('A3', 999), ('B1', 999), ('B2', 999), ('B3', 999),
       ('200', 999), ('300', 999), ('400', 999), ('500', 999), ('600', 999)
ON CONFLICT (package_key) DO NOTHING;

ALTER TABLE public.app_profit_package_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_profit_package_limits_select_authenticated" ON public.app_profit_package_limits;
CREATE POLICY "app_profit_package_limits_select_authenticated" ON public.app_profit_package_limits
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "app_profit_package_limits_admin_all" ON public.app_profit_package_limits;
CREATE POLICY "app_profit_package_limits_admin_all" ON public.app_profit_package_limits
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE TABLE IF NOT EXISTS public.user_balance_adjustments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  old_balance NUMERIC(12,2) NOT NULL CHECK (old_balance >= 0),
  new_balance NUMERIC(12,2) NOT NULL CHECK (new_balance >= 0),
  delta       NUMERIC(12,2) NOT NULL,
  reason      TEXT NOT NULL,
  created_by  UUID REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_balance_adjustments_user
  ON public.user_balance_adjustments (user_id, created_at DESC);

ALTER TABLE public.user_balance_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_balance_adjustments_select_own" ON public.user_balance_adjustments;
CREATE POLICY "user_balance_adjustments_select_own" ON public.user_balance_adjustments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_balance_adjustments_admin_all" ON public.user_balance_adjustments;
CREATE POLICY "user_balance_adjustments_admin_all" ON public.user_balance_adjustments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

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
    'investment_withdrawal',
    'investment_manual_profit',
    'app_profit_submission',
    'app_profit_withdrawal',
    'offerwall_submission',
    'pay_later_debt'
  ));

CREATE OR REPLACE FUNCTION public.admin_process_profit_share_request(
  p_request_id UUID,
  p_action TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_request public.profit_share_requests%ROWTYPE;
  v_total NUMERIC;
  v_manual NUMERIC;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role = 'admin'
  )
  INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_action NOT IN ('accept', 'reject') THEN
    RAISE EXCEPTION 'invalid_action';
  END IF;

  SELECT *
  INTO v_request
  FROM public.profit_share_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND OR v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'not_pending';
  END IF;

  IF p_action = 'accept' THEN
    SELECT COALESCE(SUM(percentage), 0)
    INTO v_total
    FROM public.profit_share_requests
    WHERE status = 'accepted';

    SELECT COALESCE(manual_sold_percentage, 0)
    INTO v_manual
    FROM public.profit_share_settings
    WHERE id = true;

    IF COALESCE(v_total, 0) + COALESCE(v_manual, 0) + v_request.percentage > 30 THEN
      RAISE EXCEPTION 'global_cap_exceeded';
    END IF;

    UPDATE public.profit_share_requests
    SET status = 'accepted'
    WHERE id = p_request_id
      AND status = 'pending';
  ELSE
    UPDATE public.profit_share_requests
    SET status = 'rejected'
    WHERE id = p_request_id
      AND status = 'pending';
  END IF;
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
  v_manual_profit NUMERIC;
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

  SELECT COALESCE(SUM(amount), 0)
  INTO v_manual_profit
  FROM public.investment_manual_profits
  WHERE user_id = p_user_id;

  v_cycles := FLOOR(EXTRACT(EPOCH FROM (now() - v_account.last_cycle_start)) / 604800);
  v_profit_per_cycle := FLOOR(v_account.total_capital * v_account.current_tier_percentage / 100 * 100) / 100;
  v_available := GREATEST(0, (v_cycles * v_profit_per_cycle) + v_manual_profit - v_account.withdrawn_profits - v_pending);

  IF p_amount > v_available THEN
    RAISE EXCEPTION 'insufficient_profit';
  END IF;

  INSERT INTO public.investment_withdrawals (user_id, amount, status)
  VALUES (p_user_id, p_amount, 'pending')
  RETURNING id INTO v_withdrawal_id;

  RETURN v_withdrawal_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_referral_tree()
RETURNS TABLE (
  id            UUID,
  full_name     TEXT,
  referral_code TEXT,
  status        TEXT,
  parent_id     UUID,
  depth         INT,
  created_at    TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_root UUID := auth.uid();
BEGIN
  RETURN QUERY
    WITH RECURSIVE tree AS (
      SELECT
        u.id,
        u.full_name,
        u.referral_code,
        u.status,
        u.invited_by AS parent_id,
        1 AS depth,
        u.created_at
      FROM public.users u
      WHERE u.invited_by = v_root
        AND u.status = 'active'
        AND u.current_package_level IS NOT NULL

      UNION ALL

      SELECT
        child.id,
        child.full_name,
        child.referral_code,
        child.status,
        child.invited_by,
        parent.depth + 1,
        child.created_at
      FROM public.users child
      JOIN tree parent ON child.invited_by = parent.id
      WHERE parent.depth + 1 <= 6
        AND child.status = 'active'
        AND child.current_package_level IS NOT NULL
    )
    SELECT * FROM tree;
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_submit_investment_withdrawal(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_referral_tree() TO authenticated;
