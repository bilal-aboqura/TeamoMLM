-- ============================================================
-- Migration: User Referrals Module
-- Feature: 007-user-referrals-tree
-- ============================================================
-- T001: packages.price column EXISTS (NUMERIC(10,2) NOT NULL CHECK (price > 0))
--       Confirmed in 20260402000003_create_packages_table.sql line 9.
--       No ALTER TABLE needed for packages.
-- ============================================================
-- Steps:
--   A1 — Extend financial_audit_log record_type constraint
--   A2 — Add referral_commission_rates to admin_settings
--   A3 — Create user_referral_stats table + RLS + seed
--   A4 — Create referral_commissions table + RLS + unique constraint
--   A5 — Trigger: propagate stats on new user registration
--   A6 — distribute_referral_commissions RPC
--   A7 — Amend admin_approve_deposit to call commission distribution
--   A8 — get_my_referral_tree user-scoped RPC
-- ============================================================


-- ============================================================
-- A1: Extend financial_audit_log.record_type CHECK constraint
--     Pattern: 20260406000010_create_withdrawal_requests.sql lines 7-16
-- ============================================================
ALTER TABLE public.financial_audit_log
  DROP CONSTRAINT financial_audit_log_record_type_check;

ALTER TABLE public.financial_audit_log
  ADD CONSTRAINT financial_audit_log_record_type_check
  CHECK (record_type IN (
    'package_subscription_request',
    'task_completion_log',
    'withdrawal_request',
    'referral_commission'
  ));


-- ============================================================
-- A2: Add commission rates config to admin_settings
-- ============================================================
ALTER TABLE public.admin_settings
  ADD COLUMN IF NOT EXISTS referral_commission_rates JSONB NOT NULL
  DEFAULT '{"L1":0.05,"L2":0.03,"L3":0.02,"L4":0.01,"L5":0.005,"L6":0.005}';

COMMENT ON COLUMN public.admin_settings.referral_commission_rates IS
  'Per-level referral commission rates. Keys: L1–L6. Values are decimal fractions (e.g. 0.05 = 5%).';


-- ============================================================
-- A3: Create user_referral_stats snapshot table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_referral_stats (
  user_id         UUID          PRIMARY KEY REFERENCES public.users(id) ON DELETE RESTRICT,
  direct_count    INT           NOT NULL DEFAULT 0 CHECK (direct_count >= 0),
  total_team_size INT           NOT NULL DEFAULT 0 CHECK (total_team_size >= 0),
  total_earnings  NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_earnings >= 0),
  last_updated_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);

ALTER TABLE public.user_referral_stats ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_referral_stats' AND policyname = 'stats_select_own'
  ) THEN
    CREATE POLICY stats_select_own
      ON public.user_referral_stats
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Seed existing users
INSERT INTO public.user_referral_stats (user_id)
  SELECT id FROM public.users
  ON CONFLICT (user_id) DO NOTHING;


-- ============================================================
-- A4: Create referral_commissions table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.referral_commissions (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiary_id      UUID          NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  depositing_user_id  UUID          NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  deposit_request_id  UUID          NOT NULL REFERENCES public.package_subscription_requests(id) ON DELETE RESTRICT,
  upline_level        SMALLINT      NOT NULL CHECK (upline_level BETWEEN 1 AND 6),
  deposit_amount      NUMERIC(12,2) NOT NULL CHECK (deposit_amount > 0),
  commission_rate     NUMERIC(6,4)  NOT NULL CHECK (commission_rate BETWEEN 0 AND 1),
  commission_amount   NUMERIC(12,2) NOT NULL CHECK (commission_amount >= 0),
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE (depositing_user_id, upline_level)
);

ALTER TABLE public.referral_commissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'referral_commissions' AND policyname = 'referral_commissions_select_own'
  ) THEN
    CREATE POLICY referral_commissions_select_own
      ON public.referral_commissions
      FOR SELECT
      USING (auth.uid() = beneficiary_id);
  END IF;
END $$;


-- ============================================================
-- A5: Trigger — propagate stats on new user registration
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_for_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ancestor_id UUID;
  v_level       INT;
BEGIN
  INSERT INTO public.user_referral_stats (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

  IF NEW.invited_by IS NOT NULL THEN
    v_ancestor_id := NEW.invited_by;
    v_level := 1;

    WHILE v_ancestor_id IS NOT NULL AND v_level <= 6 LOOP
      -- Lock the ancestor's stats row before updating to prevent lost-update
      -- race conditions when multiple users register concurrently under the same referrer.
      PERFORM 1
        FROM public.user_referral_stats
        WHERE user_id = v_ancestor_id
        FOR UPDATE;

      IF v_level = 1 THEN
        UPDATE public.user_referral_stats
          SET direct_count = direct_count + 1,
              total_team_size = total_team_size + 1,
              last_updated_at = now()
          WHERE user_id = v_ancestor_id;
      ELSE
        UPDATE public.user_referral_stats
          SET total_team_size = total_team_size + 1,
              last_updated_at = now()
          WHERE user_id = v_ancestor_id;
      END IF;

      SELECT invited_by INTO v_ancestor_id
        FROM public.users
        WHERE id = v_ancestor_id;

      v_level := v_level + 1;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE event_object_schema = 'public' AND event_object_table = 'users' AND trigger_name = 'trg_stats_on_new_user'
  ) THEN
    CREATE TRIGGER trg_stats_on_new_user
      AFTER INSERT ON public.users
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_user_for_stats();
  END IF;
