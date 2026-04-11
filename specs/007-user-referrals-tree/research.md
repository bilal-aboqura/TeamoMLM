# Research: User Team & Referrals (007-user-referrals-tree)

**Phase**: 0 — Pre-Design Research  
**Date**: 2026-04-07  
**Branch**: `007-user-referrals-tree`

---

## Finding 1: `referral_code` Already Exists on `users`

**Decision**: No new column needed. `users.referral_code` is already an 8-char `TEXT NOT NULL UNIQUE` field with a `char_length = 8` check constraint, created in migration `20260402000001`. The constraint comment confirms: "System-generated 8-char code from charset [A-Z2-9], unique platform-wide."

**Implication**: FR-003's `short_code` IS the existing `referral_code`. The invite link format is `https://teamoads.com/register?ref=[referral_code]`. Migration 012 must NOT add a duplicate column — instead it may only add an index if one doesn't exist.

**Alternatives considered**: Adding a separate `short_code` column. **Rejected** because the existing `referral_code` already satisfies the uniqueness, length, and non-UUID requirements confirmed in Q3.

---

## Finding 2: `get_referral_tree` RPC Already Exists — But Not Secured for User Scope

**Decision**: Create a new `get_my_referral_tree` RPC that wraps the same recursive CTE logic but **hard-codes** `p_root_id = auth.uid()`. The existing `get_referral_tree(p_root_id, p_max_depth)` is admin-callable (SECURITY DEFINER, accepts any UUID). It cannot be safely exposed to user-scoped clients.

**Key difference**:

- `get_referral_tree`: Takes `p_root_id` from caller — admin-only use
- `get_my_referral_tree`: Ignores caller-supplied root, uses `auth.uid()` internally — safe for user SB client

**Columns to add to the return type**: `status` (active/suspended), `created_at` (join date) — both needed per FR-008 / Story 3 acceptance scenario 7.

**Depth cap**: Hard-coded `p_max_depth = 6` (not a parameter) to enforce FR-007.

---

## Finding 3: Commission Distribution — `admin_approve_deposit` Needs Extension

**Decision**: The existing `admin_approve_deposit` function (`20260406000009`) only updates `current_package_level`. The 6-level referral commission distribution must be **added to this same function** (or a separate `distribute_referral_commissions` function called from within it atomically).

**Pattern chosen**: Add a `referral_commissions` table + a `distribute_referral_commissions(p_depositing_user_id, p_deposit_amount)` SECURITY DEFINER function called at the end of `admin_approve_deposit`. This keeps the approval atomic (single transaction) and avoids modifying the already-tested approve logic's core.

**Commission rates source**: Stored in `admin_settings` table (already exists per migration 004). A new JSONB column `referral_commission_rates` (type `JSONB`, default `'{"L1":0.05,"L2":0.03,"L3":0.02,"L4":0.01,"L5":0.005,"L6":0.005}'`) is added to `admin_settings`. Admin modifies rates through admin UI (out of scope for this feature — read-only here).

**`financial_audit_log.record_type` constraint**: Must be extended to include `'referral_commission'`.

---

## Finding 4: Snapshot Strategy — `user_referral_stats` Table vs. Columns on `users`

**Decision**: Create a separate `user_referral_stats` table (one row per user), NOT columns on `users`.

**Rationale**:

- Keeps `users` table lean (already has 12+ columns)
- Allows RLS on stats independently
- Easier to batch-populate on deploy for existing users
- Mirrors existing pattern: `financial_audit_log` is separate from `users`

**Columns**:

```
user_referral_stats (
  user_id            UUID PK → users.id RESTRICT
  direct_count       INT  NOT NULL DEFAULT 0
  total_team_size    INT  NOT NULL DEFAULT 0
  total_earnings     NUMERIC(12,2) NOT NULL DEFAULT 0.00
  last_updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
)
```

**Invalidation triggers** (per spec Q4):

1. When a new user registers with `invited_by = X` → increment `X`'s `direct_count` and increment all ancestors' `total_team_size` up 6 levels
2. When `distribute_referral_commissions` credits a user → increment their `total_earnings`

**Trigger strategy**: PostgreSQL `AFTER INSERT` trigger on `users` for join events; direct `UPDATE` inside `distribute_referral_commissions` for earnings.

---

## Finding 5: Existing `ReferralTool` Component — Reuse & Upgrade

**Decision**: The existing `ReferralTool.tsx` in `app/dashboard/_components/` copies the `referral_code` (bare code). It must be **upgraded** to copy the full URL (`https://teamoads.com/register?ref=[code]`), not just the code. The component will be moved/refactored as `InviteLinkCard` in the new team page's `_components/` folder. The original can remain on the dashboard home page (it currently shows only the code).

---

## Finding 6: Next.js App Router File Structure for New Route

**Decision**: New route at `app/dashboard/team/page.tsx`.

```
app/dashboard/team/
├── page.tsx          # RSC — fetches snapshot + user referral_code, passes as props
├── loading.tsx       # Skeleton for all 3 sections
├── error.tsx         # Error boundary
└── _components/
    ├── ReferralStatsCards.tsx   # RSC — renders 3 stat cards from props
    ├── InviteLinkCard.tsx       # "use client" — clipboard + toast
    └── MyDownlineTree.tsx       # "use client" — accordion tree, lazy-loads children
```

**Navigation**: The team page must be added to the dashboard bottom navigation (existing `layout.tsx` or nav component).

---

## Finding 7: No New npm Package Required

**Decision**: No new dependencies. Tree accordion uses React `useState` with recursive rendering. Toast notifications reuse the existing pattern from the wallet module (checking `app/dashboard/wallet/_components/` for the toast pattern used there). The recursive tree is rendered with a self-referential `TreeNode` Client Component using `useState` for expanded state.

---

## Alternatives Considered & Rejected

| Alternative                                                    | Rejected Because                                                        |
| -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Using a recursive `useEffect` to fetch tree lazily in one pass | Violates constitution Principle V (client-side initial data fetch)      |
| Adding `referral_stats_*` columns directly to `users`          | Bloats users table; harder to RLS independently                         |
| Using a library like `react-arborist` for the tree             | New npm dependency; `useState` + recursive component sufficient         |
| Modifying `get_referral_tree` to be user-safe                  | Admin function must remain admin-callable; separate function is cleaner |
| Caching stats in `admin_settings`                              | Wrong table semantics; `admin_settings` is global config, not per-user  |
