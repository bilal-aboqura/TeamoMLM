-- ============================================================
-- Migration: Create public.task_completion_logs table
-- Feature: 002-packages-tasks
-- ============================================================

CREATE TABLE public.task_completion_logs (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID          NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  task_id                 UUID          NOT NULL REFERENCES public.tasks(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  proof_url               TEXT          NOT NULL,
  reward_amount_snapshot  NUMERIC(10,4) NOT NULL CHECK (reward_amount_snapshot > 0),
  completion_date         DATE          NOT NULL DEFAULT CURRENT_DATE,
  status                  TEXT          NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason        TEXT,
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TRIGGER task_logs_updated_at
  BEFORE UPDATE ON public.task_completion_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Prevent double-submission: one log per user per task per day
CREATE UNIQUE INDEX task_logs_one_per_day
  ON public.task_completion_logs (user_id, task_id, completion_date);

CREATE INDEX idx_task_logs_user_date
  ON public.task_completion_logs (user_id, completion_date);

ALTER TABLE public.task_completion_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_logs_select_own" ON public.task_completion_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

COMMENT ON TABLE public.task_completion_logs IS 'Daily task proof submissions awaiting admin review. Financial record. reward_amount_snapshot = daily_profit / daily_task_count at time of submission.';
COMMENT ON COLUMN public.task_completion_logs.completion_date IS 'DATE (not TIMESTAMPTZ) — used for daily reset boundary. Normalized to server timezone.';
