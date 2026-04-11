# RPC & Data Contracts: User Team & Referrals (007-user-referrals-tree)

**Phase**: 1 — Design  
**Date**: 2026-04-07

---

## RPC: `get_my_referral_tree()`

**Purpose**: Returns the authenticated user's downline tree, strictly limited to 6 levels.  
**Security**: SECURITY DEFINER — root is always `auth.uid()`. No parameters accepted.  
**Caller**: Server Component (via Supabase server client with user session).

### Response Row Shape

```typescript
type TreeRow = {
  id: string; // UUID of the downline member
  full_name: string; // Display name
  referral_code: string; // Their referral code (for display)
  status: "active" | "suspended";
  parent_id: string | null; // UUID of their direct upline (= auth.uid() for depth=1 nodes)
  depth: number; // 1–6 (root node at depth 0 is excluded from results)
  created_at: string; // ISO timestamp — join date
};
```

### Client-Side Tree Transformation

The RSC transforms the flat `TreeRow[]` into a nested structure before passing to Client Component:

```typescript
type TreeNode = {
  id: string;
  full_name: string;
  referral_code: string;
  status: "active" | "suspended";
  depth: number;
  created_at: string;
  children: TreeNode[];
};
```

**Algorithm**: Group rows by `parent_id`, build recursively from `parent_id = auth.uid()`.

---

## Table: `user_referral_stats`

**Read via**: Supabase client `from('user_referral_stats').select('*').eq('user_id', userId).single()`

### Response Shape

```typescript
type ReferralStats = {
  user_id: string;
  direct_count: number;
  total_team_size: number;
  total_earnings: number; // NUMERIC returned as number in JS
  last_updated_at: string; // ISO timestamp
};
```

### Props passed to `ReferralStatsCards`

```typescript
type ReferralStatsCardsProps = {
  directCount: number;
  totalTeamSize: number;
  totalEarnings: number;
};
```

---

## Table: `referral_commissions`

**Read via**: Supabase client (user sees own earnings as beneficiary)

```typescript
type ReferralCommission = {
  id: string;
  beneficiary_id: string;
  depositing_user_id: string;
  deposit_request_id: string;
  upline_level: number; // 1–6
  deposit_amount: number;
  commission_rate: number; // e.g., 0.05
  commission_amount: number;
  created_at: string;
};
```

---

## Component Props Contracts

### `InviteLinkCard`

```typescript
// "use client"
type InviteLinkCardProps = {
  referralCode: string; // e.g., "AB3K9Z2W"
  baseUrl: string; // e.g., "https://teamoads.com/register"
  // Full URL: `${baseUrl}?ref=${referralCode}`
};
```

### `MyDownlineTree`

```typescript
// "use client"
type MyDownlineTreeProps = {
  tree: TreeNode[]; // Root-level nodes (depth=1), each with nested children
  // Empty array = no downline → show empty state
};
```

### `ReferralStatsCards`

```typescript
// RSC (no "use client")
type ReferralStatsCardsProps = {
  directCount: number;
  totalTeamSize: number;
  totalEarnings: number;
};
```

---

## Environment Variables Required

No new env vars. Uses existing:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (used only in `distribute_referral_commissions` — server-only)

The invite link base URL (`https://teamoads.com`) should be read from:

```
process.env.NEXT_PUBLIC_APP_URL ?? 'https://teamoads.com'
```

If `NEXT_PUBLIC_APP_URL` is not set, add it to `.env.local` pointing to the deployed domain (or `http://localhost:3000` for local dev).

---

## Migration File Contract

**File**: `supabase/migrations/20260407000012_user_referrals_module.sql`

**Must be idempotent** (use `IF NOT EXISTS`, `CREATE OR REPLACE`, `DO $$ IF NOT EXISTS ... $$`):

| Step | SQL Object                                   | Action                                   |
| ---- | -------------------------------------------- | ---------------------------------------- |
| A1   | `financial_audit_log.record_type` constraint | DROP + re-ADD with 'referral_commission' |
| A2   | `admin_settings.referral_commission_rates`   | ADD COLUMN IF NOT EXISTS                 |
| A3   | `public.user_referral_stats`                 | CREATE TABLE + RLS + seed existing users |
| A4   | `public.referral_commissions`                | CREATE TABLE + RLS + unique constraint   |
| A5   | `trg_stats_on_new_user`                      | CREATE TRIGGER on users                  |
| A6   | `distribute_referral_commissions(...)`       | CREATE OR REPLACE FUNCTION               |
| A7   | `admin_approve_deposit(...)`                 | CREATE OR REPLACE FUNCTION (amended)     |
| A8   | `get_my_referral_tree()`                     | CREATE OR REPLACE FUNCTION               |
