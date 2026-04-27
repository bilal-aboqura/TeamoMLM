-- ============================================================
-- Migration: Pay Later Package Upgrades
-- Feature: Dashboard pay-later activation, debt, repayment, locks
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS pay_later_manual_eligible BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pay_later_fee_pct NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS pay_later_penalty_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00;

COMMENT ON COLUMN public.users.pay_later_manual_eligible IS
  'Admin override: user passed activity evaluation for pay-later even without 30 approved work days.';
COMMENT ON COLUMN public.users.pay_later_fee_pct IS
  'Repayment fee percentage for pay-later debt. Allowed business values are 0, 5, and 10.';
COMMENT ON COLUMN public.users.pay_later_penalty_amount IS
  'Default late penalty amount applied when the user misses the pay-later due date.';

CREATE TABLE IF NOT EXISTS public.pay_later_debts (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID          NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  from_package_id          UUID          NOT NULL REFERENCES public.packages(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  to_package_id            UUID          NOT NULL REFERENCES public.packages(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  from_package_name        TEXT          NOT NULL,
  to_package_name          TEXT          NOT NULL,
  upgrade_amount           NUMERIC(10,2) NOT NULL CHECK (upgrade_amount > 0),
  repayment_fee_pct        NUMERIC(5,2)  NOT NULL DEFAULT 0.00 CHECK (repayment_fee_pct IN (0, 5, 10)),
  repayment_fee_amount     NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (repayment_fee_amount >= 0),
  penalty_amount           NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (penalty_amount >= 0),
  locked_profit            NUMERIC(10,4) NOT NULL DEFAULT 0.00 CHECK (locked_profit >= 0),
  amount_paid              NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (amount_paid >= 0),
  status                  TEXT          NOT NULL DEFAULT 'active'
                                         CHECK (status IN ('active', 'pending_review', 'overdue', 'paid', 'cancelled')),
  repayment_receipt_path   TEXT,
  repayment_submitted_at   TIMESTAMPTZ,
  repayment_rejection_reason TEXT,
  upgraded_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
  due_at                   TIMESTAMPTZ   NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  paid_at                  TIMESTAMPTZ,
  reviewed_at              TIMESTAMPTZ,
  reviewed_by              UUID          REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at               TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ   NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS pay_later_debts_updated_at ON public.pay_later_debts;
CREATE TRIGGER pay_later_debts_updated_at
  BEFORE UPDATE ON public.pay_later_debts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS pay_later_one_open_debt_per_user
  ON public.pay_later_debts (user_id)
  WHERE status IN ('active', 'pending_review', 'overdue');

CREATE INDEX IF NOT EXISTS idx_pay_later_debts_user
  ON public.pay_later_debts (user_id, upgraded_at DESC);

CREATE INDEX IF NOT EXISTS idx_pay_later_debts_review
  ON public.pay_later_debts (repayment_submitted_at ASC)
  WHERE status = 'pending_review';

ALTER TABLE public.pay_later_debts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pay_later_debts'
      AND policyname = 'pay_later_select_own'
  ) THEN
    CREATE POLICY "pay_later_select_own" ON public.pay_later_debts
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pay_later_debts'
      AND policyname = 'pay_later_admin_all'
  ) THEN
    CREATE POLICY "pay_later_admin_all" ON public.pay_later_debts
      FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

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
    'offerwall_submission',
    'pay_later_debt'
  ));

