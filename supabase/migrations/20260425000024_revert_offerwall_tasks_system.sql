-- ============================================================
-- Migration: Revert offerwall split
-- Reason: App earning tasks should continue to use the existing daily tasks flow.
-- ============================================================

DROP FUNCTION IF EXISTS public.admin_reject_offerwall_submission(UUID, TEXT);
DROP FUNCTION IF EXISTS public.admin_approve_offerwall_submission(UUID);
DROP FUNCTION IF EXISTS public.user_submit_offerwall_proof(UUID, TEXT);

DROP TABLE IF EXISTS public.wallet_transactions;
DROP TABLE IF EXISTS public.offerwall_submissions;

DROP POLICY IF EXISTS "tasks_admin_all" ON public.tasks;

ALTER TABLE public.tasks
  DROP COLUMN IF EXISTS description;

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
    'investment_withdrawal'
  ));
