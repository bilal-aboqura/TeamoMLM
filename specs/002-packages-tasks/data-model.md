# Data Model: Packages & Daily Tasks (002-packages-tasks)

**Phase**: 1 — Design
**Date**: 2026-04-02
**Branch**: `002-packages-tasks`

---

## Entity Map

```
public.packages
    │
    │ 1:N (id → package_id)
    ▼
public.package_subscription_requests
    │
    │ N:1 (user_id → id)
    ▼
public.users ──────────────────────────────────────────────────┐
    │                                                           │
    │ 1:N (id → user_id)                                       │
    ▼                                                           │
public.task_completion_logs                                     │
    │                                                           │
    │ N:1 (task_id → id)                                       │
    ▼                                                           │
public.tasks                                                    │
                                                                │
public.admin_settings (no FK — singleton config row)           │
                                                                │
public.financial_audit_log ─────────────────────────────────── ┘
    (record_id references either package_subscription_requests.id
     or task_completion_logs.id — polymorphic, enforced by record_type CHECK)
```

---

## Table: `public.packages`

> Admin-configured subscription tiers. Read-only from user context.

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | — | Stable tier identifier |
| `name` | `TEXT` | NOT NULL | — | Arabic-friendly package name (e.g., "باقة A1") |
| `price` | `NUMERIC(10,2)` | NOT NULL, CHECK > 0 | — | USD purchase price |
| `daily_task_count` | `INT` | NOT NULL, CHECK > 0 | — | Number of tasks shown per day to users on this tier |
| `daily_profit` | `NUMERIC(10,4)` | NOT NULL, CHECK > 0 | — | USD earned per day if all tasks approved. 4dp for precision in per-task division |
| `display_order` | `INT` | NOT NULL | — | Controls card order in the grid (ascending) |
| `is_active` | `BOOLEAN` | NOT NULL | `true` | Inactive packages are hidden from users |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | — |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | Auto-updated by trigger |

### Indexes
- `UNIQUE (name)` — prevents duplicate tier names
- `INDEX (display_order)` — for ordered grid rendering

### RLS Policies
```sql
-- Any authenticated user can read active packages
CREATE POLICY "packages_select_active" ON public.packages
  FOR SELECT TO authenticated USING (is_active = true);
-- No user INSERT/UPDATE/DELETE — admin-only via service role
```

---

## Table: `public.admin_settings`

> Singleton configuration for the platform's active payment method. One row, admin-managed.

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | — | Always one row in MVP |
| `payment_method_label` | `TEXT` | NOT NULL | — | e.g., "Vodafone Cash", "USDT (TRC-20)" |
| `payment_address` | `TEXT` | NOT NULL | — | Wallet address or phone number |
| `is_active` | `BOOLEAN` | NOT NULL | `true` | If false, purchase modal shows "not available" message |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | — |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | Auto-updated by trigger |

### RLS Policies
```sql
-- Any authenticated user can read the active payment setting
CREATE POLICY "admin_settings_select" ON public.admin_settings
  FOR SELECT TO authenticated USING (true);
-- No user writes — admin-only via service role
```

---

## Table: `public.package_subscription_requests`

> A user's manual payment submission for a package tier, awaiting admin review.
> **Constitution Principle III**: financial record — carries `status`, `created_at`, `updated_at`.

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | — | — |
| `user_id` | `UUID` | NOT NULL, FK → `public.users(id)` ON DELETE RESTRICT | — | The submitting user |
| `package_id` | `UUID` | NOT NULL, FK → `public.packages(id)` ON DELETE RESTRICT | — | The tier being purchased |
| `receipt_url` | `TEXT` | NOT NULL | — | Supabase Storage path: `receipts/{user_id}/{uuid}.jpg` |
| `amount_paid` | `NUMERIC(10,2)` | NOT NULL, CHECK > 0 | — | USD amount snapshot at submission (= `packages.price` at time of submit) |
| `status` | `TEXT` | NOT NULL, CHECK IN ('pending','approved','rejected') | `'pending'` | Lifecycle state |
| `rejection_reason` | `TEXT` | NULLABLE | NULL | Admin-provided reason; shown to user in history view |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | Submission timestamp |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | Auto-updated by trigger |

### Indexes
```sql
-- Partial unique index: at most one pending request per user at any time (§4 research)
CREATE UNIQUE INDEX pkg_sub_requests_one_pending_per_user
  ON public.package_subscription_requests (user_id)
  WHERE status = 'pending';

-- Lookup index for history view
CREATE INDEX idx_pkg_sub_requests_user_id ON public.package_subscription_requests (user_id);
```

### RLS Policies
```sql
-- Users can read only their own requests
CREATE POLICY "pkg_sub_requests_select_own" ON public.package_subscription_requests
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- No user INSERT/UPDATE/DELETE — all writes via service role Server Actions
```

### State Transitions
```
[submitted] → pending (default)
                │
      ┌─────────┴──────────┐
      ▼                    ▼
  approved              rejected ──→ user may re-submit (Q3)
(admin module)        (admin module)
```

