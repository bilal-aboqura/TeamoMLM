-- ============================================================
-- Migration: App Downloads Profit
-- Feature: 013-app-downloads-profit
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
    'investment_withdrawal',
    'app_profit_submission',
    'app_profit_withdrawal'
  ));

INSERT INTO storage.buckets (id, name, public)
VALUES ('app-profit-proofs', 'app-profit-proofs', false)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE public.app_profit_offers (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT          NOT NULL CHECK (char_length(title) BETWEEN 2 AND 120),
  download_url  TEXT          NOT NULL,
  reward_usd    NUMERIC(10,2) NOT NULL CHECK (reward_usd > 0),
  provider      TEXT          NOT NULL CHECK (char_length(provider) BETWEEN 2 AND 80),
  required_tier TEXT          NOT NULL DEFAULT 'none',
  is_active     BOOLEAN       NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TRIGGER app_profit_offers_updated_at
  BEFORE UPDATE ON public.app_profit_offers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_app_profit_offers_active
  ON public.app_profit_offers (is_active, required_tier, created_at DESC);

ALTER TABLE public.app_profit_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_profit_offers_select_active" ON public.app_profit_offers
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "app_profit_offers_admin_all" ON public.app_profit_offers
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE TABLE public.user_isolated_wallets (
  user_id             UUID          PRIMARY KEY REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  app_profits_balance NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (app_profits_balance >= 0),
  other_tasks_balance NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (other_tasks_balance >= 0),
  deposit_balance     NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (deposit_balance >= 0),
  app_package_amount  NUMERIC(10,2) CHECK (app_package_amount IN (200,300,400,500,600) OR app_package_amount IS NULL),
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TRIGGER user_isolated_wallets_updated_at
  BEFORE UPDATE ON public.user_isolated_wallets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.user_isolated_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_isolated_wallets_select_own" ON public.user_isolated_wallets
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "user_isolated_wallets_admin_all" ON public.user_isolated_wallets
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE TABLE public.app_profit_submissions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id         UUID        NOT NULL REFERENCES public.app_profit_offers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  user_id          UUID        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  screenshot_url   TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'pending_review'
                            CHECK (status IN ('pending_review', 'approved', 'rejected')),
  rejection_reason TEXT,
  reviewed_at      TIMESTAMPTZ,
  reviewed_by      UUID        REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER app_profit_submissions_updated_at
  BEFORE UPDATE ON public.app_profit_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE UNIQUE INDEX app_profit_submissions_one_active
  ON public.app_profit_submissions (user_id, offer_id)
  WHERE status IN ('pending_review', 'approved');

CREATE INDEX idx_app_profit_submissions_pending
  ON public.app_profit_submissions (created_at ASC)
  WHERE status = 'pending_review';

CREATE INDEX idx_app_profit_submissions_user
  ON public.app_profit_submissions (user_id, created_at DESC);

ALTER TABLE public.app_profit_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_profit_submissions_select_own" ON public.app_profit_submissions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "app_profit_submissions_admin_all" ON public.app_profit_submissions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE TABLE public.app_profit_withdrawals (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID          NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  amount           NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  status           TEXT          NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'rejected')),
  rejection_reason TEXT,
  reviewed_at      TIMESTAMPTZ,
  reviewed_by      UUID          REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TRIGGER app_profit_withdrawals_updated_at
  BEFORE UPDATE ON public.app_profit_withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_app_profit_withdrawals_pending
  ON public.app_profit_withdrawals (created_at ASC)
  WHERE status = 'pending';

CREATE INDEX idx_app_profit_withdrawals_user
  ON public.app_profit_withdrawals (user_id, created_at DESC);

ALTER TABLE public.app_profit_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_profit_withdrawals_select_own" ON public.app_profit_withdrawals
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "app_profit_withdrawals_admin_all" ON public.app_profit_withdrawals
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE OR REPLACE FUNCTION public.app_profit_has_access(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    LEFT JOIN public.user_isolated_wallets w ON w.user_id = u.id
    WHERE u.id = p_user_id
      AND (
        COALESCE(u.leadership_level, 0) >= 1
        OR u.current_package_level IN ('B1', 'B2', 'B3')
        OR w.app_package_amount IN (200, 300, 400, 500, 600)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.user_submit_app_profit_proof(
  p_offer_id UUID,
  p_screenshot_url TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_offer RECORD;
  v_submission_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  IF NOT public.app_profit_has_access(v_user_id) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  SELECT id, reward_usd INTO v_offer
  FROM public.app_profit_offers
  WHERE id = p_offer_id AND is_active = true
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'offer_not_found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.app_profit_submissions
    WHERE user_id = v_user_id
      AND offer_id = p_offer_id
      AND status IN ('pending_review', 'approved')
  ) THEN
    RAISE EXCEPTION 'already_submitted';
  END IF;

  INSERT INTO public.user_isolated_wallets (user_id)
  VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.app_profit_submissions (offer_id, user_id, screenshot_url)
  VALUES (p_offer_id, v_user_id, p_screenshot_url)
  RETURNING id INTO v_submission_id;

  RETURN v_submission_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_approve_app_profit_submission(
  p_submission_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_admin_role TEXT;
  v_row RECORD;
BEGIN
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  SELECT role INTO v_admin_role FROM public.users WHERE id = v_admin_id;
  IF v_admin_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT s.id, s.user_id, s.status, o.reward_usd
  INTO v_row
  FROM public.app_profit_submissions s
  JOIN public.app_profit_offers o ON o.id = s.offer_id
  WHERE s.id = p_submission_id
  FOR UPDATE OF s;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  IF v_row.status != 'pending_review' THEN
    RAISE EXCEPTION 'not_pending';
  END IF;

  INSERT INTO public.user_isolated_wallets (user_id)
  VALUES (v_row.user_id)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.app_profit_submissions
  SET status = 'approved', reviewed_at = now(), reviewed_by = v_admin_id
  WHERE id = p_submission_id;

  UPDATE public.user_isolated_wallets
  SET app_profits_balance = app_profits_balance + v_row.reward_usd
  WHERE user_id = v_row.user_id;

  INSERT INTO public.financial_audit_log (record_id, record_type, old_status, new_status, changed_by)
  VALUES (p_submission_id, 'app_profit_submission', 'pending_review', 'approved', v_admin_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_app_profit_submission(
  p_submission_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_admin_role TEXT;
  v_status TEXT;
BEGIN
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  SELECT role INTO v_admin_role FROM public.users WHERE id = v_admin_id;
  IF v_admin_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT status INTO v_status
  FROM public.app_profit_submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  IF v_status != 'pending_review' THEN
    RAISE EXCEPTION 'not_pending';
  END IF;

  UPDATE public.app_profit_submissions
  SET status = 'rejected',
      rejection_reason = p_reason,
      reviewed_at = now(),
      reviewed_by = v_admin_id
  WHERE id = p_submission_id;

  INSERT INTO public.financial_audit_log (record_id, record_type, old_status, new_status, changed_by)
  VALUES (p_submission_id, 'app_profit_submission', 'pending_review', 'rejected', v_admin_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.user_submit_app_profit_withdrawal(
  p_amount NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_balance NUMERIC;
  v_withdrawal_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  IF NOT public.app_profit_has_access(v_user_id) THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  INSERT INTO public.user_isolated_wallets (user_id)
  VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT app_profits_balance INTO v_balance
  FROM public.user_isolated_wallets
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  UPDATE public.user_isolated_wallets
  SET app_profits_balance = app_profits_balance - p_amount
  WHERE user_id = v_user_id;

  INSERT INTO public.app_profit_withdrawals (user_id, amount, status)
  VALUES (v_user_id, p_amount, 'pending')
  RETURNING id INTO v_withdrawal_id;

  INSERT INTO public.financial_audit_log (record_id, record_type, old_status, new_status, changed_by)
  VALUES (v_withdrawal_id, 'app_profit_withdrawal', NULL, 'pending', v_user_id);

  RETURN v_withdrawal_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_mark_app_profit_withdrawal_paid(
  p_withdrawal_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_admin_role TEXT;
  v_status TEXT;
BEGIN
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  SELECT role INTO v_admin_role FROM public.users WHERE id = v_admin_id;
  IF v_admin_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT status INTO v_status
  FROM public.app_profit_withdrawals
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'not_pending';
  END IF;

  UPDATE public.app_profit_withdrawals
  SET status = 'paid', reviewed_at = now(), reviewed_by = v_admin_id
  WHERE id = p_withdrawal_id;

  INSERT INTO public.financial_audit_log (record_id, record_type, old_status, new_status, changed_by)
  VALUES (p_withdrawal_id, 'app_profit_withdrawal', 'pending', 'paid', v_admin_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_app_profit_withdrawal(
  p_withdrawal_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_admin_role TEXT;
  v_row RECORD;
BEGIN
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  SELECT role INTO v_admin_role FROM public.users WHERE id = v_admin_id;
  IF v_admin_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT user_id, amount, status INTO v_row
  FROM public.app_profit_withdrawals
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  IF v_row.status != 'pending' THEN
    RAISE EXCEPTION 'not_pending';
  END IF;

  UPDATE public.app_profit_withdrawals
  SET status = 'rejected',
      rejection_reason = p_reason,
      reviewed_at = now(),
      reviewed_by = v_admin_id
  WHERE id = p_withdrawal_id;

  UPDATE public.user_isolated_wallets
  SET app_profits_balance = app_profits_balance + v_row.amount
  WHERE user_id = v_row.user_id;

  INSERT INTO public.financial_audit_log (record_id, record_type, old_status, new_status, changed_by)
  VALUES (p_withdrawal_id, 'app_profit_withdrawal', 'pending', 'rejected', v_admin_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.app_profit_has_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_submit_app_profit_proof(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_app_profit_submission(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_app_profit_submission(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_submit_app_profit_withdrawal(NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_mark_app_profit_withdrawal_paid(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_app_profit_withdrawal(UUID, TEXT) TO authenticated;
