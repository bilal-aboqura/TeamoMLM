-- ============================================================
-- Migration: Create public.packages table
-- Feature: 002-packages-tasks
-- ============================================================

CREATE TABLE public.packages (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT          NOT NULL UNIQUE,
  price            NUMERIC(10,2) NOT NULL CHECK (price > 0),
  daily_task_count INT           NOT NULL CHECK (daily_task_count > 0),
  daily_profit     NUMERIC(10,4) NOT NULL CHECK (daily_profit > 0),
  display_order    INT           NOT NULL,
  is_active        BOOLEAN       NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TRIGGER packages_updated_at
  BEFORE UPDATE ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_packages_display_order ON public.packages(display_order);

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "packages_select_active" ON public.packages
  FOR SELECT TO authenticated USING (is_active = true);

COMMENT ON TABLE public.packages IS 'Subscription tier definitions. Admin-managed. Read-only for users.';
COMMENT ON COLUMN public.packages.daily_profit IS 'Total USD earned per day if all tasks for this tier are approved. Per-task reward = daily_profit / daily_task_count.';
