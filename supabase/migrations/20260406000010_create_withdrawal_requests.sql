-- ============================================================
-- Migration: Create public.withdrawal_requests table + RPC functions
-- Feature: 006-wallet-withdrawals
-- ============================================================

-- T003: Extend financial_audit_log.record_type CHECK constraint
ALTER TABLE public.financial_audit_log
  DROP CONSTRAINT financial_audit_log_record_type_check;

ALTER TABLE public.financial_audit_log
  ADD CONSTRAINT financial_audit_log_record_type_check
  CHECK (record_type IN (
    'package_subscription_request',
    'task_completion_log',
    'withdrawal_request'
  ));

-- T004: Create withdrawal_requests table
CREATE TABLE public.withdrawal_requests (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID          NOT NULL REFERENCES public.users(id)
                                    ON DELETE RESTRICT ON UPDATE CASCADE,
  amount           NUMERIC(12,2) NOT NULL CHECK (amount >= 1.00),
  payment_details  TEXT          NOT NULL CHECK (char_length(payment_details) BETWEEN 1 AND 200),
  status           TEXT          NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT          NULL,
  reviewed_at      TIMESTAMPTZ   NULL,
  reviewed_by      UUID          NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_withdrawal_requests_user_id
  ON public.withdrawal_requests (user_id, created_at DESC);

CREATE INDEX idx_withdrawal_requests_pending
  ON public.withdrawal_requests (created_at ASC)
  WHERE status = 'pending';

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY withdrawal_requests_select_own
  ON public.withdrawal_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- set_updated_at trigger for withdrawal_requests
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- T005: user_submit_withdrawal RPC
CREATE OR REPLACE FUNCTION public.user_submit_withdrawal(
  p_user_id         UUID,
  p_amount          NUMERIC,
  p_payment_details TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status        TEXT;
  v_wallet_balance NUMERIC;
  v_request_id    UUID;
BEGIN
  SELECT status, wallet_balance
    INTO v_status, v_wallet_balance
    FROM public.users
    WHERE id = p_user_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  IF v_status != 'active' THEN
    RAISE EXCEPTION 'suspended';
  END IF;

  IF v_wallet_balance < p_amount THEN
    RAISE EXCEPTION 'insufficient_balance';
  END IF;

  UPDATE public.users
    SET wallet_balance = wallet_balance - p_amount
    WHERE id = p_user_id;

  INSERT INTO public.withdrawal_requests (user_id, amount, payment_details, status)
    VALUES (p_user_id, p_amount, p_payment_details, 'pending')
    RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

-- T006: admin_approve_withdrawal RPC
CREATE OR REPLACE FUNCTION public.admin_approve_withdrawal(
  p_request_id UUID,
  p_admin_id   UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_amount  NUMERIC;
  v_status  TEXT;
BEGIN
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
    SET status       = 'approved',
        reviewed_at  = now(),
        reviewed_by  = p_admin_id,
        updated_at   = now()
    WHERE id = p_request_id;

  INSERT INTO public.financial_audit_log (record_id, record_type, old_status, new_status, changed_by)
    VALUES (p_request_id, 'withdrawal_request', 'pending', 'approved', p_admin_id);
END;
$$;

-- T006: admin_reject_withdrawal RPC
CREATE OR REPLACE FUNCTION public.admin_reject_withdrawal(
  p_request_id UUID,
  p_admin_id   UUID,
  p_reason     TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_amount  NUMERIC;
  v_status  TEXT;
BEGIN
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
        reviewed_by      = p_admin_id,
        updated_at       = now()
    WHERE id = p_request_id;

  UPDATE public.users
    SET wallet_balance = wallet_balance + v_amount
    WHERE id = v_user_id;

  INSERT INTO public.financial_audit_log (record_id, record_type, old_status, new_status, changed_by)
    VALUES (p_request_id, 'withdrawal_request', 'pending', 'rejected', p_admin_id);
END;
$$;
