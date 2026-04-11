# Tasks: Wallet & Withdrawals (المحفظة والسحوبات)

**Branch**: `006-wallet-withdrawals`
**Input**: Design documents from `/specs/006-wallet-withdrawals/`
**Documents used**: plan.md, spec.md, data-model.md, research.md
**Tests**: Not requested — no test tasks generated.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- **[SCHEMA]**: Database-level work (constitution tag)
- **[RTL]**: RTL-compliance-sensitive UI task (constitution tag)
- **[MANUAL-FIN]**: Manual financial system work (constitution tag)
- **[RBAC]**: Role / security enforcement work (constitution tag)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Zod schema and file scaffolding that ALL subsequent phases depend on.

- [x] T001 [SCHEMA] Verify `financial_audit_log.record_type` current constraint value in `supabase/migrations/20260402000008_create_financial_audit_log.sql` before writing the new migration (read-only check, no writes)
- [x] T002 Create empty file scaffolding: `app/dashboard/wallet/page.tsx`, `app/dashboard/wallet/actions.ts`, `app/dashboard/wallet/loading.tsx`, `app/dashboard/wallet/error.tsx`, `app/dashboard/wallet/_components/WalletStatsCards.tsx`, `app/dashboard/wallet/_components/WithdrawalForm.tsx`, `app/dashboard/wallet/_components/WithdrawalsTable.tsx`, `lib/validations/wallet-schemas.ts`

**Checkpoint**: Directory structure exists — all subsequent tasks can now target their specific files.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema + Zod validation layer. MUST complete before any UI or server action work begins.

**⚠️ CRITICAL**: No user story work can begin until T003–T006 are complete.

- [x] T003 [SCHEMA] [MANUAL-FIN] Create migration `supabase/migrations/20260406000010_create_withdrawal_requests.sql` — Part 1: Extend `financial_audit_log.record_type` CHECK constraint to add `'withdrawal_request'` (DROP old constraint, ADD new)
- [x] T004 [SCHEMA] [MANUAL-FIN] Migration Part 2: Create `public.withdrawal_requests` table with columns: `id UUID PK`, `user_id UUID FK → users(RESTRICT)`, `amount NUMERIC(12,2) CHECK >= 1.00`, `payment_details TEXT CHECK length 1–200`, `status TEXT DEFAULT 'pending' CHECK IN (pending/approved/rejected)`, `rejection_reason TEXT NULL`, `reviewed_at TIMESTAMPTZ NULL`, `reviewed_by UUID NULL FK → users(RESTRICT)`, `created_at`, `updated_at`; add `set_updated_at` trigger; add indexes `(user_id, created_at DESC)` and partial `WHERE status = 'pending'`; enable RLS; add policy `withdrawal_requests_select_own` FOR SELECT USING `auth.uid() = user_id`
- [x] T005 [SCHEMA] [MANUAL-FIN] [RBAC] Migration Part 3: Create `public.user_submit_withdrawal(p_user_id UUID, p_amount NUMERIC, p_payment_details TEXT) RETURNS UUID SECURITY DEFINER` — logic: `SELECT … FOR UPDATE` on users row, check `status = 'active'` (RAISE `'suspended'`), check `wallet_balance >= p_amount` (RAISE `'insufficient_balance'`), `UPDATE users SET wallet_balance = wallet_balance - p_amount`, `INSERT INTO withdrawal_requests` returning `id`
- [x] T006 [SCHEMA] [MANUAL-FIN] [RBAC] Migration Part 4: Create `public.admin_approve_withdrawal(p_request_id UUID, p_admin_id UUID) RETURNS VOID SECURITY DEFINER` and `public.admin_reject_withdrawal(p_request_id UUID, p_admin_id UUID, p_reason TEXT) RETURNS VOID SECURITY DEFINER` — approve function: `FOR UPDATE` lock, pending-guard, status update, audit log insert; reject function: `FOR UPDATE` lock, pending-guard, status update, `wallet_balance` refund, audit log insert
- [x] T007 [MANUAL-FIN] Create Zod validation schema in `lib/validations/wallet-schemas.ts` — export `submitWithdrawalSchema` with: `amount` field (string → `parseFloat` → `z.number().min(1.00).max(999999.99).refine(2dp check)`), `payment_details` field (`z.string().trim().min(1).max(200)`); export `WithdrawalActionResult` type matching `{ success: false; idle: true } | { success: true } | { error: { field: string; message: string } }`

