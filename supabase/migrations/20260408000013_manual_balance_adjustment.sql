-- T004: Extend financial_audit_log.record_type CHECK constraint for manual adjustments
DO $$
BEGIN
  -- Drop the existing constraint
  ALTER TABLE public.financial_audit_log
  DROP CONSTRAINT IF EXISTS financial_audit_log_record_type_check;

  -- Add it back with 'manual_adjustment'
  ALTER TABLE public.financial_audit_log
  ADD CONSTRAINT financial_audit_log_record_type_check
  CHECK (record_type IN (
    'package_subscription_request',
    'task_completion_log',
    'withdrawal_request',
    'manual_adjustment'
  ));
END
$$;
