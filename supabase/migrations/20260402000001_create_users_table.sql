-- ============================================================
-- Migration: Create public.users table
-- Feature: 001-auth-profile
-- ============================================================

-- Auto-update trigger function (reusable across tables)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Users table
CREATE TABLE public.users (
  id                    UUID          PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name             TEXT          NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 100),
  phone_number          TEXT          NOT NULL UNIQUE,
  referral_code         TEXT          NOT NULL UNIQUE CHECK (char_length(referral_code) = 8),
  invited_by            UUID          REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  role                  TEXT          NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  wallet_balance        NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (wallet_balance >= 0),
  total_earned          NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_earned >= 0),
  current_package_level TEXT,
  status                TEXT          NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Auto-update trigger
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes
CREATE INDEX idx_users_invited_by ON public.users(invited_by);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only read their own row
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Comments
COMMENT ON TABLE public.users IS 'Platform user profiles, extending Supabase auth.users.';
COMMENT ON COLUMN public.users.invited_by IS 'UUID of the upline user whose referral code was used. NULL for root/seed admin accounts only.';
COMMENT ON COLUMN public.users.wallet_balance IS 'Available balance in USD. Admin-write only.';
COMMENT ON COLUMN public.users.total_earned IS 'Cumulative earned amount in USD. Admin-write only.';
COMMENT ON COLUMN public.users.referral_code IS 'System-generated 8-char code from charset [A-Z2-9], unique platform-wide.';