**Checkpoint**: Run `npx supabase migration up --local` (or reset DB) and `npx tsc --noEmit` — verify migration applies cleanly and schema type is valid.

---

## Phase 3: User Story 2 — Submit a Withdrawal Request (Priority: P1) 🎯 MVP

> **Note**: US2 (form submission) is implemented before US1 (stats cards) because the Server Action is the foundation the `WithdrawalForm` UI wraps around, and it is also the mechanism that populates data for US3 (history table). US1 (stats cards) only requires read queries and can be built after the write path is live.

**Goal**: User can submit a withdrawal request that atomically deducts balance and creates a pending record.

**Independent Test**: Seed a user with `wallet_balance = $20.00`. Navigate to `/dashboard/wallet`. Submit $15.00 withdrawal with payment details. Confirm: balance card shows $5.00, new row appears in history with "معلق" badge, second submission for $10.00 is rejected with "رصيدك غير كافٍ".

### Implementation for User Story 2

- [x] T008 [MANUAL-FIN] [RBAC] [US2] Implement `submitWithdrawal` Server Action in `app/dashboard/wallet/actions.ts` — extract `amount` + `payment_details` from `formData`; validate via `submitWithdrawalSchema.safeParse`; call `createClient().auth.getUser()` (401 guard); call `createAdminClient().rpc("user_submit_withdrawal", { p_user_id, p_amount, p_payment_details })`; map RPC error codes: `'suspended'` → `"حسابك موقوف. لا يمكنك تقديم طلبات سحب."`, `'insufficient_balance'` → `"رصيدك غير كافٍ لإتمام هذا الطلب"`, other → `"حدث خطأ، يرجى المحاولة مرة أخرى"`; return `{ success: true }` on success
- [x] T009 [RTL] [US2] Build `WithdrawalForm` Client Component in `app/dashboard/wallet/_components/WithdrawalForm.tsx` — add `// use client — useActionState, useFormStatus, useRouter, useRef, useState for toast` comment; implement `useActionState(submitWithdrawal, { success: false, idle: true })`; add `formRef = useRef<HTMLFormElement>`; on `state.success === true` in `useEffect`: call `formRef.current?.reset()`, set toast `"تم إرسال طلب السحب بنجاح"`, `setTimeout(() => setToast(null), 3000)`, call `router.refresh()`; render suspension banner if `isSuspended` prop is true (amber `bg-amber-50 rounded-2xl p-6` with "حسابك موقوف..." message, no form); render Amount input (`type="number"` `step="0.01"` `min="1"`, `inputMode="decimal"`) and Payment Details textarea (both with `border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20`); disable submit when `availableBalance === 0` with message "لا يوجد رصيد متاح للسحب"; client-side validation on blur/submit: amount > 0, ≤ `availableBalance`, ≤ 2dp; use `bg-slate-900 text-white rounded-xl` for submit button with `active:scale-95 transition-all duration-200`; toast renders as `fixed bottom-6 inset-x-0 mx-auto w-fit bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-sm`; all labels, errors, and copy in Arabic; NO `space-x-`, `translate-x-`, `shadow-lg/xl`, directional utilities

**Checkpoint**: Submit valid withdrawal → balance deducts, toast appears, form clears. Submit again exceeding balance → Arabic error appears inline. Zero-balance user sees disabled button.

---

## Phase 4: User Story 1 — Wallet Overview at a Glance (Priority: P1)

**Goal**: The Wallet page renders three premium balance cards (Available Balance, Total Withdrawn, Pending Withdrawals) with correct values fetched server-side.

**Independent Test**: Seed user with `wallet_balance = $25.50`, one approved withdrawal of $10.00, one pending of $5.00. Navigate to `/dashboard/wallet`. Verify: first card "$25.50", second card "$10.00", third card "$5.00". All dollar signs left of numbers. No horizontal scroll on 375px mobile viewport.

### Implementation for User Story 1

