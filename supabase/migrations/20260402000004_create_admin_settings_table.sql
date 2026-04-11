-- ============================================================
-- Migration: Create public.admin_settings table
-- Feature: 002-packages-tasks
-- ============================================================

CREATE TABLE public.admin_settings (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_method_label  TEXT        NOT NULL,
  payment_address       TEXT        NOT NULL,
  is_active             BOOLEAN     NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER admin_settings_updated_at
  BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_settings_select" ON public.admin_settings
  FOR SELECT TO authenticated USING (true);

COMMENT ON TABLE public.admin_settings IS 'Platform configuration. One active row at a time. Admin-write only.';
