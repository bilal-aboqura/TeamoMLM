-- ============================================================
-- Migration: Profit shares and equity purchasing
-- Feature: 009-profit-shares-equity
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'profit_share_status') THEN
    CREATE TYPE public.profit_share_status AS ENUM ('pending', 'accepted', 'rejected');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id                  BOOLEAN     PRIMARY KEY DEFAULT true CHECK (id),
  usdt_wallet_address TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS usdt_wallet_address TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'platform_settings_updated_at'
  ) THEN
    CREATE TRIGGER platform_settings_updated_at
      BEFORE UPDATE ON public.platform_settings
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

INSERT INTO public.platform_settings (id)
VALUES (true)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.profit_share_requests (
  id                    UUID                       PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID                       NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  sponsor_referral_code TEXT                       NOT NULL,
  percentage            NUMERIC(5,2)               NOT NULL CHECK (percentage > 0 AND percentage <= 10),
  price_usd             NUMERIC(12,2)              NOT NULL CHECK (price_usd > 0),
  receipt_url           TEXT                       NOT NULL,
  status                public.profit_share_status NOT NULL DEFAULT 'pending',
  created_at            TIMESTAMPTZ                NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ                NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'profit_share_requests_updated_at'
  ) THEN
    CREATE TRIGGER profit_share_requests_updated_at
      BEFORE UPDATE ON public.profit_share_requests
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profit_share_requests_user_id
  ON public.profit_share_requests (user_id);

CREATE INDEX IF NOT EXISTS idx_profit_share_requests_status
  ON public.profit_share_requests (status);

ALTER TABLE public.profit_share_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profit_share_requests_select_own" ON public.profit_share_requests;
CREATE POLICY "profit_share_requests_select_own" ON public.profit_share_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "profit_share_requests_insert_own" ON public.profit_share_requests;
CREATE POLICY "profit_share_requests_insert_own" ON public.profit_share_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "profit_share_requests_admin_select" ON public.profit_share_requests;
CREATE POLICY "profit_share_requests_admin_select" ON public.profit_share_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "profit_share_requests_admin_update" ON public.profit_share_requests;
CREATE POLICY "profit_share_requests_admin_update" ON public.profit_share_requests
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "platform_settings_select_authenticated" ON public.platform_settings;
CREATE POLICY "platform_settings_select_authenticated" ON public.platform_settings
  FOR SELECT TO authenticated
  USING (true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('equity-receipts', 'equity-receipts', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "equity_receipts_insert_own_folder" ON storage.objects;
CREATE POLICY "equity_receipts_insert_own_folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'equity-receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "equity_receipts_select_own_folder" ON storage.objects;
CREATE POLICY "equity_receipts_select_own_folder" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'equity-receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "equity_receipts_admin_select" ON storage.objects;
CREATE POLICY "equity_receipts_admin_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'equity-receipts'
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION public.admin_process_profit_share_request(
  p_request_id UUID,
  p_action TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_request public.profit_share_requests%ROWTYPE;
  v_total NUMERIC;
  v_user_total NUMERIC;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role = 'admin'
  )
  INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF p_action NOT IN ('accept', 'reject') THEN
    RAISE EXCEPTION 'invalid_action';
  END IF;

  SELECT *
  INTO v_request
  FROM public.profit_share_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND OR v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'not_pending';
  END IF;

  IF p_action = 'accept' THEN
    SELECT COALESCE(SUM(percentage), 0)
    INTO v_total
    FROM public.profit_share_requests
    WHERE status = 'accepted';

    SELECT COALESCE(SUM(percentage), 0)
    INTO v_user_total
    FROM public.profit_share_requests
    WHERE status = 'accepted'
      AND user_id = v_request.user_id;

    IF v_total + v_request.percentage > 30 THEN
      RAISE EXCEPTION 'global_cap_exceeded';
    END IF;

    IF v_user_total + v_request.percentage > 10 THEN
      RAISE EXCEPTION 'user_cap_exceeded';
    END IF;

    UPDATE public.profit_share_requests
    SET status = 'accepted'
    WHERE id = p_request_id
      AND status = 'pending';
  ELSE
    UPDATE public.profit_share_requests
    SET status = 'rejected'
    WHERE id = p_request_id
      AND status = 'pending';
  END IF;
END;
$$;

COMMENT ON TABLE public.profit_share_requests IS 'User requests to purchase TEMO profit-share equity packages.';
COMMENT ON COLUMN public.profit_share_requests.receipt_url IS 'Supabase Storage path in the equity-receipts bucket: {user_id}/{uuid}.{ext}';
