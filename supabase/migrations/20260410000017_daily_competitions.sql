-- ============================================================
-- Migration: Daily Competitions
-- Date: 2026-04-10
-- ============================================================

CREATE TABLE public.competitions (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT          NOT NULL,
  start_time  TIMESTAMPTZ   NOT NULL,
  end_time    TIMESTAMPTZ   NOT NULL,
  reward      TEXT          NOT NULL,
  terms       TEXT          NOT NULL DEFAULT '',
  is_active   BOOLEAN       NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TRIGGER competitions_updated_at
  BEFORE UPDATE ON public.competitions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY competitions_select_active
  ON public.competitions FOR SELECT
  TO authenticated
  USING (is_active = true);

COMMENT ON TABLE public.competitions IS
  'Daily competitions visible to users. Admin manages CRUD; users see active entries only.';
