# Research: Investment & Trading Cycles Module

**Feature**: 010-investment-trading-cycles  
**Phase**: 0 — Research & Unknowns Resolution  
**Date**: 2026-04-25

---

## 1. Lazy Profit Calculation (No Cron Jobs)

**Decision**: Compute profit entirely on-read using two fields: `last_cycle_start` (TIMESTAMPTZ) and `total_capital × current_tier_percentage`.

**Formula**:
```
cycles_passed  = FLOOR( (now_utc - last_cycle_start) / interval '7 days' )
profit_per_cycle = FLOOR( total_capital * current_tier_percentage / 100 * 100 ) / 100  -- floor to 2dp
gross_profit   = cycles_passed * profit_per_cycle
available_profit = gross_profit - withdrawn_profits
```

**Rationale**: The existing codebase has zero scheduled jobs (no pg_cron, no external workers). Computing on-read is trivial at this scale (single row per user), eliminates drift entirely, and is consistent with the platform's "manual approval is the source of truth" principle.

**Alternatives Considered**:
- pg_cron snapshots: Rejected — introduces infrastructure dependency and is banned by the "no automated balance mutation" constitutional rule (Principle III).
- Materialized views: Rejected — still requires refresh scheduling.

---

## 2. Existing Notification Infrastructure

**Decision**: The `in_app_notifications` table is a new table. No existing notification system was found in the codebase. The notification badge in the top app bar (referenced in the design system) is not yet implemented. This module will introduce both the table and the notification-read UI.

**Rationale**: The constitution (Principle V) requires co-location; the notification table definition belongs in this migration. The top app bar already exists (`app/dashboard/layout.tsx`) and will be extended to query `in_app_notifications` count.

**Alternatives Considered**:
- External push (FCM, Pusher): Rejected — introduces unapproved dependency. In-app polling on next render is sufficient.

---

## 3. Storage Bucket Strategy

**Decision**: New private bucket `investment-receipts`. Pattern mirrors the existing `equity-receipts` bucket (migration `20260425000021_profit_shares_equity.sql`):
- INSERT policy: `(storage.foldername(name))[1] = auth.uid()::text`
- SELECT policy: user can only see own folder; admin can see all (role check via `public.users.role`).
- Admin review uses Supabase signed URLs with 300-second TTL (mirrors `proofs` bucket pattern in `app/admin/deposits/page.tsx`).

**Rationale**: The `equity-receipts` bucket is the most recent example and aligns exactly with the required pattern. Reusing the same RLS template ensures no deviation from established security posture.

---

## 4. Admin Pattern: RPC vs. Direct Table Updates

**Decision**: Use PostgreSQL RPC functions (`SECURITY DEFINER`) for all state-mutating admin actions on investment records. Direct table updates are acceptable only for simple non-financial fields.

**Rationale**: All existing financial state mutations (deposit approval, withdrawal approval, task approval) use the `admin_approve_*` / `admin_reject_*` RPC pattern consistently. This ensures atomicity (capital credit + cycle start + audit log in a single transaction), prevents partial failure, and is the established constitution-compliant approach.

**Key RPCs to author**:
- `admin_approve_investment_deposit(p_request_id UUID, p_admin_id UUID)` — sets `investment_deposits.status = 'accepted'`, upserts `investment_accounts`, records `last_cycle_start = now()`, inserts audit log + notification.
- `admin_reject_investment_deposit(p_request_id UUID, p_admin_id UUID, p_reason TEXT)` — sets status to rejected, inserts notification.
- `user_submit_investment_deposit(p_user_id UUID, p_amount NUMERIC, p_receipt_url TEXT)` — enforces one-active-deposit rule, inserts record.
- `admin_approve_investment_withdrawal(p_request_id UUID, p_admin_id UUID)` — sets status to approved, subtracts from `withdrawn_profits`.
- `admin_reject_investment_withdrawal(p_request_id UUID, p_admin_id UUID, p_reason TEXT)` — sets status to rejected, un-reserves the amount.

---

## 5. `financial_audit_log.record_type` Constraint

**Decision**: Extend the existing `CHECK` constraint on `financial_audit_log.record_type` to include two new values: `'investment_deposit'` and `'investment_withdrawal'`.

**Rationale**: Every prior financial feature (migration `20260406000010`) has followed this pattern: first drop the existing check constraint, then re-add it with the extended list. This is migration-safe and avoids touching previously merged migrations.

---

## 6. Investment Account Schema Alignment

**Decision**: The user-provided schema (`investment_accounts` with `user_id` as PK) is adopted with minor constitutional additions:
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()` (Principle III — mandatory)
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` with trigger (Principle III — mandatory)
- `status` stored as TEXT with CHECK (`'active'`, `'completed'`) rather than a new ENUM type, to avoid migration complexity. Consistent with how `withdrawal_requests` handles status.
- `withdrawn_profits NUMERIC(12,2) NOT NULL DEFAULT 0` — tracks cumulative successfully-approved withdrawals (not pending). Pending withdrawal amounts are deducted from `available_profit` at query time.

**Investment Deposit status values**: `'pending'`, `'accepted'`, `'rejected'` — matching the platform's financial_audit_log convention and Principle III.

**Investment Withdrawal status values**: `'pending'`, `'accepted'`, `'rejected'` — same pattern.

---

## 7. Tier Configuration

**Decision**: Profit tiers are hardcoded as a TypeScript constant (not stored in the database). The tier percentage stored on `investment_accounts.current_tier_percentage` is the resolved value at the time of the first approval.

**Tier table**:
```ts
const INVESTMENT_TIERS = [
  { minAmount: 100,   maxAmount: 499,   percentage: 5  },
  { minAmount: 500,   maxAmount: 1999,  percentage: 8  },
  { minAmount: 2000,  maxAmount: 4999,  percentage: 12 },
  { minAmount: 5000,  maxAmount: 9999,  percentage: 18 },
  { minAmount: 10000, maxAmount: null,  percentage: 25 },
] as const;
```

**Rationale**: Tiers are a fixed business rule for this release. Storing in DB would require an admin CRUD UI which is explicitly out of scope. A shared constant in `lib/investment/tiers.ts` keeps the logic DRY across server actions and UI.

---

## 8. Client-Side Countdown Timer

**Decision**: The countdown timer is a `"use client"` component that receives `cycleStartIso: string` as a prop from its RSC parent. It uses `setInterval` (1-second tick) to recompute remaining time. No WebSocket or server-sent events.

**Rationale**: The constitution permits `"use client"` when browser-only APIs are strictly required (`setInterval`, real-time DOM updates). Countdown timers require exactly this. The component receives only a timestamp string prop — no Supabase call from client side.

---

## 9. Concurrent Withdrawal Prevention

**Decision**: The `user_submit_investment_withdrawal` RPC will use `FOR UPDATE` on the `investment_accounts` row to serialize concurrent requests, and will compute `available_profit` inline in SQL to prevent double-spending. The RPC will also check that no other `pending` withdrawal exists for the same user before inserting.

**Rationale**: Mirrors exactly the `user_submit_withdrawal` pattern in migration `20260406000010`. PostgreSQL row-level locking is the correct tool; application-level checks alone are insufficient under concurrent load.

---

## 10. Trading Report Data

**Decision**: Static JSON constant in `lib/investment/trading-report.ts`. The displayed net result percentage will equal the user's active tier percentage (dynamic binding), while trade counts (12 Won: 9, Lost: 3) remain static dummy data.

**Rationale**: Explicitly scoped as static/dummy for this release per spec Assumption 4. No new table or admin UI needed.
