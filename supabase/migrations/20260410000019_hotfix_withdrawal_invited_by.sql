-- ============================================================
-- Hotfix: user_submit_withdrawal — fix column name referred_by → invited_by
-- ============================================================
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

  -- Commission logic
  IF v_subscribed_at IS NOT NULL
     AND now() <= (v_subscribed_at + INTERVAL '1 month') THEN
    v_fee_pct := 0;  -- free first month
  ELSE
    -- Uses correct column name: invited_by
    SELECT COUNT(*)
      INTO v_direct_count
      FROM public.users
      WHERE invited_by = v_caller_id
      LIMIT 1;

    IF v_direct_count >= 1 THEN
      v_fee_pct := 0;      -- has referrals → free
    ELSE
      v_fee_pct := 0.30;   -- no referrals → 30% fee
    END IF;
  END IF;

  v_fee_amount := ROUND(p_amount * v_fee_pct, 2);
  v_net_amount := p_amount - v_fee_amount;

  IF v_wallet_balance < p_amount THEN
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
