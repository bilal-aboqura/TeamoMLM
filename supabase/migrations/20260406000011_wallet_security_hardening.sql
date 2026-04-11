-- ============================================================
-- Migration: Wallet Security Hardening
-- Fixes: C-1 (non-negative balance constraint)
--        H-1 (admin RPCs must verify caller role via auth.uid())
--        H-2 (user RPC must bind to auth.uid(), not a param)
-- ============================================================

-- C-1 FIX: Add non-negative balance constraint as a last-line-of-defense.
-- Even if application logic has a bug or a race slips through, the DB will
-- refuse to commit a negative wallet_balance.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_wallet_balance_non_negative'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_wallet_balance_non_negative
      CHECK (wallet_balance >= 0.00);
  END IF;
END $$;

-- ============================================================
-- H-2 FIX: Replace user_submit_withdrawal
-- Derives the user identity from auth.uid() — never from a caller-supplied param.
-- Also removes the need for the service-role client in the server action.
-- ============================================================
CREATE OR REPLACE FUNCTION public.user_submit_withdrawal(
  p_amount          NUMERIC,
  p_payment_details TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_id      UUID    := auth.uid();
  v_status         TEXT;
  v_wallet_balance NUMERIC;
  v_request_id     UUID;
BEGIN
  -- Reject unauthenticated callers (service_role / anon key bypasses)
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  -- Lock the user row for the duration of this transaction to prevent
  -- concurrent withdrawals from double-spending the same balance.
  SELECT status, wallet_balance
    INTO v_status, v_wallet_balance
    FROM public.users
    WHERE id = v_caller_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  -- Block suspended users at the DB level too (server action checks this too,
  -- but defence-in-depth is critical for financial operations)
  IF v_status != 'active' THEN
    RAISE EXCEPTION 'suspended';
  END IF;

  IF v_wallet_balance < p_amount THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  -- Atomic debit: the users_wallet_balance_non_negative CHECK will reject
  -- this UPDATE if the result is somehow < 0 (belt-and-suspenders).
  UPDATE public.users
    SET wallet_balance = wallet_balance - p_amount
    WHERE id = v_caller_id;

  INSERT INTO public.withdrawal_requests (user_id, amount, payment_details, status)
    VALUES (v_caller_id, p_amount, p_payment_details, 'pending')
    RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

-- ============================================================
-- H-1 FIX: Replace admin_approve_withdrawal
-- Derives admin identity from auth.uid() and verifies the role.
-- Removes the caller-controlled p_admin_id parameter entirely.
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_approve_withdrawal(
  p_request_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_id   UUID := auth.uid();
  v_caller_role TEXT;
  v_user_id     UUID;
  v_amount      NUMERIC;
  v_status      TEXT;
BEGIN
  -- Verify the caller is authenticated
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  -- Verify the caller holds the admin role
  SELECT role INTO v_caller_role FROM public.users WHERE id = v_caller_id;
  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT user_id, amount, status
    INTO v_user_id, v_amount, v_status
    FROM public.withdrawal_requests
    WHERE id = p_request_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'not_pending';
  END IF;

  UPDATE public.withdrawal_requests
    SET status      = 'approved',
        reviewed_at = now(),
        reviewed_by = v_caller_id,
        updated_at  = now()
    WHERE id = p_request_id;

  INSERT INTO public.financial_audit_log (record_id, record_type, old_status, new_status, changed_by)
    VALUES (p_request_id, 'withdrawal_request', 'pending', 'approved', v_caller_id);
END;
$$;

-- ============================================================
-- H-1 FIX: Replace admin_reject_withdrawal
-- Same pattern: auth.uid() + role check instead of p_admin_id param.
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_reject_withdrawal(
  p_request_id UUID,
  p_reason     TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_id   UUID := auth.uid();
  v_caller_role TEXT;
  v_user_id     UUID;
  v_amount      NUMERIC;
  v_status      TEXT;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  SELECT role INTO v_caller_role FROM public.users WHERE id = v_caller_id;
  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT user_id, amount, status
    INTO v_user_id, v_amount, v_status
    FROM public.withdrawal_requests
    WHERE id = p_request_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  IF v_status != 'pending' THEN
    RAISE EXCEPTION 'not_pending';
  END IF;

  UPDATE public.withdrawal_requests
    SET status           = 'rejected',
        rejection_reason = p_reason,
        reviewed_at      = now(),
        reviewed_by      = v_caller_id,
        updated_at       = now()
    WHERE id = p_request_id;

  -- Credit the balance back to the user on rejection
  UPDATE public.users
    SET wallet_balance = wallet_balance + v_amount
    WHERE id = v_user_id;

  INSERT INTO public.financial_audit_log (record_id, record_type, old_status, new_status, changed_by)
    VALUES (p_request_id, 'withdrawal_request', 'pending', 'rejected', v_caller_id);
END;
$$;
