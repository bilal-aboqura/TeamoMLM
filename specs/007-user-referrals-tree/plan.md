# Implementation Plan: User Team & Referrals (فريق العمل والإحالات)

**Branch**: `007-user-referrals-tree` | **Date**: 2026-04-07 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/007-user-referrals-tree/spec.md`

---

## Summary

Build a full "User Team & Referrals" dashboard module for authenticated users. The feature delivers three independently-renderable sections: (1) a pre-computed stats snapshot showing direct referrals, total team size, and cumulative referral earnings; (2) an invite-link card that copies `https://teamoads.com/register?ref=[referral_code]` to clipboard with an Arabic success toast; (3) a client-side collapsible downline tree showing the user's own network up to 6 levels deep, secured server-side such that no user can inspect another user's tree.

The database layer introduces a `user_referral_stats` snapshot table (invalidated by triggers on new registrations) and a `referral_commissions` table populated atomically when the admin approves a user's first deposit, distributing tiered percentages to up to 6 upline beneficiaries. A new `get_my_referral_tree()` RPC function hard-codes `auth.uid()` as the root, enforcing strict authorization at the database level.

---

## Technical Context

**Language/Version**: TypeScript / Next.js 14 (App Router)  
**Primary Dependencies**: Supabase SSR (`@supabase/ssr`), Tailwind CSS, React 18  
**Storage**: Supabase PostgreSQL — new tables: `user_referral_stats`, `referral_commissions`  
**Testing**: Manual + Supabase SQL console verification of RPC outputs and trigger behavior  
**Target Platform**: Web (mobile-first, 320px+); RTL Arabic  
**Performance Goals**: Stats cards load in < 1s (snapshot read); tree L1 renders in < 1.5s  
**Constraints**: No new npm packages; no direct balance writes from user context; 6-level depth hard cap  
**Scale/Scope**: Single user dashboard page; 3 UI components; 1 migration file; 2 new tables; 3 new RPCs; 1 trigger

---

## Constitution Check

| #   | Principle            | Gate Question                                                                                                                                                              | Status  |
| --- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| I   | Architecture & Stack | Next.js App Router pages, Supabase Auth/DB, Tailwind CSS only — no new npm packages                                                                                        | ✅ PASS |
| II  | RTL & UI/UX          | All components use logical Tailwind utilities (`ms-`, `me-`, `ps-`, `pe-`, `text-start`); soft shadows only; emerald accents; Cairo font                                   | ✅ PASS |
| III | Data Integrity       | `referral_commissions` has `created_at`; balance writes via SECURITY DEFINER only; snapshot is non-financial (no `status` needed); audit log extended                      | ✅ PASS |
| IV  | RBAC                 | `get_my_referral_tree` hard-codes `auth.uid()` — no cross-user access possible; RLS on `user_referral_stats` and `referral_commissions`; admin functions remain admin-only | ✅ PASS |
| V   | Component Modularity | 3 focused components < 200 lines each; RSC for data, Client for interactivity; `loading.tsx` + `error.tsx` co-located; no prop drilling beyond 2 levels                    | ✅ PASS |

No violations. Complexity Tracking table not required.

---

## Project Structure

### Documentation (this feature)

```text
specs/007-user-referrals-tree/
├── plan.md              ← This file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── contracts/
│   └── rpc-contracts.md ← Phase 1 output
└── tasks.md             ← Phase 2 (created by /speckit-tasks)
```

### Source Code (repository root)

```text
supabase/migrations/
└── 20260407000012_user_referrals_module.sql   ← [NEW] All schema for this feature

app/dashboard/team/
├── page.tsx             ← [NEW] RSC — fetches snapshot + referral_code, passes as props
├── loading.tsx          ← [NEW] Skeleton for all 3 sections
├── error.tsx            ← [NEW] Error boundary
└── _components/
    ├── ReferralStatsCards.tsx   ← [NEW] RSC — 3 stat cards from props
    ├── InviteLinkCard.tsx       ← [NEW] "use client" — clipboard + toast
    └── MyDownlineTree.tsx       ← [NEW] "use client" — accordion tree

app/dashboard/_components/
└── ReferralTool.tsx     ← [MODIFY] Update to copy full URL (not just bare code)

app/dashboard/layout.tsx ← [MODIFY] Add "فريق" nav item to bottom navigation
```

---

## Implementation Phases

### Phase A — Database Migration

**File**: `supabase/migrations/20260407000012_user_referrals_module.sql`

