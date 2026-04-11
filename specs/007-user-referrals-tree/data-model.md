# Data Model: User Team & Referrals (007-user-referrals-tree)

**Phase**: 1 — Design  
**Date**: 2026-04-07  
**Branch**: `007-user-referrals-tree`

---

## Existing Tables (referenced, not modified structurally)

### `public.users` *(existing — relevant columns)*

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | Supabase Auth UID |
| `full_name` | TEXT | Display name in tree nodes |
| `referral_code` | TEXT (8 chars, unique) | Used as `?ref=` parameter — **already exists** |
| `invited_by` | UUID → users.id | Parent pointer for tree traversal |
| `status` | TEXT ('active'/'suspended') | Shown per tree node with badge |
| `wallet_balance` | NUMERIC(12,2) | Admin-write only |
| `created_at` | TIMESTAMPTZ | Join date shown on tree nodes |

> **No new columns added to `users`** — `referral_code` already satisfies all FR-003 requirements.

### `public.admin_settings` *(existing — column added)*

| Column | Type | Notes |
|--------|------|-------|
| `referral_commission_rates` | JSONB | **NEW** — per-level rates, e.g. `{"L1":0.05,"L2":0.03,"L3":0.02,"L4":0.01,"L5":0.005,"L6":0.005}` |

---

## New Tables

### `public.user_referral_stats`

Pre-computed snapshot per user. One row per registered user.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `user_id` | UUID | PK, FK → users.id ON DELETE RESTRICT | One row per user |
| `direct_count` | INT | NOT NULL DEFAULT 0 CHECK (≥ 0) | Count of L1 direct referrals only |
| `total_team_size` | INT | NOT NULL DEFAULT 0 CHECK (≥ 0) | Count of all members L1–L6 below user |
| `total_earnings` | NUMERIC(12,2) | NOT NULL DEFAULT 0.00 CHECK (≥ 0) | Sum of all referral_commissions credited to this user |
| `last_updated_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | Auto-updated on every write |

**RLS**:
- `SELECT`: `auth.uid() = user_id` — user sees only own stats
- No INSERT/UPDATE/DELETE from user context (admin/trigger only)

**Invalidation events**:
1. `AFTER INSERT ON public.users` → trigger `trg_stats_on_new_user` increments ancestor chain
2. `distribute_referral_commissions(...)` → directly updates `total_earnings` in same transaction

---

### `public.referral_commissions`

Individual commission credit records. Up to 6 rows per deposit approval event.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PK DEFAULT gen_random_uuid() | |
| `beneficiary_id` | UUID | NOT NULL FK → users.id ON DELETE RESTRICT | Upline user who earns the commission |
| `depositing_user_id` | UUID | NOT NULL FK → users.id ON DELETE RESTRICT | User whose first deposit triggered this |
| `deposit_request_id` | UUID | NOT NULL FK → package_subscription_requests.id ON DELETE RESTRICT | Source deposit event |
| `upline_level` | SMALLINT | NOT NULL CHECK (BETWEEN 1 AND 6) | 1 = direct referrer, 6 = 6th upline |
| `deposit_amount` | NUMERIC(12,2) | NOT NULL CHECK (> 0) | Snapshot of deposit amount at time of approval |
| `commission_rate` | NUMERIC(6,4) | NOT NULL CHECK (BETWEEN 0 AND 1) | Snapshot of rate applied (e.g., 0.0500) |
| `commission_amount` | NUMERIC(12,2) | NOT NULL CHECK (≥ 0) | `deposit_amount * commission_rate` |
| `created_at` | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

**Unique constraint**: `UNIQUE(depositing_user_id, upline_level)` — prevents double-crediting if function is accidentally called twice.

**RLS**:
- `SELECT`: `auth.uid() = beneficiary_id` — user sees only commissions earned by them
- No INSERT/UPDATE/DELETE from user context (SECURITY DEFINER only)

**`financial_audit_log.record_type`**: Extended to include `'referral_commission'`.

---

## New / Modified SQL Functions

### `get_my_referral_tree()` *(NEW — user-scoped)*

```sql
-- Signature (no parameters — root is always auth.uid())
FUNCTION public.get_my_referral_tree()
RETURNS TABLE (
  id              UUID,
  full_name       TEXT,
  referral_code   TEXT,
  status          TEXT,       -- NEW vs get_referral_tree
  parent_id       UUID,
  depth           INT,
  created_at      TIMESTAMPTZ -- NEW vs get_referral_tree
)
LANGUAGE plpgsql SECURITY DEFINER
```

- Internally hard-codes `p_root_id = auth.uid()`
- Hard-codes `p_max_depth = 6`
- Returns root node at depth 0, children at depth 1–6
- **Does not return leadership_level** (that is admin vocabulary; user sees L1–L6 relative labels derived from `depth`)

---

### `distribute_referral_commissions(p_request_id UUID, p_admin_id UUID)` *(NEW)*

Called **from within** `admin_approve_deposit` at the end (atomic, same transaction).

**Logic**:
1. Fetch depositing user's `invited_by` chain up to 6 levels using a recursive CTE (or iterative loop)
2. For each ancestor at level L (1–6): read rate from `admin_settings.referral_commission_rates->>'L{L}'`
3. Compute `commission_amount = deposit_amount * rate`
4. If ancestor exists AND rate > 0 AND commission_amount > 0:
   - INSERT into `referral_commissions`
   - UPDATE `users.wallet_balance += commission_amount` for beneficiary
   - UPDATE `users.total_earned += commission_amount` for beneficiary
   - UPDATE `user_referral_stats.total_earnings += commission_amount` (snapshot)
   - INSERT into `financial_audit_log` (record_type = 'referral_commission')
5. Skip silently if ancestor at level L does not exist (FR-002b)

---

### `admin_approve_deposit` *(MODIFIED)*

The existing function is extended by appending a call to `distribute_referral_commissions` before its final `END`. This keeps the full flow atomic inside one transaction.

---

### `trg_stats_on_new_user` *(NEW — Trigger)*

`AFTER INSERT ON public.users FOR EACH ROW`

**Logic**:
1. If `NEW.invited_by IS NOT NULL`:
   - Walk ancestor chain up to 6 levels
   - For each ancestor at level L: `UPDATE user_referral_stats SET total_team_size = total_team_size + 1`
   - For the L1 ancestor (direct referrer): also `SET direct_count = direct_count + 1`
2. Always: `INSERT INTO user_referral_stats(user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING`

---

## State Transitions

```
user_referral_stats.total_earnings:
  0.00 ──[new referral's first deposit approved]──► += commission_amount per level

user_referral_stats.direct_count:
  N ──[new user registers with ref=X]──► N+1 (for X only)

user_referral_stats.total_team_size:
  N ──[new user registers with ref=X]──► N+1 for all 6 uplines of X
```

---

## Entity Relationships

```
users ──────────────┐
  │ invited_by      │
  └──► users        │  (self-referential tree, max depth 6 for user view)
                    │
user_referral_stats │
  └── user_id ──────┘  (1:1 with users)

referral_commissions
  ├── beneficiary_id ──────────► users.id
  ├── depositing_user_id ───────► users.id
  └── deposit_request_id ───────► package_subscription_requests.id
```