- [x] T010 [P] [RTL] [US1] Build `WalletStatsCards` Server Component in `app/dashboard/wallet/_components/WalletStatsCards.tsx` — accept props `{ availableBalance: number, totalWithdrawn: number, pendingWithdrawals: number }`; render `<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">`; each card: `bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]` with title in `text-sm text-slate-500` and amount in `<span dir="ltr">` with emerald color for Available Balance (`text-emerald-600 font-bold text-2xl`), slate for others; format all amounts as `$X.XX`; Available Balance card uses gradient `bg-gradient-to-r from-slate-900 to-slate-800 text-white` with emerald number; NO directional utilities
- [x] T011 [P] [US1] Create `app/dashboard/wallet/page.tsx` as async RSC — authenticate user via `createClient().auth.getUser()` → redirect to `/login` if null; fetch in `Promise.all`: (1) `supabase.from("users").select("wallet_balance, status").eq("id", user.id).single()`, (2) `supabase.from("withdrawal_requests").select("amount, status").eq("user_id", user.id)`, (3) `supabase.from("withdrawal_requests").select("id, amount, payment_details, status, rejection_reason, created_at").eq("user_id", user.id).order("created_at", { ascending: false })`; compute `totalWithdrawn = sum of amount where status='approved'` and `pendingWithdrawals = sum of amount where status='pending'` from result 2; render layout `<main dir="rtl" className="max-w-3xl mx-auto p-6 space-y-8">` containing `<WalletStatsCards>`, `<WithdrawalForm>`, `<WithdrawalsTable>`; pass `isSuspended={userRow.status === 'suspended'}` and `availableBalance={userRow.wallet_balance}` to `WithdrawalForm`
- [x] T012 [P] [RTL] [US1] Create `app/dashboard/wallet/loading.tsx` — render a skeleton matching the 3-card grid + form area + table shape using `animate-pulse bg-slate-100 rounded-2xl` blocks; no text content in skeleton
- [x] T013 [P] [RTL] [US1] Create `app/dashboard/wallet/error.tsx` — mark `"use client"`; display Arabic error card `"حدث خطأ في تحميل المحفظة"` with a retry button calling `reset()`; styled with `bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]`

**Checkpoint**: `/dashboard/wallet` loads and shows all three balance cards with correct values. `loading.tsx` skeleton renders during SSR wait. `error.tsx` appears if data fetch throws.

---

## Phase 5: User Story 3 — Withdrawal History (Priority: P2)

**Goal**: All past withdrawal requests are displayed in a sorted table with status badges and optional rejection reasons.

**Independent Test**: Seed user with 3 withdrawal records: one `pending` $5.00, one `approved` $10.00 (no reason), one `rejected` $3.00 (reason: "رقم غير صحيح"). Navigate to `/dashboard/wallet`. Verify: 3 rows newest-first; amber "معلق", green "مقبول", red "مرفوض" badges; rejection reason visible under red badge; empty state shows "لا توجد طلبات سحب حتى الآن" when table has no rows.

### Implementation for User Story 3

- [x] T014 [RTL] [US3] Build `WithdrawalsTable` Server Component in `app/dashboard/wallet/_components/WithdrawalsTable.tsx` — accept `requests: WithdrawalRow[]` prop (type: `{ id: string, amount: number, payment_details: string, status: string, rejection_reason: string | null, created_at: string }[]`); empty state: `bg-white rounded-2xl p-12 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] text-center` with "لا توجد طلبات سحب حتى الآن"; render `<table className="w-full">` inside `bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden`; columns: `text-start` headers (التاريخ, المبلغ, وسيلة الدفع, الحالة); date formatted via `new Date(created_at).toLocaleDateString("ar")`; amount `<span dir="ltr">`; payment_details `truncate max-w-[12rem]`; status badge: pending → `bg-amber-50 text-amber-700`, approved → `bg-emerald-50 text-emerald-700`, rejected → `bg-red-50 text-red-700`, all `rounded-full px-2 py-0.5 text-xs font-medium`; if `rejection_reason` and status is rejected: render `<p className="text-xs text-slate-500 mt-1">{rejection_reason}</p>` below badge; hover rows with `hover:bg-slate-50 transition-colors`; NO directional CSS utilities

**Checkpoint**: All 3 rows render with correct status styling. Empty state shows correctly for a new user with no history. Long payment details string is truncated gracefully.

---

## Phase 6: Navigation Integration & Polish

