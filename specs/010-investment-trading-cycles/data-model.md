# Data Model: Investment & Trading Cycles Module

**Feature**: 010-investment-trading-cycles  
**Date**: 2026-04-25  
**Source**: spec.md (Key Entities) + research.md (Schema Alignment)

---

## Entity Map

```
investment_accounts (1) ──────────── (N) investment_deposits
      │                                         │
      │                                    receipt_url → Supabase Storage
      │                                         │
      └────────────────── (N) investment_withdrawals
                                                │
                                    (triggers) in_app_notifications
```

---

## 1. `investment_accounts`

Represents a user's active investment portfolio. One per user. Created (upserted) by the admin-approve-deposit RPC.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `user_id` | UUID | PRIMARY KEY, FK → `users.id` ON DELETE RESTRICT | One account per user |
| `total_capital` | NUMERIC(12,2) | NOT NULL, DEFAULT 0, CHECK ≥ 0 | Locked capital. Never decremented |
| `withdrawn_profits` | NUMERIC(12,2) | NOT NULL, DEFAULT 0, CHECK ≥ 0 | Sum of all *approved* withdrawals |
| `last_cycle_start` | TIMESTAMPTZ | NULL → NOT NULL when first deposit approved | UTC timestamp of first or latest deposit approval |
| `current_tier_percentage` | NUMERIC(5,2) | NULL → NOT NULL when first deposit approved | Resolved at approval time from tier table |
| `status` | TEXT | NOT NULL, DEFAULT `'active'`, CHECK IN (`'active'`, `'completed'`) | `'completed'` only via explicit admin/user action |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Constitution Principle III |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Auto-updated by trigger |

**RLS Policies**:
- SELECT: `auth.uid() = user_id` (user sees own row only)
- INSERT/UPDATE: Forbidden from user context — only via SECURITY DEFINER RPC
- Admin SELECT: via service-role client in server actions

**Derived (computed at read-time, never stored)**:
```
cycles_passed    = FLOOR((now() - last_cycle_start) / interval '7 days')
profit_per_cycle = FLOOR(total_capital * current_tier_percentage / 100 * 100) / 100
gross_profit     = cycles_passed * profit_per_cycle
available_profit = gross_profit - withdrawn_profits
next_cycle_at    = last_cycle_start + (cycles_passed + 1) * interval '7 days'
```

---

## 2. `investment_deposits`

One row per user deposit submission. Multiple submissions possible over time (after rejection or completion).

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | |
| `user_id` | UUID | NOT NULL, FK → `users.id` ON DELETE RESTRICT | |
| `amount` | NUMERIC(12,2) | NOT NULL, CHECK ≥ 100 | Minimum deposit |
| `tier_percentage` | NUMERIC(5,2) | NOT NULL | Tier resolved at submission time for audit trail |
| `receipt_url` | TEXT | NOT NULL | Storage path: `{user_id}/{uuid}.{ext}` in `investment-receipts` bucket |
| `status` | TEXT | NOT NULL, DEFAULT `'pending'`, CHECK IN (`'pending'`, `'accepted'`, `'rejected'`) | |
| `rejection_reason` | TEXT | NULL | Set when status = `'rejected'` |
| `reviewed_at` | TIMESTAMPTZ | NULL | Set on admin action |
| `reviewed_by` | UUID | NULL, FK → `users.id` ON DELETE RESTRICT | Admin user ID |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Auto-updated by trigger |

**State Transitions**:
```
pending ──── admin approve ──→ accepted  (triggers: investment_accounts upsert, notification)
        └─── admin reject  ──→ rejected  (triggers: notification)
```

**Business Rules**:
- A user may only have ONE record in `pending` OR `accepted` status at any time.
- The `user_submit_investment_deposit` RPC enforces this with a `FOR UPDATE` lock.
- Amounts < 100 rejected at RPC and Zod schema level.

**RLS Policies**:
- SELECT: `auth.uid() = user_id`
- INSERT: Via RPC only (SECURITY DEFINER)
- Admin: Service-role client in server actions

