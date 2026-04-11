-- ============================================================
-- Migration: Create public.financial_audit_log table
-- Feature: 002-packages-tasks (schema created now; populated by Admin module)
-- Constitution Principle III: must exist before financial records are created
-- ============================================================

CREATE TABLE public.financial_audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id   UUID        NOT NULL,
  record_type TEXT        NOT NULL
                CHECK (record_type IN ('package_subscription_request', 'task_completion_log')),
  old_status  TEXT,
  new_status  TEXT        NOT NULL,
  changed_by  UUID        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_record ON public.financial_audit_log (record_id, record_type);
CREATE INDEX idx_audit_log_changed_by ON public.financial_audit_log (changed_by);

ALTER TABLE public.financial_audit_log ENABLE ROW LEVEL SECURITY;
-- No SELECT policy = all authenticated user access blocked by RLS
-- Service role bypasses RLS — admin access only

COMMENT ON TABLE public.financial_audit_log IS 'Immutable audit trail. Rows are never deleted or updated. Populated by Admin module Server Actions only.';