**Purpose**: Wire the wallet page into dashboard navigation and apply final cross-cutting polish.

- [x] T015 [RTL] Identify the dashboard bottom navigation component (likely in `app/dashboard/_components/` or `app/dashboard/layout.tsx`) and add a "المحفظة" nav item linking to `/dashboard/wallet` — use logical icon positioning (no `ml-/mr-`); mark active state when `pathname.startsWith("/dashboard/wallet")`
- [x] T016 [RBAC] Verify that the existing `app/dashboard/layout.tsx` auth guard (redirect to `/login` if unauthenticated, redirect to `/admin` if role is admin) covers the new `/dashboard/wallet` route — no code change needed if the layout already wraps all `/dashboard/**` children; document this confirmation as a comment in `page.tsx`
- [x] T017 [RTL] Audit all new files for constitution compliance: (a) grep for `space-x-`, `translate-x-`, `ml-`, `mr-`, `pl-`, `pr-`, `shadow-lg`, `shadow-xl`, `shadow-2xl` — must be zero occurrences; (b) confirm all monetary `<span>` elements use `dir="ltr"`; (c) confirm all Arabic ARIA labels are present on interactive elements
- [x] T018 Run `npx tsc --noEmit` from repo root — resolve any TypeScript errors introduced by new files before marking the feature complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 completion — **blocks all user story phases**
- **Phase 3 (US2 — Form)**: Depends on Phase 2 (T007 Zod schema + T005 RPC function must exist)
- **Phase 4 (US1 — Stats)**: Depends on Phase 2 (DB queries); can run in parallel with Phase 3 (different files)
- **Phase 5 (US3 — History)**: Depends on Phase 3 (needs `WithdrawalsTable` wired into `page.tsx` built in T011); T014 itself is independently buildable once Phase 2 is done
- **Phase 6 (Polish)**: Depends on all phases being code-complete

### User Story Dependencies

- **US2 (Withdrawal Form)** [P1]: Starts after Phase 2 — T008 (action), T009 (form)
- **US1 (Stats Cards)** [P1]: Starts after Phase 2 — T010 (cards component), T011 (page), T012 (loading), T013 (error) — **all four can run in parallel**
- **US3 (History Table)** [P2]: T014 (table component) can start after Phase 2; wiring into page requires T011 first

### Parallel Opportunities

```
Phase 2 complete → triggers all of the following in parallel:
  ├── T008 (server action)          ← US2 stream
  ├── T009 (WithdrawalForm)         ← US2 stream (after T008)
  ├── T010 (WalletStatsCards)       ← US1 stream
  ├── T011 (page.tsx)               ← US1 stream (after T010, T009, T014)
  ├── T012 (loading.tsx)            ← US1 stream
  ├── T013 (error.tsx)              ← US1 stream
  └── T014 (WithdrawalsTable)       ← US3 stream
```

---

## Implementation Strategy

### MVP First (US1 + US2 — Both P1)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T007) — **do not skip**
3. Complete Phase 3: US2 form submission (T008–T009)
4. Complete Phase 4: US1 stats cards + page (T010–T013)
5. **STOP AND VALIDATE**: The page is fully functional — form submits, balance updates, history populates
6. Complete Phase 5: US3 history table styling polish (T014)

### Incremental Delivery

1. **After Phase 2**: DB is ready, Zod schema ready — can test RPC directly in Supabase Studio
2. **After Phase 3**: Withdrawal submission works end-to-end — core value delivered
3. **After Phase 4**: Full wallet page renders with correct live balances
4. **After Phase 5**: History table is fully styled and RTL-compliant
5. **After Phase 6**: Navigation integrated, TypeScript clean — feature is shippable

---

## Notes

- **[P]** tasks in the same phase touch different files and have no intra-task dependency — safe to run concurrently
- **Migration order matters**: T003 → T004 → T005 → T006 must execute in that order within the same SQL file
- **`user_submit_withdrawal` is user-facing but uses service role**: This is intentional — the DEFINER function encapsulates the privileged write; the Server Action (`createAdminClient`) is the only caller
- **Admin approval UI** for withdrawals is out of scope for this feature — T006 creates the DB functions as stubs for the admin module to call in a future feature (007-admin-withdrawals or similar)
- Commit after each checkpoint to enable easy rollback if a later task introduces a regression