---

## Table: `public.tasks`

> Global pool of daily task definitions. No tier assignment — quantity is controlled by package.

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | — | — |
| `title` | `TEXT` | NOT NULL | — | Arabic task instruction (e.g., "أعجب بهذا الفيديو") |
| `platform_label` | `TEXT` | NOT NULL | — | Display label (e.g., "YouTube", "TikTok", "Instagram") |
| `action_url` | `TEXT` | NOT NULL | — | External URL to open in new tab |
| `display_order` | `INT` | NOT NULL | — | Controls selection order when applying per-package limit |
| `is_active` | `BOOLEAN` | NOT NULL | `true` | Inactive tasks are excluded from the daily pool |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | — |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | Auto-updated by trigger |

> **No `reward_amount` column** — per-task reward is derived at submission time: `package.daily_profit ÷ package.daily_task_count` (research §1, clarification Q4).

### Indexes
- `INDEX (display_order, id)` — supports deterministic LIMIT query (research §3)

### RLS Policies
```sql
-- Any authenticated user can read active tasks
CREATE POLICY "tasks_select_active" ON public.tasks
  FOR SELECT TO authenticated USING (is_active = true);
-- No user writes — admin-only via service role
```

---

## Table: `public.task_completion_logs`

> A user's daily task proof submission. One record per user per task per calendar day.
> **Constitution Principle III**: financial record — carries `status`, `created_at`, `updated_at`.

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | — | — |
| `user_id` | `UUID` | NOT NULL, FK → `public.users(id)` ON DELETE RESTRICT | — | Submitting user |
| `task_id` | `UUID` | NOT NULL, FK → `public.tasks(id)` ON DELETE RESTRICT | — | The task completed |
| `proof_url` | `TEXT` | NOT NULL | — | Supabase Storage path: `task-proofs/{user_id}/{uuid}.jpg` |
| `reward_amount_snapshot` | `NUMERIC(10,4)` | NOT NULL, CHECK > 0 | — | `daily_profit ÷ daily_task_count` at submission time (4dp) |
| `completion_date` | `DATE` | NOT NULL | `CURRENT_DATE` | Used for daily reset — server timezone |
| `status` | `TEXT` | NOT NULL, CHECK IN ('pending','approved','rejected') | `'pending'` | Lifecycle state |
| `rejection_reason` | `TEXT` | NULLABLE | NULL | Admin-provided reason |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | Submission timestamp |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | Auto-updated by trigger |

### Indexes
```sql
-- Prevent double-submission: one log per user per task per day
CREATE UNIQUE INDEX task_logs_one_per_day
  ON public.task_completion_logs (user_id, task_id, completion_date);

-- Lookup index for daily task list query (research §3)
CREATE INDEX idx_task_logs_user_date ON public.task_completion_logs (user_id, completion_date);
```

### RLS Policies
```sql
-- Users can read only their own logs
CREATE POLICY "task_logs_select_own" ON public.task_completion_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- No user writes — all writes via service role Server Actions
```

### State Transitions
```
[submitted] → pending (default)
                │
      ┌─────────┴──────────┐
      ▼                    ▼
  approved              rejected
(admin module)        (admin module)
```

---

## Table: `public.financial_audit_log`

> Immutable audit trail for all admin status changes. Created now, populated by future Admin module.
> **Constitution Principle III mandate**: must exist before financial records are created.

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| `id` | `UUID` | PK, DEFAULT `gen_random_uuid()` | — | — |
| `record_id` | `UUID` | NOT NULL | — | References `package_subscription_requests.id` or `task_completion_logs.id` |
| `record_type` | `TEXT` | NOT NULL, CHECK IN ('package_subscription_request','task_completion_log') | — | Polymorphic type discriminator |
| `old_status` | `TEXT` | NULLABLE | NULL | NULL on first transition from implicit initial state |
| `new_status` | `TEXT` | NOT NULL | — | The status after the admin action |
| `changed_by` | `UUID` | NOT NULL, FK → `public.users(id)` ON DELETE RESTRICT | — | Admin user who made the change |
| `changed_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | Immutable — no `updated_at` (audit rows never mutated) |

### RLS Policies
```sql
-- No user access — admin-read only via service role
-- (no SELECT policy = RLS blocks all authenticated user access by default)
```

---

## Migration Files

Five new migration files (append-only, sequential numbers):

### `supabase/migrations/20260402000003_create_packages_table.sql`

```sql
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
```

### `supabase/migrations/20260402000004_create_admin_settings_table.sql`

```sql
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
```

### `supabase/migrations/20260402000005_create_package_sub_requests_table.sql`

```sql
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
```

### `supabase/migrations/20260402000006_create_tasks_table.sql`

```sql
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
```

### `supabase/migrations/20260402000007_create_task_completion_logs_table.sql`

```sql
-- ============================================================
-- Migration: Create public.task_completion_logs table
-- Feature: 002-packages-tasks
-- ============================================================