CREATE OR REPLACE FUNCTION public.user_activate_pay_later(
  p_to_package_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id       UUID := auth.uid();
  v_user            RECORD;
  v_from_pkg        RECORD;
  v_to_pkg          RECORD;
  v_approved_days   INT := 0;
  v_upgrade_amount  NUMERIC;
  v_fee_pct         NUMERIC;
  v_debt_id         UUID;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  SELECT id, current_package_level, pay_later_manual_eligible, pay_later_fee_pct
    INTO v_user
    FROM public.users
    WHERE id = v_caller_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  IF v_user.current_package_level IS NULL THEN
    RAISE EXCEPTION 'no_current_package';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.pay_later_debts
    WHERE user_id = v_caller_id
      AND status IN ('active', 'pending_review', 'overdue')
  ) THEN
    RAISE EXCEPTION 'open_debt_exists';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.pay_later_debts
    WHERE user_id = v_caller_id
      AND upgraded_at >= now() - INTERVAL '30 days'
  ) THEN
    RAISE EXCEPTION 'monthly_limit';
  END IF;

  SELECT id, name, price, display_order
    INTO v_from_pkg
    FROM public.packages
    WHERE name = v_user.current_package_level
      AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'current_package_not_found';
  END IF;

  SELECT id, name, price, display_order
    INTO v_to_pkg
    FROM public.packages
    WHERE id = p_to_package_id
      AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'target_package_not_found';
  END IF;

  IF v_to_pkg.display_order != v_from_pkg.display_order + 1 THEN
    RAISE EXCEPTION 'only_next_package';
  END IF;

  SELECT COUNT(*)::INT
    INTO v_approved_days
    FROM (
      SELECT DISTINCT completion_date
      FROM public.task_completion_logs
      WHERE user_id = v_caller_id
        AND status = 'approved'
    ) days;

  IF v_approved_days < 30 AND v_user.pay_later_manual_eligible IS NOT TRUE THEN
    RAISE EXCEPTION 'not_eligible';
  END IF;

  v_upgrade_amount := ROUND(v_to_pkg.price - v_from_pkg.price, 2);
  IF v_upgrade_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_upgrade_amount';
  END IF;

  v_fee_pct := COALESCE(v_user.pay_later_fee_pct, 0);
  IF v_fee_pct NOT IN (0, 5, 10) THEN
    v_fee_pct := 0;
  END IF;

  INSERT INTO public.pay_later_debts (
    user_id,
    from_package_id,
    to_package_id,
    from_package_name,
    to_package_name,
    upgrade_amount,
    repayment_fee_pct,
    repayment_fee_amount,
    status
  )
  VALUES (
    v_caller_id,
    v_from_pkg.id,
    v_to_pkg.id,
    v_from_pkg.name,
    v_to_pkg.name,
    v_upgrade_amount,
    v_fee_pct,
    ROUND(v_upgrade_amount * v_fee_pct / 100, 2),
    'active'
  )
  RETURNING id INTO v_debt_id;

  UPDATE public.users
    SET current_package_level = v_to_pkg.name
    WHERE id = v_caller_id;

  INSERT INTO public.financial_audit_log
    (record_id, record_type, old_status, new_status, changed_by)
  VALUES
    (v_debt_id, 'pay_later_debt', v_from_pkg.name, CONCAT('active:', v_to_pkg.name), v_caller_id);

  RETURN v_debt_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_repay_pay_later_from_wallet(
  p_debt_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id   UUID := auth.uid();
  v_debt        RECORD;
  v_due         NUMERIC;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  SELECT d.*, u.wallet_balance
    INTO v_debt
    FROM public.pay_later_debts d
    JOIN public.users u ON u.id = d.user_id
    WHERE d.id = p_debt_id
      AND d.user_id = v_caller_id
    FOR UPDATE OF d, u;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'debt_not_found';
  END IF;

  IF v_debt.status NOT IN ('active', 'overdue') THEN
    RAISE EXCEPTION 'not_payable';
  END IF;

  v_due := ROUND(
    v_debt.upgrade_amount
      + v_debt.repayment_fee_amount
      + v_debt.penalty_amount
      - v_debt.amount_paid,
    2
  );

  IF v_due <= 0 THEN
    RAISE EXCEPTION 'nothing_due';
  END IF;

  IF v_debt.wallet_balance < v_due THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  UPDATE public.users
    SET wallet_balance = wallet_balance - v_due
    WHERE id = v_caller_id;

  UPDATE public.pay_later_debts
    SET amount_paid = amount_paid + v_due,
        locked_profit = 0,
        status = 'paid',
        paid_at = now(),
        reviewed_at = now(),
        reviewed_by = v_caller_id
    WHERE id = p_debt_id;

  INSERT INTO public.financial_audit_log
    (record_id, record_type, old_status, new_status, changed_by)
  VALUES
    (p_debt_id, 'pay_later_debt', v_debt.status, 'paid_from_wallet', v_caller_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_mark_pay_later_paid_external(
  p_debt_id UUID,
  p_admin_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_debt RECORD;
  v_due  NUMERIC;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users WHERE id = p_admin_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT *
    INTO v_debt
    FROM public.pay_later_debts
    WHERE id = p_debt_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'debt_not_found';
  END IF;

  IF v_debt.status NOT IN ('active', 'pending_review', 'overdue') THEN
    RAISE EXCEPTION 'not_payable';
  END IF;

  v_due := ROUND(
    v_debt.upgrade_amount
      + v_debt.repayment_fee_amount
      + v_debt.penalty_amount
      - v_debt.amount_paid,
    2
  );

  UPDATE public.pay_later_debts
    SET amount_paid = amount_paid + GREATEST(v_due, 0),
        locked_profit = 0,
        status = 'paid',
        paid_at = now(),
        reviewed_at = now(),
        reviewed_by = p_admin_id,
        repayment_rejection_reason = NULL
    WHERE id = p_debt_id;

  INSERT INTO public.financial_audit_log
    (record_id, record_type, old_status, new_status, changed_by)
  VALUES
    (p_debt_id, 'pay_later_debt', v_debt.status, 'paid_external', p_admin_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.process_overdue_pay_later_debts()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row       RECORD;
  v_due       NUMERIC;
  v_deduct    NUMERIC;
  v_processed INT := 0;
BEGIN
  FOR v_row IN
    SELECT d.*, u.wallet_balance, u.pay_later_penalty_amount
    FROM public.pay_later_debts d
    JOIN public.users u ON u.id = d.user_id
    WHERE d.status = 'active'
      AND d.due_at <= now()
    FOR UPDATE OF d, u
  LOOP
    UPDATE public.pay_later_debts
      SET penalty_amount = GREATEST(penalty_amount, COALESCE(v_row.pay_later_penalty_amount, 0))
      WHERE id = v_row.id;

    v_due := ROUND(
      v_row.upgrade_amount
        + v_row.repayment_fee_amount
        + GREATEST(v_row.penalty_amount, COALESCE(v_row.pay_later_penalty_amount, 0))
        - v_row.amount_paid,
      2
    );

    v_deduct := LEAST(v_row.locked_profit, v_due, v_row.wallet_balance);

    IF v_deduct > 0 THEN
      UPDATE public.users
        SET wallet_balance = wallet_balance - v_deduct
        WHERE id = v_row.user_id;
    END IF;

    UPDATE public.pay_later_debts
      SET amount_paid = amount_paid + v_deduct,
          locked_profit = GREATEST(locked_profit - v_deduct, 0),
          status = CASE WHEN v_due - v_deduct <= 0 THEN 'paid' ELSE 'overdue' END,
          paid_at = CASE WHEN v_due - v_deduct <= 0 THEN now() ELSE paid_at END
      WHERE id = v_row.id;

    INSERT INTO public.financial_audit_log
      (record_id, record_type, old_status, new_status, changed_by)
    VALUES
      (v_row.id, 'pay_later_debt', 'active', CONCAT('overdue_processed:', v_deduct), v_row.user_id);

    v_processed := v_processed + 1;
  END LOOP;

  RETURN v_processed;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_approve_task(
  p_log_id UUID,
  p_admin_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row             RECORD;
  v_debt            RECORD;
  v_old_task_profit NUMERIC := 0;
  v_locked_delta    NUMERIC := 0;
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

  SELECT d.*, p.daily_profit, p.daily_task_count
    INTO v_debt
    FROM public.pay_later_debts d
    JOIN public.packages p ON p.id = d.from_package_id
    WHERE d.user_id = v_row.user_id
      AND d.status = 'active'
    FOR UPDATE OF d;

  IF FOUND THEN
    v_old_task_profit := ROUND(v_debt.daily_profit / v_debt.daily_task_count, 4);
    v_locked_delta := GREATEST(v_row.reward_amount_snapshot - v_old_task_profit, 0);
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

  IF v_locked_delta > 0 THEN
    UPDATE public.pay_later_debts
      SET locked_profit = locked_profit + v_locked_delta
      WHERE id = v_debt.id;
  END IF;

  INSERT INTO public.financial_audit_log (record_id, record_type, old_status, new_status, changed_by)
    VALUES (p_log_id, 'task_completion_log', 'pending', 'approved', p_admin_id);
END;
$$;

DROP FUNCTION IF EXISTS public.user_submit_withdrawal(NUMERIC, TEXT);

CREATE OR REPLACE FUNCTION public.user_submit_withdrawal(
  p_amount          NUMERIC,
  p_payment_details TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_id          UUID    := auth.uid();
  v_status             TEXT;
  v_wallet_balance     NUMERIC;
  v_subscribed_at      TIMESTAMPTZ;
  v_locked_profit      NUMERIC := 0;
  v_has_overdue_debt   BOOLEAN := false;
  v_direct_count       BIGINT  := 0;
  v_fee_pct            NUMERIC := 0;
  v_fee_amount         NUMERIC := 0;
  v_net_amount         NUMERIC;
  v_request_id         UUID;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  IF p_amount < 10.00 THEN
    RAISE EXCEPTION 'below_minimum';
  END IF;

  SELECT status, wallet_balance, package_subscribed_at
    INTO v_status, v_wallet_balance, v_subscribed_at
    FROM public.users
    WHERE id = v_caller_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  IF v_status != 'active' THEN
    RAISE EXCEPTION 'suspended';
  END IF;

  SELECT COALESCE(SUM(locked_profit), 0),
         BOOL_OR(status = 'overdue')
    INTO v_locked_profit, v_has_overdue_debt
    FROM public.pay_later_debts
    WHERE user_id = v_caller_id
      AND status IN ('active', 'pending_review', 'overdue');

  IF COALESCE(v_has_overdue_debt, false) THEN
    RAISE EXCEPTION 'pay_later_overdue';
  END IF;

  IF v_subscribed_at IS NOT NULL
     AND now() <= (v_subscribed_at + INTERVAL '1 month') THEN
    v_fee_pct := 0;
  ELSE
    SELECT COUNT(*)
      INTO v_direct_count
      FROM public.users
      WHERE invited_by = v_caller_id
      LIMIT 1;

    IF v_direct_count >= 1 THEN
      v_fee_pct := 0;
    ELSE
      v_fee_pct := 0.30;
    END IF;
  END IF;

  v_fee_amount := ROUND(p_amount * v_fee_pct, 2);
  v_net_amount := p_amount - v_fee_amount;

  IF (v_wallet_balance - v_locked_profit) < p_amount THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  UPDATE public.users
    SET wallet_balance = wallet_balance - p_amount
    WHERE id = v_caller_id;

  INSERT INTO public.withdrawal_requests (user_id, amount, payment_details, status)
    VALUES (v_caller_id, p_amount, p_payment_details, 'pending')
    RETURNING id INTO v_request_id;

  RETURN jsonb_build_object(
    'request_id',  v_request_id,
    'fee_pct',     (v_fee_pct * 100)::INTEGER,
    'fee_amount',  v_fee_amount,
    'net_amount',  v_net_amount
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.user_activate_pay_later(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_repay_pay_later_from_wallet(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_mark_pay_later_paid_external(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_overdue_pay_later_debts() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.user_activate_pay_later(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_repay_pay_later_from_wallet(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_mark_pay_later_paid_external(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_overdue_pay_later_debts() TO service_role;
