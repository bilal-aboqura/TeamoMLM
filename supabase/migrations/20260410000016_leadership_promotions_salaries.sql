-- ============================================================
-- Migration: Leadership Promotions & Bi-weekly Salaries
-- Date: 2026-04-10
-- ============================================================
-- Implements the client's business model:
--   - Leadership promotion engine (evaluate_and_promote_leaders)
--   - One-time promotion rewards + bi-weekly leader salaries
--   - salary_and_rewards_log audit trail
-- ============================================================


-- ============================================================
-- Step 1: Add last_salary_paid_at to users
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_salary_paid_at TIMESTAMPTZ;

COMMENT ON COLUMN public.users.last_salary_paid_at IS
  'Timestamp of the most recent bi-weekly salary payment. NULL = never paid.';


-- ============================================================
-- Step 2: Create salary_and_rewards_log table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.salary_and_rewards_log (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID          NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  amount            NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  type              TEXT          NOT NULL CHECK (type IN ('reward', 'salary')),
  leadership_level  INT           NOT NULL CHECK (leadership_level BETWEEN 1 AND 6),
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

ALTER TABLE public.salary_and_rewards_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'salary_and_rewards_log' AND policyname = 'salary_log_select_own'
  ) THEN
    CREATE POLICY salary_log_select_own
      ON public.salary_and_rewards_log
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Prevent duplicate one-time rewards for the same user + level.
-- Salaries (type = 'salary') are allowed to repeat every 15 days.
CREATE UNIQUE INDEX IF NOT EXISTS salary_log_reward_unique
  ON public.salary_and_rewards_log (user_id, type, leadership_level)
  WHERE type = 'reward';

CREATE INDEX IF NOT EXISTS idx_salary_log_user_type
  ON public.salary_and_rewards_log (user_id, type);

COMMENT ON TABLE public.salary_and_rewards_log IS
  'Audit log for one-time promotion rewards and bi-weekly leader salary payments.';


-- ============================================================
-- Step 3: Extend financial_audit_log record_type constraint
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
    'leadership_salary'
  ));


-- ============================================================
-- Step 4: evaluate_and_promote_leaders() RPC
--
-- Scans all active users and updates leadership_level (1-6)
-- based strictly on the client's business model conditions.
-- Returns the number of users who were promoted.
--
-- Promotion is ONE-WAY (only upward). A user's level is set to
-- the HIGHEST rank whose condition they meet. If they no longer
-- meet a condition for their current rank, they KEEP their rank.
-- ============================================================

CREATE OR REPLACE FUNCTION public.evaluate_and_promote_leaders()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id        UUID;
  v_current_level  INT;
  v_new_level      INT;
  v_direct_count   INT;
  v_team_l1_l3     INT;
  v_team_l1_l4     INT;
  v_leader_l1      INT;
  v_leader_l3      INT;
  v_leader_l4      INT;
  v_leader_l5      INT;
  v_pkg            TEXT;
  v_promoted       INT := 0;
