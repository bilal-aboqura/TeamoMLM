# Data Model: Admin Dashboard (005-admin-dashboard)

**Branch**: `005-admin-dashboard` | **Date**: 2026-04-06

---

## Existing Tables (No Schema Changes — Read/Update Only)

### `public.users`
```sql
id                    UUID          PK → auth.users(id)
full_name             TEXT          NOT NULL
phone_number          TEXT          UNIQUE NOT NULL
referral_code         TEXT          UNIQUE NOT NULL (8 chars)
invited_by            UUID          FK → public.users(id) RESTRICT  -- parent in referral tree
role                  TEXT          CHECK ('user' | 'admin')
wallet_balance        NUMERIC(12,2) DEFAULT 0.00                    -- admin-write only
total_earned          NUMERIC(12,2) DEFAULT 0.00                    -- admin-write only
current_package_level TEXT          NULL                             -- package name (tech debt: should be UUID FK)
status                TEXT          CHECK ('active' | 'suspended')
created_at            TIMESTAMPTZ
updated_at            TIMESTAMPTZ
-- NEW (this feature):
leadership_level      SMALLINT      NULL CHECK (1..6)                -- L1=1 … L6=6, NULL = unassigned
```

**Admin reads**: full_name, phone_number, role, wallet_balance, current_package_level, leadership_level, invited_by, referral_code, created_at  
**Admin writes**: `leadership_level` (via `updateUserLevel`), `wallet_balance` (via `admin_approve_task` RPC), `current_package_level` (via `admin_approve_deposit` RPC)

---

### `public.package_subscription_requests`
```sql
id               UUID          PK
user_id          UUID          FK → public.users(id) RESTRICT
package_id       UUID          FK → public.packages(id) RESTRICT
receipt_url      TEXT          NOT NULL  -- Supabase Storage path: receipts/{user_id}/{uuid}.jpg
amount_paid      NUMERIC(10,2) NOT NULL CHECK (> 0)
status           TEXT          CHECK ('pending' | 'approved' | 'rejected') DEFAULT 'pending'
rejection_reason TEXT          NULL
created_at       TIMESTAMPTZ
updated_at       TIMESTAMPTZ
-- MISSING COLUMNS — added via new migration:
reviewed_at      TIMESTAMPTZ   NULL      -- set on approve/reject
reviewed_by      UUID          NULL FK → public.users(id)  -- admin user ID
```

**Admin reads**: all columns + joined `packages.name`, `users.full_name`, `users.phone_number`  
**Admin writes**: `status`, `rejection_reason`, `reviewed_at`, `reviewed_by` (all via `admin_approve_deposit` RPC)

---

### `public.task_completion_logs`
```sql
id                     UUID          PK
user_id                UUID          FK → public.users(id) RESTRICT
task_id                UUID          FK → public.tasks(id) RESTRICT
proof_url              TEXT          NOT NULL  -- Supabase Storage path: task-proofs/{user_id}/{uuid}.jpg
reward_amount_snapshot NUMERIC(10,4) NOT NULL CHECK (> 0)
completion_date        DATE          NOT NULL DEFAULT CURRENT_DATE
status                 TEXT          CHECK ('pending' | 'approved' | 'rejected') DEFAULT 'pending'
rejection_reason       TEXT          NULL
created_at             TIMESTAMPTZ
updated_at             TIMESTAMPTZ
-- MISSING COLUMNS — added via new migration:
reviewed_at            TIMESTAMPTZ   NULL
reviewed_by            UUID          NULL FK → public.users(id)
```

**Admin reads**: all columns + joined `tasks.title`, `users.full_name`  
**Admin writes**: `status`, `rejection_reason`, `reviewed_at`, `reviewed_by`, and `users.wallet_balance` (all atomically via `admin_approve_task` RPC)

---

### `public.financial_audit_log`
```sql
id          UUID    PK
record_id   UUID    NOT NULL   -- FK to request or log row
record_type TEXT    CHECK ('package_subscription_request' | 'task_completion_log')
old_status  TEXT    NULL
new_status  TEXT    NOT NULL
changed_by  UUID    FK → public.users(id) RESTRICT  -- admin user ID
changed_at  TIMESTAMPTZ DEFAULT now()
```

**Admin writes**: INSERT only (never UPDATE/DELETE). Written inside the PostgreSQL RPC functions.  
**RLS**: no SELECT policy — service role only.

---

## New Database Artifacts (This Feature)

### Migration: `20260406000009_admin_dashboard_schema.sql`

This migration covers all schema additions needed for the admin module:

**1. Add `leadership_level` to `public.users`**
```sql
ALTER TABLE public.users
  ADD COLUMN leadership_level SMALLINT NULL
    CONSTRAINT users_leadership_level_range CHECK (leadership_level BETWEEN 1 AND 6);

COMMENT ON COLUMN public.users.leadership_level IS
  'Admin-assigned MLM rank: 1=L1, 2=L2, 3=L3, 4=L4, 5=L5, 6=L6. NULL = not yet assigned.';
```

