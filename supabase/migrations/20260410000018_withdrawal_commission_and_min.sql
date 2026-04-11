-- ============================================================
-- Migration: Withdrawal Commission Logic + Minimum Amount
-- Rules:
--   1. Minimum withdrawal = $10.00
--   2. First calendar month since package_subscribed_at → 0% fee
--   3. After first month:
--        - Has at least 1 direct referral → 0% fee
--        - No referrals                   → 30% fee deducted from amount
-- ============================================================

-- STEP 1: Add package_subscribed_at column to users if missing
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS package_subscribed_at TIMESTAMPTZ NULL;

-- STEP 2: DROP old function first — we are changing the return type from UUID → JSONB
-- (PostgreSQL does not allow CREATE OR REPLACE to change return type)
DROP FUNCTION IF EXISTS public.user_submit_withdrawal(NUMERIC, TEXT);

-- STEP 3: Re-create user_submit_withdrawal with commission-aware logic

CREATE OR REPLACE FUNCTION public.user_submit_withdrawal(
  p_amount          NUMERIC,
  p_payment_details TEXT
)
RETURNS JSONB                  -- returns { request_id, fee_pct, fee_amount, net_amount }
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_id          UUID    := auth.uid();
  v_status             TEXT;
  v_wallet_balance     NUMERIC;
  v_subscribed_at      TIMESTAMPTZ;
  v_direct_count       BIGINT  := 0;
  v_fee_pct            NUMERIC := 0;   -- 0 or 0.30
  v_fee_amount         NUMERIC := 0;
  v_net_amount         NUMERIC;        -- amount actually deducted from wallet
  v_request_id         UUID;
BEGIN
  -- ── Auth guard ──────────────────────────────────────────────
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  -- ── Minimum amount guard ─────────────────────────────────────
  IF p_amount < 10.00 THEN
    RAISE EXCEPTION 'below_minimum';
  END IF;

  -- ── Lock user row ────────────────────────────────────────────
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

  -- ── Commission logic ─────────────────────────────────────────
  -- Phase 1: Is the user still within their first subscription month?
  IF v_subscribed_at IS NOT NULL
     AND now() <= (v_subscribed_at + INTERVAL '1 month') THEN
    v_fee_pct := 0;                                  -- free first month
  ELSE
    -- Phase 2: Does the user have at least 1 direct referral?
    SELECT COUNT(*)
      INTO v_direct_count
      FROM public.users
      WHERE invited_by = v_caller_id
      LIMIT 1;

    IF v_direct_count >= 1 THEN
      v_fee_pct := 0;                                -- loyal referrer → free
    ELSE
      v_fee_pct := 0.30;                             -- no referrals → 30% fee
    END IF;
  END IF;

  -- ── Calculate deduction ──────────────────────────────────────
  -- Fee is taken from the requested amount:
  --   user asks for $100, fee 30% → wallet deducted $130, user receives $70
  -- Wait — common industry pattern: fee is SUBTRACTED from what user receives.
  -- i.e., user requests $100 gross → wallet deducted $100, user gets $70 net.
  -- We store the GROSS amount in the request; net is informational.
  v_fee_amount := ROUND(p_amount * v_fee_pct, 2);
  v_net_amount := p_amount - v_fee_amount;           -- what the user actually receives

  IF v_wallet_balance < p_amount THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  -- ── Atomic debit ─────────────────────────────────────────────
  UPDATE public.users
    SET wallet_balance = wallet_balance - p_amount
    WHERE id = v_caller_id;

  -- ── Insert request with fee metadata ─────────────────────────
  INSERT INTO public.withdrawal_requests (
    user_id, amount, payment_details, status
  )
  VALUES (
    v_caller_id,
    p_amount,             -- gross amount requested
    p_payment_details,
    'pending'
  )
  RETURNING id INTO v_request_id;

  RETURN jsonb_build_object(
    'request_id',  v_request_id,
    'fee_pct',     (v_fee_pct * 100)::INTEGER,   -- 0 or 30
    'fee_amount',  v_fee_amount,
    'net_amount',  v_net_amount
  );
END;
$$;