CREATE TABLE public.task_completion_logs (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID          NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  task_id                 UUID          NOT NULL REFERENCES public.tasks(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  proof_url               TEXT          NOT NULL,
  reward_amount_snapshot  NUMERIC(10,4) NOT NULL CHECK (reward_amount_snapshot > 0),
  completion_date         DATE          NOT NULL DEFAULT CURRENT_DATE,
  status                  TEXT          NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason        TEXT,
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TRIGGER task_logs_updated_at
  BEFORE UPDATE ON public.task_completion_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Prevent double-submission: one log per user per task per day
CREATE UNIQUE INDEX task_logs_one_per_day
  ON public.task_completion_logs (user_id, task_id, completion_date);

CREATE INDEX idx_task_logs_user_date
  ON public.task_completion_logs (user_id, completion_date);

ALTER TABLE public.task_completion_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_logs_select_own" ON public.task_completion_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

COMMENT ON TABLE public.task_completion_logs IS 'Daily task proof submissions awaiting admin review. Financial record. reward_amount_snapshot = daily_profit / daily_task_count at time of submission.';
COMMENT ON COLUMN public.task_completion_logs.completion_date IS 'DATE (not TIMESTAMPTZ) — used for daily reset boundary. Normalized to server timezone.';
```

### `supabase/migrations/20260402000008_create_financial_audit_log.sql`

```sql
-- ============================================================
-- Migration: Create public.financial_audit_log table
-- Feature: 002-packages-tasks (schema created now; populated by Admin module)
-- Constitution Principle III: must exist before financial records are created
-- ============================================================

CREATE TABLE public.financial_audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id   UUID        NOT NULL,
  record_type TEXT        NOT NULL
                CHECK (record_type IN ('package_subscription_request', 'task_completion_log')),
  old_status  TEXT,
  new_status  TEXT        NOT NULL,
  changed_by  UUID        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  -- No updated_at — audit rows are immutable by design
);

CREATE INDEX idx_audit_log_record ON public.financial_audit_log (record_id, record_type);
CREATE INDEX idx_audit_log_changed_by ON public.financial_audit_log (changed_by);

ALTER TABLE public.financial_audit_log ENABLE ROW LEVEL SECURITY;
-- No SELECT policy = all authenticated user access blocked by RLS
-- Service role bypasses RLS — admin access only

COMMENT ON TABLE public.financial_audit_log IS 'Immutable audit trail. Rows are never deleted or updated. Populated by Admin module Server Actions only.';
```

---

## Supabase Storage: `proofs` Bucket

```sql
-- Run in Supabase Dashboard → SQL Editor (Storage API, not a migration file)

-- Create private bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('proofs', 'proofs', false);

-- RLS: Only service role may insert (enforced by bucket policy)
-- Users cannot read directly — signed URLs generated server-side
CREATE POLICY "proofs_service_role_only" ON storage.objects
  FOR ALL TO authenticated USING (false);
-- Note: service role bypasses RLS — all uploads/downloads via Server Actions using admin client
```

---

## Validation Rules (Zod Schemas)

```typescript
// lib/validations/packages-tasks-schemas.ts

import { z } from 'zod';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png'];

// Used server-side in Server Actions — File object from FormData
export const receiptUploadSchema = z.object({
  package_id: z.string().uuid('معرّف الباقة غير صالح'),
  receipt: z
    .instanceof(File)
    .refine(f => ACCEPTED_IMAGE_TYPES.includes(f.type), 'يرجى رفع صورة فقط (JPEG أو PNG)')
    .refine(f => f.size <= MAX_FILE_SIZE, 'حجم الصورة يجب أن لا يتجاوز 5 ميغابايت')
    .refine(f => f.size > 0, 'الملف فارغ'),
});

export const taskProofUploadSchema = z.object({
  task_id: z.string().uuid('معرّف المهمة غير صالح'),
  proof: z
    .instanceof(File)
    .refine(f => ACCEPTED_IMAGE_TYPES.includes(f.type), 'يرجى رفع صورة فقط (JPEG أو PNG)')
    .refine(f => f.size <= MAX_FILE_SIZE, 'حجم الصورة يجب أن لا يتجاوز 5 ميغابايت')
    .refine(f => f.size > 0, 'الملف فارغ'),
});

export type ReceiptUploadInput = z.infer<typeof receiptUploadSchema>;
export type TaskProofUploadInput = z.infer<typeof taskProofUploadSchema>;
```

---

## State Transition Summary

```
PackageSubscriptionRequest:
  pending ──(admin approve)──→ approved
  pending ──(admin reject)───→ rejected  [user can re-submit immediately — Q3]

TaskCompletionLog:
  pending ──(admin approve)──→ approved
  pending ──(admin reject)───→ rejected  [re-submit blocked by unique index on (user_id, task_id, completion_date)]
                                          [new submission possible next calendar day]
```