BEGIN
  FOR v_user_id, v_current_level, v_pkg IN
    SELECT id, COALESCE(leadership_level, 0), current_package_level
      FROM public.users
      WHERE status = 'active'
  LOOP
    -- --------------------------------------------------------
    -- Metric A: Direct referrals count (depth = 1)
    -- --------------------------------------------------------
    SELECT COUNT(*) INTO v_direct_count
      FROM public.users
      WHERE invited_by = v_user_id;

    -- --------------------------------------------------------
    -- Metric B: Total team size in depths 1-3
    -- --------------------------------------------------------
    WITH RECURSIVE tree AS (
      SELECT id, 1 AS depth
        FROM public.users
        WHERE invited_by = v_user_id
      UNION ALL
      SELECT c.id, t.depth + 1
        FROM public.users c
        JOIN tree t ON c.invited_by = t.id
        WHERE t.depth < 3
    )
    SELECT COUNT(*) INTO v_team_l1_l3 FROM tree;

    -- --------------------------------------------------------
    -- Metric C: Total team size in depths 1-4
    -- --------------------------------------------------------
    WITH RECURSIVE tree AS (
      SELECT id, 1 AS depth
        FROM public.users
        WHERE invited_by = v_user_id
      UNION ALL
      SELECT c.id, t.depth + 1
        FROM public.users c
        JOIN tree t ON c.invited_by = t.id
        WHERE t.depth < 4
    )
    SELECT COUNT(*) INTO v_team_l1_l4 FROM tree;

    -- --------------------------------------------------------
    -- Metric D: Direct referrals at specific leadership levels
    -- --------------------------------------------------------
    SELECT COUNT(*) INTO v_leader_l1
      FROM public.users
      WHERE invited_by = v_user_id
        AND leadership_level IS NOT NULL
        AND leadership_level >= 1;

    SELECT COUNT(*) INTO v_leader_l3
      FROM public.users
      WHERE invited_by = v_user_id
        AND leadership_level IS NOT NULL
        AND leadership_level >= 3;

    SELECT COUNT(*) INTO v_leader_l4
      FROM public.users
      WHERE invited_by = v_user_id
        AND leadership_level IS NOT NULL
        AND leadership_level >= 4;

    SELECT COUNT(*) INTO v_leader_l5
      FROM public.users
      WHERE invited_by = v_user_id
        AND leadership_level IS NOT NULL
        AND leadership_level >= 5;

    -- --------------------------------------------------------
    -- Evaluate conditions (highest to lowest).
    -- New level = MAX(current, highest qualified rank).
    -- --------------------------------------------------------
    v_new_level := v_current_level;

    -- Level 6 (Qaid-6): 2 Leaders of Level 5 OR 150 total in L1-L4
    IF v_leader_l5 >= 2 OR v_team_l1_l4 >= 150 THEN
      v_new_level := GREATEST(v_new_level, 6);
    END IF;

    -- Level 5 (Qaid-5): 2 Leaders of Level 4 OR 85 total in L1-L3
    IF v_leader_l4 >= 2 OR v_team_l1_l3 >= 85 THEN
      v_new_level := GREATEST(v_new_level, 5);
    END IF;

    -- Level 4 (Qaid-4): 3 Leaders of Level 3 OR 42 total in L1-L3
    IF v_leader_l3 >= 3 OR v_team_l1_l3 >= 42 THEN
      v_new_level := GREATEST(v_new_level, 4);
    END IF;

    -- Level 3 (Qaid-3): 25 total in L1-L4 OR owns package A2+
    IF v_team_l1_l4 >= 25 OR v_pkg IN ('A2','A3','B1','B2','B3') THEN
      v_new_level := GREATEST(v_new_level, 3);
    END IF;

    -- Level 2 (Qaid-2): 2 Leaders of Level 1 OR 10 total in L1-L3
    IF v_leader_l1 >= 2 OR v_team_l1_l3 >= 10 THEN
      v_new_level := GREATEST(v_new_level, 2);
    END IF;

    -- Level 1 (Qaid-1): 4 direct members
    IF v_direct_count >= 4 THEN
      v_new_level := GREATEST(v_new_level, 1);
    END IF;

    -- --------------------------------------------------------
    -- Persist if promoted
    -- --------------------------------------------------------
    IF v_new_level > v_current_level THEN
      UPDATE public.users
        SET leadership_level = v_new_level
        WHERE id = v_user_id;
      v_promoted := v_promoted + 1;
    END IF;
  END LOOP;

  RETURN v_promoted;
END;
$$;


-- ============================================================
-- Step 5: process_biweekly_salaries() RPC
--
-- Execution flow:
--   1. Call evaluate_and_promote_leaders() to update ranks.
--   2. Credit one-time rewards for each NEW level attained.
--   3. Credit bi-weekly salaries for all active leaders whose
--      last_salary_paid_at is NULL or > 15 days ago.
--
-- Returns a JSONB summary for the admin UI.
--
-- Financial rules per rank (fixed-dollar amounts):
--   Qaid-1: Reward $20  | Salary $10
--   Qaid-2: Reward $45  | Salary $20
--   Qaid-3: Reward $70  | Salary $35
--   Qaid-4: Reward $130 | Salary $70
--   Qaid-5: Reward $250 | Salary $130
--   Qaid-6: Reward $500 | Salary $300
-- ============================================================

CREATE OR REPLACE FUNCTION public.process_biweekly_salaries()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_promoted        INT;
  v_rewards_paid    INT := 0;
  v_salaries_paid   INT := 0;
  v_total_reward    NUMERIC(12,2) := 0;
  v_total_salary    NUMERIC(12,2) := 0;

  -- Loop variables
  v_uid             UUID;
  v_old_lvl         INT;
  v_new_lvl         INT;
  v_lvl             INT;
  v_amount          NUMERIC(12,2);
  v_log_type        TEXT;

  -- Financial config (fixed-dollar, per client spec)
  v_config          JSONB := '{
    "1": {"reward": 20,  "salary": 10},
    "2": {"reward": 45,  "salary": 20},
    "3": {"reward": 70,  "salary": 35},
    "4": {"reward": 130, "salary": 70},
    "5": {"reward": 250, "salary": 130},
    "6": {"reward": 500, "salary": 300}
  }';

