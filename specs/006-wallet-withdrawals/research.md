# Phase 0: Research — Wallet & Withdrawals (006)

**Branch**: `006-wallet-withdrawals` | **Date**: 2026-04-06

---

## R-1: Atomic Withdrawal Submission Pattern

**Decision**: Use a PostgreSQL `SECURITY DEFINER` RPC function (`user_submit_withdrawal`) invoked from the user-facing Server Action via `createAdminClient()`.

**Rationale**: The withdrawal submission is the only user-facing operation that writes to `wallet_balance` directly. Constitution Principle III forbids direct balance writes from user context — but since this is a user-initiated deduction (not an admin approval), we need an exception. The solution is to wrap the entire operation in a DB-level PL/pgSQL function that:
1. Acquires a `FOR UPDATE` lock on `users` row — prevents race conditions from concurrent submissions.
2. Checks `status = 'active'` — implements FR-026 at the DB level.
3. Checks `wallet_balance >= amount` — serves as the second-layer guard (FR-008).
4. Decrements `wallet_balance`.
5. Inserts `withdrawal_requests` row with `status = 'pending'`.

All steps execute atomically. Neither step can succeed without the other. The Server Action calls this RPC via the service-role client, bypassing RLS only for this single controlled function.

**Alternative rejected**: Using `createClient()` (anon key) with RLS policies instead of a DEFINER function — rejected because it cannot atomically lock a row, decrement balance, and insert a record in a single transaction via the Supabase JS client.

---

## R-2: `financial_audit_log` Record Type Constraint

**Decision**: Add `'withdrawal_request'` to the `record_type` CHECK constraint via an `ALTER TABLE` in the new migration, before creating admin RPC functions that write to it.

**Rationale**: The existing constraint `CHECK (record_type IN ('package_subscription_request', 'task_completion_log'))` was created in migration `20260402000008`. Per constitution: "Never edit an already-merged migration file." Therefore, we must `ALTER TABLE public.financial_audit_log DROP CONSTRAINT` and `ADD CONSTRAINT` with the extended value list in the new migration `20260406000010`.

**Alternative rejected**: Not logging withdrawals in the audit table — rejected because Constitution III mandates an audit entry for every financial status change. Two new RPC functions for admin (`admin_approve_withdrawal`, `admin_reject_withdrawal`) will insert audit rows.

---

## R-3: Server Action Form Pattern

**Decision**: Use `useActionState` from React (not `useFormState`) with a form `action={formAction}` binding, consistent with the pattern established in `PurchaseModal.tsx` (packages module). On `state.success === true`, call `router.refresh()` + `form.reset()` via a `ref` on the `<form>` element.

**Rationale**: `useActionState` is the React 19/Next.js 15 canonical pattern already in use across the codebase. Using `ref.current.reset()` satisfies FR-011's "form fields clear" requirement cleanly without manual field-by-field state clearing.

**Alternative rejected**: Controlled inputs with individual `useState` per field — rejected because it duplicates state management complexity and this codebase uses uncontrolled `<form>` patterns with `formData.get()` in actions.

---

## R-4: Supabase Client Strategy

**Decision**: User dashboard actions use `createClient()` (anon) for `auth.getUser()`, then `createAdminClient()` (service role) to call the RPC function.

**Rationale**: This is identical to the pattern in `tasks/actions.ts` and `packages/actions.ts`. The anon client handles auth identity; the admin client is used specifically to invoke the DEFINER function. The user never gets direct service-role access.

---

## R-5: `withdrawal_requests` Table — No Unique Constraint

**Decision**: No unique constraint beyond `(id)`. Multiple pending requests from the same user are allowed simultaneously, subject only to available balance.

**Rationale**: Spec clarification Q2 session: the balance is deducted atomically on each submission. The constraint preventing over-withdrawal is the `wallet_balance >= 0` DB check, not a one-pending-at-a-time rule.

---

## R-6: Admin Module Extension Required

**Decision**: This migration must add two new admin RPC functions: `admin_approve_withdrawal` and `admin_reject_withdrawal`. These functions are called by the Admin module (future task in admin scope) but their DB-level definitions belong in this migration since they create the `withdrawal_requests` infrastructure.

**Rationale**: The admin panel built in Module 005 does not yet have withdrawal approval UI. That UI will be a follow-on feature. However, the DB functions must exist in this migration so that:
1. The admin module's future Server Actions can call `rpc("admin_approve_withdrawal", ...)`.
2. The approval includes: set `status = 'approved'`, audit log insert.
3. The rejection includes: set `status = 'rejected'`, refund `wallet_balance`, audit log insert (per spec Assumption: refund on rejection).