**A1 — Extend `financial_audit_log.record_type` constraint**

- Add `'referral_commission'` to the allowed values (pattern: DROP + re-ADD constraint, matching migration 010 precedent).

**A2 — Add `referral_commission_rates` to `admin_settings`**

- `ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS referral_commission_rates JSONB NOT NULL DEFAULT '{"L1":0.05,"L2":0.03,"L3":0.02,"L4":0.01,"L5":0.005,"L6":0.005}'`
- Add comment: "Per-level MLM commission rates applied to deposit amount on first deposit approval."

**A3 — Create `user_referral_stats` table**

- Columns: `user_id`, `direct_count`, `total_team_size`, `total_earnings`, `last_updated_at`
- RLS: SELECT own row only; no user INSERT/UPDATE/DELETE
- Seed existing users: `INSERT INTO user_referral_stats (user_id) SELECT id FROM users ON CONFLICT DO NOTHING`

**A4 — Create `referral_commissions` table**

- Columns per data-model.md
- Unique constraint on `(depositing_user_id, upline_level)` — idempotency guard
- RLS: SELECT where `auth.uid() = beneficiary_id`

**A5 — Create trigger `trg_stats_on_new_user`**

- `AFTER INSERT ON public.users FOR EACH ROW`
- Always UPSERT a `user_referral_stats` row for the new user
- If `NEW.invited_by IS NOT NULL`: walk ancestor chain up to 6 levels; increment `total_team_size` for all; increment `direct_count` for L1 ancestor

**A6 — Create `distribute_referral_commissions(p_request_id, p_depositing_user_id, p_deposit_amount, p_admin_id)` RPC**

- SECURITY DEFINER
- Walk upline chain up to 6 levels from `p_depositing_user_id`
- For each found ancestor: read rate from `admin_settings`, compute credit, INSERT commission record, UPDATE wallet + total_earned + stats total_earnings
- Skip silently if ancestor missing or rate = 0

**A7 — Modify `admin_approve_deposit` to call `distribute_referral_commissions`**

- After the existing `UPDATE public.users SET current_package_level = ...` line
- Add: check if this is the user's **first** approved deposit (`NOT EXISTS` on `referral_commissions` for this user as depositing_user_id) — only then call distribution
- Pass the deposit amount (fetched from `package_subscription_requests` or `packages` table — research shows `packages.daily_reward` is the package price; the deposit amount must be read from the package price or a dedicated `deposit_amount` column)

> **Key decision on deposit amount**: `package_subscription_requests` currently does not store an explicit deposit amount — it stores `package_id`. The plan requires reading `packages.price` at approval time. If `packages.price` does not exist, a `price NUMERIC(12,2)` column must be added to `packages` in this migration as well. **This must be verified before implementation** (marked as T-VERIFY in tasks).

**A8 — Create `get_my_referral_tree()` RPC**

- SECURITY DEFINER
- No parameters — root hard-coded to `auth.uid()`
- Max depth hard-coded to 6
- Returns: `id, full_name, referral_code, status, parent_id, depth, created_at`
- Exclude root node from results (depth 0 = the user themselves; returned separately for the UI root display)

**A9 — Index for tree traversal performance**

- `CREATE INDEX IF NOT EXISTS idx_users_invited_by ON public.users(invited_by)` — check if already exists (it does, from migration 001). Document as no-op.

---

### Phase B — UI: Page & Components

**B1 — `app/dashboard/team/page.tsx`** (RSC)

Fetches in parallel using `Promise.all`:

1. `supabase.from('user_referral_stats').select('*').eq('user_id', userId).single()` → stats snapshot
2. `supabase.from('users').select('referral_code').eq('id', userId).single()` → invite link code

Passes data as props to three sub-components. Wraps each in its own `<Suspense>` boundary for independent loading states.

**B2 — `ReferralStatsCards.tsx`** (RSC — receives props, no fetch)

Three cards in a responsive grid (1-col mobile, 3-col desktop):

- "الإحالات المباشرة" — `direct_count` with user-add icon (emerald accent)
- "إجمالي الفريق" — `total_team_size` with users icon
- "أرباح الإحالات" — `total_earnings` formatted as currency with emerald text

Card anatomy: `bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]`; number in `text-3xl font-bold text-emerald-600`; label in `text-sm text-slate-500`.

Empty state: if all zero — render an inline callout card encouraging the user to share their link (deep-links to the invite section).

**B3 — `InviteLinkCard.tsx`** ("use client" — clipboard API requires browser)