END $$;


-- ============================================================
-- A6: distribute_referral_commissions RPC
--
-- Security: SECURITY DEFINER — only called from admin_approve_deposit.
-- Atomicity: Locks depositing user stats row (FOR UPDATE) to serialize
--            concurrent calls. ON CONFLICT DO NOTHING + GET DIAGNOSTICS
--            prevents double-wallet-credit even if the unique constraint fires.
-- Suspension: Skips suspended ancestors but does NOT break the chain —
--             deeper levels still receive their commission (per spec FR-002b).
-- Precision:  ROUND(..., 2) prevents floating-point dust in wallet balances.
-- ============================================================
CREATE OR REPLACE FUNCTION public.distribute_referral_commissions(
  p_request_id         UUID,
  p_depositing_user_id UUID,
  p_deposit_amount     NUMERIC,
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
  v_rate            NUMERIC;
  v_commission      NUMERIC;
  v_rates           JSONB;
  v_inserted        INT;
BEGIN
  -- Serialize concurrent calls for the same depositing user.
  -- A second concurrent call blocks here until the first finishes,
  -- then the idempotency check below detects existing rows and exits.
  PERFORM 1
    FROM public.user_referral_stats
    WHERE user_id = p_depositing_user_id
    FOR UPDATE;

  -- Idempotency guard: commissions already exist → not a first deposit → exit.
  IF EXISTS (
    SELECT 1 FROM public.referral_commissions
    WHERE depositing_user_id = p_depositing_user_id
  ) THEN
    RETURN;
  END IF;

  SELECT referral_commission_rates INTO v_rates
    FROM public.admin_settings
    LIMIT 1;

  WHILE v_level <= 6 LOOP
    -- Fetch next ancestor AND their status in a single query.
    SELECT u.invited_by, u.status
      INTO v_ancestor_id, v_ancestor_status
      FROM public.users u
      WHERE u.id = v_ancestor_id;

    IF v_ancestor_id IS NULL THEN
      EXIT; -- No more upline; stop traversal.
    END IF;

    -- Skip credit for suspended ancestors but CONTINUE traversal —
    -- L3 still earns even if L2 is suspended.
    IF v_ancestor_status = 'suspended' THEN
      v_level := v_level + 1;
      CONTINUE;
    END IF;

    v_rate := (v_rates->>CONCAT('L', v_level))::NUMERIC;

    IF v_rate IS NULL OR v_rate = 0 THEN
      v_level := v_level + 1;
      CONTINUE;
    END IF;

    -- ROUND to 2dp to prevent floating-point dust in balances.
    v_commission := ROUND(p_deposit_amount * v_rate, 2);

    IF v_commission > 0 THEN
      -- ON CONFLICT DO NOTHING: unique constraint violation is a silent no-op,
      -- not a transaction-crashing exception.
      INSERT INTO public.referral_commissions
        (beneficiary_id, depositing_user_id, deposit_request_id,
         upline_level, deposit_amount, commission_rate, commission_amount)
      VALUES
        (v_ancestor_id, p_depositing_user_id, p_request_id,
         v_level, p_deposit_amount, v_rate, v_commission)
      ON CONFLICT (depositing_user_id, upline_level) DO NOTHING;

      GET DIAGNOSTICS v_inserted = ROW_COUNT;

      -- Credit wallet only if the INSERT actually wrote a row.
      -- This prevents double-crediting on a conflict.
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
-- A7: Amend admin_approve_deposit — add commission distribution
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
  v_row             RECORD;
  v_package_name    TEXT;
  v_deposit_amount  NUMERIC;
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

  SELECT name, price INTO v_package_name, v_deposit_amount
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

  -- Always call; idempotency and first-deposit enforcement are handled
  -- atomically inside distribute_referral_commissions via FOR UPDATE + EXISTS check.
  PERFORM public.distribute_referral_commissions(
    p_request_id,
    v_row.user_id,
    v_deposit_amount,
    p_admin_id
  );
END;
$$;


-- ============================================================
-- A8: get_my_referral_tree — user-scoped RPC
-- ============================================================
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
    )
    SELECT * FROM tree;
END;
$$;
