-- ============================================================
-- Migration: Create public.package_subscription_requests table
-- Feature: 002-packages-tasks
-- ============================================================

CREATE TABLE public.package_subscription_requests (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID          NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  package_id       UUID          NOT NULL REFERENCES public.packages(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  receipt_url      TEXT          NOT NULL,
  amount_paid      NUMERIC(10,2) NOT NULL CHECK (amount_paid > 0),
  status           TEXT          NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TRIGGER pkg_sub_requests_updated_at
  BEFORE UPDATE ON public.package_subscription_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Partial unique index: at most one pending request per user
CREATE UNIQUE INDEX pkg_sub_requests_one_pending_per_user
  ON public.package_subscription_requests (user_id)
  WHERE status = 'pending';

CREATE INDEX idx_pkg_sub_requests_user_id
  ON public.package_subscription_requests (user_id);

ALTER TABLE public.package_subscription_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pkg_sub_requests_select_own" ON public.package_subscription_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

COMMENT ON TABLE public.package_subscription_requests IS 'User purchase submissions awaiting admin review. Financial record — status lifecycle: pending → approved | rejected.';
COMMENT ON COLUMN public.package_subscription_requests.receipt_url IS 'Supabase Storage path in the proofs bucket: receipts/{user_id}/{uuid}.jpg';
