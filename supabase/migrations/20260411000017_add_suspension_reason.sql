-- ============================================================
-- Migration: Add suspension_reason column to users table
-- Allows admin to store the reason when suspending a user.
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT NULL;

COMMENT ON COLUMN public.users.suspension_reason
  IS 'Admin-provided reason when the account is suspended. Cleared on reactivation.';
