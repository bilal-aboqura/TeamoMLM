-- ============================================================
-- Migration: Packages + Commission Matrix Overhaul
-- Replaces percentage-based commissions with fixed-dollar matrix
-- ============================================================

-- ============================================================
-- Step 1: Re-seed packages with exact A1–B3 specs
-- ============================================================
-- Deactivate old packages and insert new ones with correct values.
-- We use ON CONFLICT (name) DO UPDATE so existing FK references stay valid.

UPDATE public.packages SET is_active = false;

INSERT INTO public.packages (name, price, daily_task_count, daily_profit, display_order, is_active)
VALUES
  ('A1', 200.00,  3, 3.33, 1, true),
  ('A2', 400.00,  3, 6.66, 2, true),
  ('A3', 600.00,  3, 10.00, 3, true),
  ('B1', 1200.00, 4, 20.00, 4, true),
  ('B2', 1800.00, 4, 30.00, 5, true),
  ('B3', 2500.00, 4, 41.66, 6, true)
ON CONFLICT (name) DO UPDATE SET
  price            = EXCLUDED.price,
  daily_task_count = EXCLUDED.daily_task_count,
  daily_profit     = EXCLUDED.daily_profit,
  display_order    = EXCLUDED.display_order,
  is_active        = EXCLUDED.is_active;


-- ============================================================
-- Step 2: Overhaul referral_commission_rates to fixed-dollar matrix
-- ============================================================
-- Old format: {"L1": 0.05, "L2": 0.03, ...}  (percentages)
-- New format: {"A1": {"L1": 35, "L2": 17, ...}, "A2": {...}, ...}
-- Values are now FIXED DOLLAR AMOUNTS, not percentages.

UPDATE public.admin_settings
SET referral_commission_rates = '{
  "A1": {"L1": 35, "L2": 17, "L3": 12, "L4": 8, "L5": 5, "L6": 5},
  "A2": {"L1": 60, "L2": 25, "L3": 17, "L4": 12, "L5": 5, "L6": 5},
  "A3": {"L1": 90, "L2": 35, "L3": 21, "L4": 14, "L5": 5, "L6": 5},
  "B1": {"L1": 140, "L2": 85, "L3": 35, "L4": 20, "L5": 9, "L6": 9},
  "B2": {"L1": 220, "L2": 125, "L3": 90, "L4": 30, "L5": 15, "L6": 15},
  "B3": {"L1": 350, "L2": 175, "L3": 100, "L4": 32, "L5": 18, "L6": 18}
}'::jsonb;

COMMENT ON COLUMN public.admin_settings.referral_commission_rates IS
  'Fixed-dollar commission matrix. Top-level key = package name (A1–B3). Each value is {"L1": dollar_amount, ...} for levels 1–6.';


-- ============================================================
-- Step 3: Alter referral_commissions table
--   - Drop commission_rate (percentage) column
--   - Add commission_tier (package name) column for audit clarity
-- ============================================================
ALTER TABLE public.referral_commissions
  DROP COLUMN IF EXISTS commission_rate;

ALTER TABLE public.referral_commissions
  ADD COLUMN IF NOT EXISTS commission_tier TEXT;


-- ============================================================
-- Step 4: Rewrite distribute_referral_commissions RPC
--   Now looks up fixed-dollar amount by package name from the matrix
-- ============================================================
CREATE OR REPLACE FUNCTION public.distribute_referral_commissions(
  p_request_id         UUID,
  p_depositing_user_id UUID,
  p_package_name       TEXT,
  p_admin_id           UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ancestor_id     UUID  := p_depositing_user_id;
  v_ancestor_status TEXT;
  v_level           INT   := 1;
  v_commission      NUMERIC;
  v_rates           JSONB;
  v_pkg_rates       JSONB;
  v_inserted        INT;
BEGIN
  PERFORM 1
    FROM public.user_referral_stats
    WHERE user_id = p_depositing_user_id
    FOR UPDATE;

  IF EXISTS (
    SELECT 1 FROM public.referral_commissions
    WHERE depositing_user_id = p_depositing_user_id
  ) THEN
    RETURN;
  END IF;

  SELECT referral_commission_rates INTO v_rates
    FROM public.admin_settings
    LIMIT 1;

  v_pkg_rates := v_rates->p_package_name;

  IF v_pkg_rates IS NULL THEN
    RETURN;
  END IF;

  WHILE v_level <= 6 LOOP
    SELECT u.invited_by, u.status
      INTO v_ancestor_id, v_ancestor_status
      FROM public.users u
      WHERE u.id = v_ancestor_id;

    IF v_ancestor_id IS NULL THEN
      EXIT;
    END IF;

    IF v_ancestor_status = 'suspended' THEN
      v_level := v_level + 1;
      CONTINUE;
    END IF;

    v_commission := COALESCE((v_pkg_rates->>CONCAT('L', v_level))::NUMERIC, 0);

    IF v_commission > 0 THEN
      INSERT INTO public.referral_commissions
        (beneficiary_id, depositing_user_id, deposit_request_id,
         upline_level, deposit_amount, commission_tier, commission_amount)
      VALUES
        (v_ancestor_id, p_depositing_user_id, p_request_id,
         v_level, 0, p_package_name, v_commission)
      ON CONFLICT (depositing_user_id, upline_level) DO NOTHING;

      GET DIAGNOSTICS v_inserted = ROW_COUNT;

      IF v_inserted > 0 THEN
        UPDATE public.users
          SET wallet_balance = wallet_balance + v_commission,
              total_earned   = total_earned   + v_commission
          WHERE id = v_ancestor_id;

        UPDATE public.user_referral_stats
          SET total_earnings  = total_earnings + v_commission,
              last_updated_at = now()
          WHERE user_id = v_ancestor_id;

        INSERT INTO public.financial_audit_log
          (record_id, record_type, old_status, new_status, changed_by)
        VALUES
          (p_request_id, 'referral_commission', 'pending', 'approved', p_admin_id);
      END IF;
    END IF;

    v_level := v_level + 1;
  END LOOP;
END;
$$;


-- ============================================================
-- Step 5: Rewrite admin_approve_deposit — pass package NAME
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_approve_deposit(
  p_request_id UUID,
  p_admin_id   UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_row           RECORD;
  v_package_name  TEXT;
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

  PERFORM public.distribute_referral_commissions(
    p_request_id,
    v_row.user_id,
    v_package_name,
    p_admin_id
  );
END;
$$;


-- ============================================================
-- Step 6: Fix financial_audit_log constraint to include all types
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
    'manual_adjustment'
  ));