**Indexes**:
```sql
idx_investment_deposits_user_id   ON (user_id, created_at DESC)
idx_investment_deposits_pending   ON (created_at ASC) WHERE status = 'pending'
```

---

## 3. `investment_withdrawals`

One row per withdrawal request. Pending withdrawals reduce `available_profit` at calculation time.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | |
| `user_id` | UUID | NOT NULL, FK → `users.id` ON DELETE RESTRICT | |
| `amount` | NUMERIC(12,2) | NOT NULL, CHECK ≥ 10 | Minimum 10 USDT (Q3 resolved) |
| `status` | TEXT | NOT NULL, DEFAULT `'pending'`, CHECK IN (`'pending'`, `'accepted'`, `'rejected'`) | |
| `rejection_reason` | TEXT | NULL | |
| `reviewed_at` | TIMESTAMPTZ | NULL | |
| `reviewed_by` | UUID | NULL, FK → `users.id` ON DELETE RESTRICT | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Auto-updated by trigger |

**State Transitions**:
```
pending ──── admin approve ──→ accepted  (triggers: investment_accounts.withdrawn_profits += amount, notification)
        └─── admin reject  ──→ rejected  (triggers: notification — no balance change needed, amount was never deducted)
```

**Available-Profit Calculation** (pending withdrawals reserved at query time):
```
pending_withdrawal_sum = SUM(amount) FROM investment_withdrawals WHERE user_id = ? AND status = 'pending'
available_profit = gross_profit - withdrawn_profits - pending_withdrawal_sum
```

**RLS Policies**:
- SELECT: `auth.uid() = user_id`
- INSERT/UPDATE: Via RPC only

---

## 4. `in_app_notifications`

New table. Introduced by this feature; designed for reuse by future features.

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | |
| `user_id` | UUID | NOT NULL, FK → `users.id` ON DELETE CASCADE | Cascade delete is safe for non-financial records |
| `message` | TEXT | NOT NULL | Arabic language string |
| `is_read` | BOOLEAN | NOT NULL, DEFAULT false | |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**RLS Policies**:
- SELECT: `auth.uid() = user_id`
- UPDATE (mark-read): `auth.uid() = user_id`
- INSERT: Via SECURITY DEFINER RPC only (admin actions)

**Note**: No `updated_at` — notifications are never updated except for `is_read`. `updated_at` trigger omitted by design.

---

## 5. `financial_audit_log` Extension

The existing `financial_audit_log.record_type` CHECK constraint must be extended:

```sql
-- Add new types
'investment_deposit'
'investment_withdrawal'
```

---

## 6. Supabase Storage: `investment-receipts`

Private bucket. Pattern mirrors `equity-receipts` (migration 20260425000021).

| Policy | Scope | Rule |
|--------|-------|------|
| INSERT | Authenticated users | `bucket_id = 'investment-receipts' AND foldername[1] = auth.uid()::text` |
| SELECT (user) | Authenticated users | `bucket_id = 'investment-receipts' AND foldername[1] = auth.uid()::text` |
| SELECT (admin) | Authenticated admins | `bucket_id = 'investment-receipts' AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')` |

---

## 7. Static Configuration: Profit Tiers

Not stored in DB. Defined in `lib/investment/tiers.ts`.

```ts
export const INVESTMENT_TIERS = [
  { minAmount: 100,   maxAmount: 499,   percentage: 5  },
  { minAmount: 500,   maxAmount: 1999,  percentage: 8  },
  { minAmount: 2000,  maxAmount: 4999,  percentage: 12 },
  { minAmount: 5000,  maxAmount: 9999,  percentage: 18 },
  { minAmount: 10000, maxAmount: null,  percentage: 25 },
] as const;

export function resolveTier(amount: number): number | null {
  const tier = INVESTMENT_TIERS.find(
    (t) => amount >= t.minAmount && (t.maxAmount === null || amount <= t.maxAmount)
  );
  return tier?.percentage ?? null;
}
```
