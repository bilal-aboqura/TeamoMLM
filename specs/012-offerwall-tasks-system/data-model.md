# Data Model: Apps Offerwall & Tasks System

**Branch**: `012-offerwall-tasks-system` | **Date**: 2026-04-25

---

## 1. Schema Changes Summary

| Change | Type | Table | Reason |
|---|---|---|---|
| Add `description` column | ALTER | `public.tasks` | FR-001: Tasks need instructions text |
| Create `offerwall_submissions` | CREATE | new | D-002: Separate from daily-reset `task_completion_logs` |
| Create `wallet_transactions` | CREATE | new | D-003: FR-019 user-facing transaction history |
| Replace `admin_approve_task` RPC | REPLACE | function | D-001: Add `auth.uid()` role-check, add `wallet_transactions` insert |
| Replace `admin_reject_task` RPC | REPLACE | function | D-001: Add `auth.uid()` role-check, add attempt-cap awareness |
| New `admin_approve_offerwall_submission` RPC | CREATE | function | Atomic approval for new table |
| New `admin_reject_offerwall_submission` RPC | CREATE | function | Atomic rejection for new table |
| New `user_submit_offerwall_proof` RPC | CREATE | function | Atomic submission with attempt-cap guard |

---

## 2. `public.tasks` — ALTER (Migration)

```sql
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN public.tasks.description IS
  'Step-by-step instructions shown to the user in the task detail modal.';
```

**Existing columns preserved** (no breaking changes):
- `platform_label`, `action_url`, `reward_amount`, `required_vip_level`, `display_order`, `is_active`

**RLS change**: Existing `tasks_select_active` policy (SELECT WHERE is_active = true) remains. Add an admin-write policy:
```sql
CREATE POLICY "tasks_admin_all" ON public.tasks
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
```

---

## 3. `public.offerwall_submissions` — CREATE (New Table)

```sql
CREATE TABLE public.offerwall_submissions (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id          UUID          NOT NULL
                     REFERENCES public.tasks(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  user_id          UUID          NOT NULL
                     REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  screenshot_path  TEXT          NOT NULL,
  status           TEXT          NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  reviewed_at      TIMESTAMPTZ,
  reviewed_by      UUID          REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE TRIGGER offerwall_submissions_updated_at
  BEFORE UPDATE ON public.offerwall_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enforce one active (pending/approved) submission per user per task
CREATE UNIQUE INDEX offerwall_submissions_one_active
  ON public.offerwall_submissions (user_id, task_id)
  WHERE status IN ('pending', 'approved');

-- Performance: admin queue (pending)
CREATE INDEX idx_offerwall_submissions_pending
  ON public.offerwall_submissions (created_at ASC)
  WHERE status = 'pending';

-- Performance: per-user status lookups
CREATE INDEX idx_offerwall_submissions_user
  ON public.offerwall_submissions (user_id, task_id, status);
```

### State Transitions

```
[No submission] → submit → pending
pending → approve → approved   (wallet credited, wallet_transactions record inserted)
pending → reject  → rejected   (attempt count += 1)
rejected → submit → pending    (only if rejection_count < 3)
[3 rejections] → locked        (derived state, no further submissions accepted)
```

### Derived Statuses (computed in application layer)

| Condition | Displayed Status |
|---|---|
| No submissions for this task | Available |
| Latest submission status = 'pending' | Pending Review |
| Any submission status = 'approved' | Completed |
| COUNT(rejected) >= 3 AND no approved | Locked |

### RLS Policies

```sql
ALTER TABLE public.offerwall_submissions ENABLE ROW LEVEL SECURITY;

-- Users see only their own submissions
CREATE POLICY "offerwall_sub_select_own" ON public.offerwall_submissions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Admins see all
CREATE POLICY "offerwall_sub_admin_all" ON public.offerwall_submissions
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
```

---

## 4. `public.wallet_transactions` — CREATE (New Table)

```sql
CREATE TABLE public.wallet_transactions (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID          NOT NULL
                     REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  amount           NUMERIC(10,4) NOT NULL CHECK (amount > 0),
  transaction_type TEXT          NOT NULL
                     CHECK (transaction_type IN ('task_reward')),
  source_label     TEXT          NOT NULL,   -- snapshot of task title at time of approval
  status           TEXT          NOT NULL DEFAULT 'Credited',
  submission_id    UUID          REFERENCES public.offerwall_submissions(id) ON DELETE RESTRICT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Note: No updated_at — wallet_transactions are immutable once inserted (audit record).

CREATE INDEX idx_wallet_transactions_user
  ON public.wallet_transactions (user_id, created_at DESC);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallet_tx_select_own" ON public.wallet_transactions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "wallet_tx_admin_all" ON public.wallet_transactions
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );
```

---

## 5. RPC Functions

### 5.1 `public.admin_approve_offerwall_submission(p_submission_id UUID)`

**Pattern**: SECURITY DEFINER, auth.uid() role-check, FOR UPDATE lock, idempotency guard.

