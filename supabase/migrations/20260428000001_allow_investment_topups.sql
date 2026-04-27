-- Allow users to submit a new investment deposit after the previous one is approved.
-- Only one pending investment deposit should be blocked at a time.

DROP INDEX IF EXISTS public.investment_deposits_one_active_or_pending;

CREATE UNIQUE INDEX IF NOT EXISTS investment_deposits_one_pending
  ON public.investment_deposits (user_id)
  WHERE status = 'pending';

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
    AND status = 'pending'
  LIMIT 1
  FOR UPDATE;

  IF v_existing IS NOT NULL THEN
    RAISE EXCEPTION 'pending_deposit_exists';
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
