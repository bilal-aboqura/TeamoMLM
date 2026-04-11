-- ============================================================
-- Migration: Create public.login_attempts table
-- Feature: 001-auth-profile
-- ============================================================

CREATE TABLE public.login_attempts (
  phone_number    TEXT        PRIMARY KEY,
  attempt_count   INT         NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_until    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER login_attempts_updated_at
  BEFORE UPDATE ON public.login_attempts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- No RLS — accessed exclusively via service role server actions
COMMENT ON TABLE public.login_attempts IS 'Tracks failed login attempts per phone number for rate limiting. Service role access only.';
COMMENT ON COLUMN public.login_attempts.locked_until IS 'When set and in the future, all login attempts for this phone are rejected.';