**2. Add `reviewed_at` / `reviewed_by` to both request tables**
```sql
ALTER TABLE public.package_subscription_requests
  ADD COLUMN reviewed_at TIMESTAMPTZ NULL,
  ADD COLUMN reviewed_by UUID NULL REFERENCES public.users(id) ON DELETE RESTRICT;

ALTER TABLE public.task_completion_logs
  ADD COLUMN reviewed_at TIMESTAMPTZ NULL,
  ADD COLUMN reviewed_by UUID NULL REFERENCES public.users(id) ON DELETE RESTRICT;
```

**3. Add pending-status indexes for fast admin queue queries**
```sql
CREATE INDEX idx_pkg_sub_requests_pending
  ON public.package_subscription_requests (created_at ASC)
  WHERE status = 'pending';

CREATE INDEX idx_task_logs_pending
  ON public.task_completion_logs (created_at ASC)
  WHERE status = 'pending';
```

---

### PostgreSQL RPC Functions

All functions run with `SECURITY DEFINER` so they execute with the owner's privileges, ensuring atomicity regardless of RLS. Called via `supabaseAdmin.rpc(...)` from Server Actions.

#### `admin_approve_task(p_log_id UUID, p_admin_id UUID) → VOID`
```sql
-- Within a single transaction:
-- 1. Fetch task_completion_logs row; error if not pending (race condition guard)
-- 2. UPDATE task_completion_logs SET status='approved', reviewed_at=now(), reviewed_by=p_admin_id
-- 3. UPDATE public.users SET wallet_balance = wallet_balance + reward_amount_snapshot,
--                             total_earned  = total_earned  + reward_amount_snapshot
-- 4. INSERT INTO financial_audit_log (record_id, record_type, old_status, new_status, changed_by)
```

#### `admin_reject_task(p_log_id UUID, p_admin_id UUID, p_reason TEXT) → VOID`
```sql
-- 1. Fetch row; error if not pending
-- 2. UPDATE task_completion_logs SET status='rejected', rejection_reason=p_reason, reviewed_at/by
-- 3. INSERT INTO financial_audit_log
-- (wallet_balance NOT touched)
```

#### `admin_approve_deposit(p_request_id UUID, p_admin_id UUID) → VOID`
```sql
-- 1. Fetch package_subscription_requests row; error if not pending
-- 2. Fetch packages.name for the approved package_id
-- 3. UPDATE package_subscription_requests SET status='approved', reviewed_at/by
-- 4. UPDATE public.users SET current_package_level = packages.name WHERE id = request.user_id
-- 5. INSERT INTO financial_audit_log
```

#### `admin_reject_deposit(p_request_id UUID, p_admin_id UUID, p_reason TEXT) → VOID`
```sql
-- 1. Fetch row; error if not pending
-- 2. UPDATE package_subscription_requests SET status='rejected', rejection_reason, reviewed_at/by
-- 3. INSERT INTO financial_audit_log
-- (users.current_package_level NOT touched)
```

#### `get_referral_tree(p_root_id UUID, p_max_depth INT DEFAULT 5) → TABLE`
```sql
-- Recursive CTE traversing invited_by chain downward from p_root_id
-- Returns: id, full_name, referral_code, leadership_level, parent_id (= invited_by), depth
-- LIMIT depth to p_max_depth levels
```

---

## State Transitions

```
package_subscription_requests.status:
  pending ──► approved  (admin_approve_deposit RPC)
  pending ──► rejected  (admin_reject_deposit RPC)
  [terminal states: approved, rejected — no further transitions]

task_completion_logs.status:
  pending ──► approved  (admin_approve_task RPC — also credits wallet_balance)
  pending ──► rejected  (admin_reject_task RPC — wallet unchanged)
  [terminal states: approved, rejected]
```

---

## Key Query Patterns

**Overview stats** (3 counts, single query each — called from RSC):
```sql
SELECT COUNT(*) FROM public.users;
SELECT COUNT(*) FROM public.package_subscription_requests WHERE status = 'pending';
SELECT COUNT(*) FROM public.task_completion_logs WHERE status = 'pending';
```

**Pending deposits table** (with joins, ordered FIFO):
```sql
SELECT r.*, u.full_name, u.phone_number, p.name AS package_name
FROM package_subscription_requests r
JOIN public.users u ON u.id = r.user_id
JOIN public.packages p ON p.id = r.package_id
WHERE r.status = 'pending'
ORDER BY r.created_at ASC;
```

**Pending tasks table** (with joins):
```sql
SELECT l.*, u.full_name, t.title AS task_title
FROM task_completion_logs l
JOIN public.users u ON u.id = l.user_id
JOIN public.tasks t ON t.id = l.task_id
WHERE l.status = 'pending'
ORDER BY l.created_at ASC;
```

**Users table** (paginated, searchable):
```sql
SELECT id, full_name, phone_number, current_package_level, wallet_balance,
       leadership_level, status, created_at
FROM public.users
WHERE full_name ILIKE '%{search}%' OR phone_number ILIKE '%{search}%'
ORDER BY created_at DESC
LIMIT 20 OFFSET {offset};
```
