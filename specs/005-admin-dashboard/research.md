# Research: Admin Dashboard (005-admin-dashboard)

**Branch**: `005-admin-dashboard` | **Date**: 2026-04-06

---

## 1. Admin Role Enforcement in Next.js App Router

**Decision**: Two-layer guard — middleware (fast path) + layout server component (authoritative path).

**Rationale**: Middleware runs on the Edge and can redirect before any RSC renders, but it cannot safely read from `public.users` (no service-role access). It reads the JWT role claim instead. The `app/admin/layout.tsx` server component re-validates using `createClient()` and fetching `public.users.role` from the DB (bypassing RLS via service role if needed) as the authoritative check.

**Pattern used in this project**: `middleware.ts` already calls `supabase.auth.getUser()` for the dashboard guard. We extend the same pattern for `/admin` routes.

**Alternatives considered**:
- Client-side guard only → rejected (constitution §IV: "never trust client-passed role").
- Route Handler guard only → rejected (adds a network round-trip). Layout RSC is server-side and zero-RTT.

---

## 2. `supabaseAdmin` (Service Role) for Admin Server Actions

**Decision**: All five admin server actions (`approveDeposit`, `rejectDeposit`, `approveTask`, `rejectTask`, `updateUserLevel`) exclusively use `createAdminClient()` (service role key) to bypass RLS.

**Rationale**: Admin actions modify `other users'` rows:
- `wallet_balance` on `public.users` — RLS policy `users_select_own` only allows users to SELECT their own row; no UPDATE policy exists for regular users.
- `package_subscription_requests` and `task_completion_logs` — only SELECT-own policies exist.
- Service role bypasses all RLS, which is the correct pattern for admin-initiated mutations (constitution §III: "Balance mutations are permitted only in admin-scoped server actions").

**Already established pattern**: `createAdminClient()` is already used in `tasks/actions.ts` and `packages/actions.ts` for the same reason (writing to tables without user-scoped policies).

**Security**: The service role key is server-only (`.env.local`, never in client bundle). Each admin action re-validates the caller's role from the session before using the admin client.

---

## 3. Atomic Wallet Balance Update + Audit Log

**Decision**: Use a PostgreSQL function (RPC) called `admin_approve_task` that atomically increments `wallet_balance` and inserts into `financial_audit_log` within a single transaction.

**Rationale**: The constitution §III requires "balance increment and status update MUST succeed or fail together." Two sequential Node.js Supabase calls cannot guarantee atomicity — a network failure between them leaves the DB in an inconsistent state. A single `supabase.rpc('admin_approve_task', {...})` call is fully atomic.

**Implementation**: A new migration `20260406000009_admin_approval_functions.sql` creates:
- `admin_approve_task(log_id uuid, admin_id uuid)` — sets status=approved, increments balance, inserts audit row in one transaction.
- `admin_approve_deposit(request_id uuid, admin_id uuid)` — sets status=approved, updates `current_package_level` on users, deactivates any other approved request, inserts audit row.

**Alternatives considered**:
- Two sequential Supabase client calls → rejected (not atomic, violates constitution §III).
- Supabase Edge Functions → rejected (over-engineered; RPC is simpler and sufficient).

---

## 4. Signed URLs for Private Storage Images

**Decision**: Generate signed URLs server-side in the RSC data-fetching layer using `createAdminClient().storage.from('proofs').createSignedUrl(path, 300)` (5-minute TTL).

**Rationale**: The `proofs` bucket is private (confirmed in seed.sql). Admin detail views must display receipts and task proofs. Signed URLs with short TTL (5 min) are the correct pattern per the constitution §Security.

**Pattern**: Signed URLs are generated in the RSC page/component that fetches the pending table data, not in the client modal — so the client receives a ready-to-use URL.

---

## 5. Referral Tree Data Fetching

**Decision**: Use a PostgreSQL recursive CTE via `supabase.rpc('get_referral_tree', { root_user_id, max_depth: 5 })` that returns a flat array of `{ id, full_name, referral_code, leadership_level, parent_id, depth }` rows. The RSC converts this flat array into a nested tree structure in JavaScript before passing it as props to the client `ReferralTree` component.

**Rationale**: Recursive `invited_by` traversal in application code (N+1 queries) is unacceptable for any non-trivial tree. A single recursive CTE is O(n) and returns all nodes in one query. Depth limit of 5 is enforced inside the SQL function.

**Alternatives considered**:
- N+1 per-level queries → rejected (performance).
- External tree library (react-d3-tree, etc.) → rejected (user confirmed indented list style; no external graph library needed; constitution prohibits unapproved packages).

---

## 6. Leadership Level Schema (`leadership_level` column)

**Decision**: A new migration adds `leadership_level SMALLINT CHECK (leadership_level BETWEEN 1 AND 6) NULL` to `public.users`. NULL = not yet assigned.

**Rationale**: Confirmed in clarification Q1 — 6 levels (L1–L6), integer values 1–6. NULL represents unassigned (not a level 0). SMALLINT is the most compact correct type. CHECK constraint enforces the 1–6 bounds at DB level.

**Migration**: `20260406000009_admin_approval_functions.sql` also handles the ALTER TABLE.

---

## 7. User Search & Pagination

**Decision**: Server-side `ilike` query on `full_name` and `phone_number` columns with `range()` pagination. Query is triggered by form submission (not live input) to avoid excessive DB calls.

**Rationale**: Constitution §V server-first: data fetching in RSC. Supabase supports `ilike` for case-insensitive partial matches. `range(from, to)` implements efficient LIMIT/OFFSET pagination. With up to 10k users, OFFSET is acceptable for v1.

**Alternatives considered**:
- Full-text search (tsvector) → deferred (overkill for v1 admin search).
- Client-side filtering of all users → rejected (scales poorly past ~500 users).

---

## Summary of All Resolved Unknowns

| Unknown | Resolution |
|---------|------------|
| How to enforce admin role in layout | JWT in middleware (fast) + DB role check in layout RSC (authoritative) |
| How to authorize admin Server Actions | Re-validate session + use `createAdminClient()` (service role) |
| How to atomically credit wallet + audit | PostgreSQL RPC function wrapping both writes in one transaction |
| How to display private bucket images | Signed URL (5-min TTL) generated server-side in RSC data layer |
| How to fetch referral tree efficiently | Recursive CTE via `supabase.rpc()`, flat→nested conversion in RSC |
| Leadership level DB column | Add `leadership_level SMALLINT NULL CHECK (1–6)` via new migration |
| User search implementation | Server-side `ilike` + `range()` pagination, search on form submit |