```sql
CREATE OR REPLACE FUNCTION public.admin_approve_offerwall_submission(
  p_submission_id UUID
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_caller_id   UUID := auth.uid();
  v_caller_role TEXT;
  v_row         RECORD;
  v_task_title  TEXT;
BEGIN
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT role INTO v_caller_role FROM public.users WHERE id = v_caller_id;
  IF v_caller_role IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'unauthorized'; END IF;

  SELECT os.user_id, os.status, os.task_id, t.reward_amount, t.title
    INTO v_row
    FROM public.offerwall_submissions os
    JOIN public.tasks t ON t.id = os.task_id
    WHERE os.id = p_submission_id
    FOR UPDATE OF os;

  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF v_row.status != 'pending' THEN RAISE EXCEPTION 'not_pending'; END IF;
  IF v_row.reward_amount IS NULL OR v_row.reward_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_reward';
  END IF;

  UPDATE public.offerwall_submissions
    SET status = 'approved', reviewed_at = now(), reviewed_by = v_caller_id
    WHERE id = p_submission_id;

  UPDATE public.users
    SET wallet_balance = wallet_balance + v_row.reward_amount,
        total_earned   = total_earned   + v_row.reward_amount
    WHERE id = v_row.user_id;

  INSERT INTO public.wallet_transactions
    (user_id, amount, transaction_type, source_label, status, submission_id)
  VALUES
    (v_row.user_id, v_row.reward_amount, 'task_reward', v_row.title, 'Credited', p_submission_id);

  INSERT INTO public.financial_audit_log
    (record_id, record_type, old_status, new_status, changed_by)
  VALUES
    (p_submission_id, 'offerwall_submission', 'pending', 'approved', v_caller_id);
END;
$$;
```

### 5.2 `public.admin_reject_offerwall_submission(p_submission_id UUID, p_reason TEXT)`

```sql
CREATE OR REPLACE FUNCTION public.admin_reject_offerwall_submission(
  p_submission_id UUID,
  p_reason        TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_caller_id   UUID := auth.uid();
  v_caller_role TEXT;
  v_status      TEXT;
BEGIN
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT role INTO v_caller_role FROM public.users WHERE id = v_caller_id;
  IF v_caller_role IS DISTINCT FROM 'admin' THEN RAISE EXCEPTION 'unauthorized'; END IF;

  SELECT status INTO v_status FROM public.offerwall_submissions
    WHERE id = p_submission_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF v_status != 'pending' THEN RAISE EXCEPTION 'not_pending'; END IF;

  UPDATE public.offerwall_submissions
    SET status = 'rejected', rejection_reason = p_reason,
        reviewed_at = now(), reviewed_by = v_caller_id
    WHERE id = p_submission_id;

  INSERT INTO public.financial_audit_log
    (record_id, record_type, old_status, new_status, changed_by)
  VALUES
    (p_submission_id, 'offerwall_submission', 'pending', 'rejected', v_caller_id);
END;
$$;
```

### 5.3 `public.user_submit_offerwall_proof(p_task_id UUID, p_screenshot_path TEXT)`

```sql
CREATE OR REPLACE FUNCTION public.user_submit_offerwall_proof(
  p_task_id        UUID,
  p_screenshot_path TEXT
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_caller_id     UUID    := auth.uid();
  v_rejection_cnt INT;
  v_task          RECORD;
  v_new_id        UUID;
BEGIN
  IF v_caller_id IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  -- Verify task exists and is active
  SELECT id, reward_amount INTO v_task FROM public.tasks
    WHERE id = p_task_id AND is_active = true FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'task_not_found'; END IF;
  IF v_task.reward_amount IS NULL OR v_task.reward_amount <= 0 THEN
    RAISE EXCEPTION 'task_no_reward';
  END IF;

  -- Check for active (pending/approved) submission — unique index will also catch this
  -- This explicit check produces a cleaner error message
  IF EXISTS (
    SELECT 1 FROM public.offerwall_submissions
    WHERE user_id = v_caller_id AND task_id = p_task_id
      AND status IN ('pending', 'approved')
  ) THEN
    RAISE EXCEPTION 'already_submitted';
  END IF;

  -- Check 3-rejection attempt cap
  SELECT COUNT(*) INTO v_rejection_cnt
    FROM public.offerwall_submissions
    WHERE user_id = v_caller_id AND task_id = p_task_id AND status = 'rejected';

  IF v_rejection_cnt >= 3 THEN
    RAISE EXCEPTION 'max_attempts_reached';
  END IF;

  INSERT INTO public.offerwall_submissions
    (task_id, user_id, screenshot_path, status)
  VALUES
    (p_task_id, v_caller_id, p_screenshot_path, 'pending')
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;
```

---

## 6. Entity Relationship Summary

```
public.tasks (1) ──────────────── (∞) public.offerwall_submissions
public.users (1) ──────────────── (∞) public.offerwall_submissions
public.offerwall_submissions (1) ─ (0..1) public.wallet_transactions
public.users (1) ──────────────── (∞) public.wallet_transactions
public.offerwall_submissions (∞) ─ (1) public.financial_audit_log [record_id]
```

---

## 7. Migration File Plan

| File | Description |
|---|---|
| `20260425000023_offerwall_tasks_system.sql` | Single migration: ALTER tasks, CREATE offerwall_submissions, CREATE wallet_transactions, CREATE 3 RPCs, RLS policies |