BEGIN
  -- ============================================================
  -- Phase 1: Snapshot current levels, then promote
  -- ============================================================
  CREATE TEMP TABLE _pre_promo_levels (
    user_id  UUID PRIMARY KEY,
    old_level INT NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO _pre_promo_levels (user_id, old_level)
    SELECT id, COALESCE(leadership_level, 0)
      FROM public.users;

  SELECT * INTO v_promoted FROM public.evaluate_and_promote_leaders();

  -- ============================================================
  -- Phase 2: One-time rewards for each NEW level crossed
  -- ============================================================
  FOR v_uid, v_old_lvl, v_new_lvl IN
    SELECT u.id,
           p.old_level,
           COALESCE(u.leadership_level, 0)
      FROM public.users u
      JOIN _pre_promo_levels p ON p.user_id = u.id
      WHERE COALESCE(u.leadership_level, 0) > p.old_level
  LOOP
    FOR v_lvl IN SELECT generate_series(v_old_lvl + 1, v_new_lvl) LOOP
      -- Idempotency: skip if reward already paid for this user+level
      IF EXISTS (
        SELECT 1 FROM public.salary_and_rewards_log
        WHERE user_id = v_uid AND type = 'reward' AND leadership_level = v_lvl
      ) THEN
        CONTINUE;
      END IF;

      v_amount := (v_config->v_lvl->>'reward')::NUMERIC;
      IF v_amount IS NULL OR v_amount <= 0 THEN
        CONTINUE;
      END IF;

      -- Credit wallet
      UPDATE public.users
        SET wallet_balance = wallet_balance + v_amount,
            total_earned   = total_earned   + v_amount
        WHERE id = v_uid;

      -- Log the reward
      INSERT INTO public.salary_and_rewards_log (user_id, amount, type, leadership_level)
        VALUES (v_uid, v_amount, 'reward', v_lvl);

      -- Audit trail
      INSERT INTO public.financial_audit_log (record_id, record_type, old_status, new_status, changed_by)
        VALUES (v_uid, 'leadership_reward',
                'level_' || (v_lvl - 1), 'level_' || v_lvl,
                '00000000-0000-0000-0000-000000000000');

      v_rewards_paid := v_rewards_paid + 1;
      v_total_reward := v_total_reward + v_amount;
    END LOOP;
  END LOOP;

  -- ============================================================
  -- Phase 3: Bi-weekly salaries for all active leaders
  -- ============================================================
  FOR v_uid, v_new_lvl IN
    SELECT id, leadership_level
      FROM public.users
      WHERE leadership_level IS NOT NULL
        AND leadership_level > 0
        AND status = 'active'
        AND (
          last_salary_paid_at IS NULL
          OR last_salary_paid_at < NOW() - INTERVAL '15 days'
        )
  LOOP
    v_amount := (v_config->v_new_lvl->>'salary')::NUMERIC;
    IF v_amount IS NULL OR v_amount <= 0 THEN
      CONTINUE;
    END IF;

    -- Credit wallet + update salary timestamp
    UPDATE public.users
      SET wallet_balance      = wallet_balance + v_amount,
          total_earned        = total_earned + v_amount,
          last_salary_paid_at = NOW()
      WHERE id = v_uid;

    -- Log the salary
    INSERT INTO public.salary_and_rewards_log (user_id, amount, type, leadership_level)
      VALUES (v_uid, v_amount, 'salary', v_new_lvl);

    -- Audit trail
    INSERT INTO public.financial_audit_log (record_id, record_type, old_status, new_status, changed_by)
      VALUES (v_uid, 'leadership_salary', 'pending', 'approved',
              '00000000-0000-0000-0000-000000000000');

    v_salaries_paid := v_salaries_paid + 1;
    v_total_salary  := v_total_salary + v_amount;
  END LOOP;

  -- ============================================================
  -- Return summary for admin UI
  -- ============================================================
  RETURN jsonb_build_object(
    'promoted',       v_promoted,
    'rewards_paid',   v_rewards_paid,
    'salaries_paid',  v_salaries_paid,
    'total_reward',   v_total_reward,
    'total_salary',   v_total_salary
  );
END;
$$;