Displays full URL `https://teamoads.com/register?ref=[referral_code]` in a read-only input or styled `<code>` block.

Copy button: calls `navigator.clipboard.writeText(fullUrl)` → on success sets `copied = true` for 2s → renders Arabic toast inline ("تم نسخ الرابط!") or uses the existing toast pattern from the wallet module.

Fallback: if clipboard API unavailable → `document.execCommand('copy')` → if that also fails → `select()` the input so user can copy manually + show "انسخ الرابط يدوياً" instruction.

Card design: `bg-gradient-to-r from-slate-900 to-slate-800` header strip showing "رابط الدعوة" with a share icon; below it the link display area on `bg-slate-50`; below that the emerald copy button with shadow `shadow-[0_4px_14px_0_rgba(5,150,105,0.39)]`.

**B4 — `MyDownlineTree.tsx`** ("use client" — interactive expand/collapse state)

**Architecture**: Two-part design to satisfy constitution Principle V (server-first):

- Parent RSC calls `get_my_referral_tree()` to get ALL tree data (up to 6 levels) as a flat list
- RSC transforms flat list into nested tree structure (pure computation, server-side)
- Passes the nested tree as props to `MyDownlineTree` client component for interactive rendering

**Tree node rendering** (recursive `TreeNode` sub-component):

- Each node: `bg-white rounded-xl p-4 border border-slate-100` with `ms-[depth * 24px]` indentation (logical RTL-safe)
- Info displayed: full_name (bold), level badge (`L{depth}` in emerald pill), status badge (active: `bg-emerald-50 text-emerald-700`; suspended: `bg-yellow-50 text-yellow-700 "معلق"`), join date in muted text
- Expand/collapse: chevron icon rotates 90° on expand (`transition-transform duration-200`); no chevron for leaf nodes (FR-010)
- Default state: L1 children expanded, L2+ collapsed

**Empty state**: If no children — render a motivating card: "ليس لديك أعضاء في فريقك بعد" with a button deep-linking to the invite link section.

**B5 — `loading.tsx`** (co-located skeleton)

Three skeleton sections matching real layout: 3-column skeleton cards with pulse animation; a link card skeleton; a tree skeleton showing 3 fake collapsed rows.

**B6 — `error.tsx`** (co-located error boundary)

Consistent with existing `error.tsx` patterns in `app/dashboard/` — Arabic error message, retry button.

**B7 — Navigation update**

Add "فريق" (team icon: `UsersIcon`) to the dashboard bottom nav (`app/dashboard/layout.tsx` or the nav component) pointing to `/dashboard/team`. Follow the exact same tab item pattern as existing nav items.

**B8 — Upgrade existing `ReferralTool.tsx`** on dashboard home

Change the copy value from bare `referralCode` to full URL `https://teamoads.com/register?ref=${referralCode}`. Update the label from "كود الإحالة الخاص بك" to "رابط الإحالة الخاص بك". Update copy button aria-label. This is a 3-line diff.

---

## UI Contract Summary

See [contracts/rpc-contracts.md](./contracts/rpc-contracts.md) for full RPC signatures and response shapes.

---

## Complexity Tracking

No Constitution violations. No entries required.

---

## Verification Plan

### Database Verification (SQL console)

1. Insert test user with `invited_by = [existing_user_id]` → verify `user_referral_stats` increments correctly for all 6 upline ancestors
2. Call `distribute_referral_commissions(...)` with a test deposit → verify 6 rows inserted in `referral_commissions`, each beneficiary's `wallet_balance` incremented, `user_referral_stats.total_earnings` updated
3. Call `get_my_referral_tree()` as user X → verify only X's subtree returned, max depth = 6
4. Attempt to call `get_my_referral_tree()` while authenticated as user Y → verify result is Y's tree (impossible to see X's tree)
5. Verify `referral_commissions` unique constraint rejects duplicate `(depositing_user_id, upline_level)`

### UI Verification

1. Navigate to `/dashboard/team` → all 3 sections render with correct data or empty states
2. Click copy button → clipboard contains full URL with `?ref=[code]`; toast appears in < 300ms
3. Expand L1 node → children appear; collapse → children hidden
4. Verify no `ml-`, `mr-`, `pl-`, `pr-`, `text-left`, `text-right` utilities in new components
5. Verify `loading.tsx` skeleton renders on slow network (throttle in DevTools)
6. Verify tree does not render beyond depth 6 (seed a 7-level deep network in dev DB)
