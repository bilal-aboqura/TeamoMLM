-- ============================================================
-- Migration: Create public.tasks table
-- Feature: 002-packages-tasks
-- ============================================================

CREATE TABLE public.tasks (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT        NOT NULL,
  platform_label TEXT        NOT NULL,
  action_url     TEXT        NOT NULL,
  display_order  INT         NOT NULL,
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_tasks_display_order ON public.tasks(display_order, id);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_select_active" ON public.tasks
  FOR SELECT TO authenticated USING (is_active = true);

COMMENT ON TABLE public.tasks IS 'Global pool of daily task definitions. No tier assignment — quantity is controlled by packages.daily_task_count. No reward_amount — computed as daily_profit / daily_task_count at submission.';
