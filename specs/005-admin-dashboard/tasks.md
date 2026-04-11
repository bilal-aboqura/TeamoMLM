# Tasks: Admin Dashboard (لوحة تحكم الإدارة)

**Branch**: `005-admin-dashboard`  
**Input**: `specs/005-admin-dashboard/` — plan.md, spec.md, research.md, data-model.md  
**Labels**: `[SCHEMA]` database/migration, `[RBAC]` access control, `[RTL]` UI/RTL, `[MANUAL-FIN]` financial mutation, `[P]` parallelizable

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema additions and Zod validation schemas — must exist before any feature code can reference DB columns or validate inputs.

- [x] T001 [SCHEMA] Write migration `supabase/migrations/20260406000009_admin_dashboard_schema.sql`: add `leadership_level SMALLINT NULL CHECK (BETWEEN 1 AND 6)` column to `public.users`; add `reviewed_at TIMESTAMPTZ NULL` and `reviewed_by UUID NULL FK → public.users(id) ON DELETE RESTRICT` to `public.package_subscription_requests` and `public.task_completion_logs`; add partial indexes `WHERE status = 'pending'` on both request tables

- [x] T002 [SCHEMA] In the same migration `supabase/migrations/20260406000009_admin_dashboard_schema.sql`: create PostgreSQL function `admin_approve_task(p_log_id UUID, p_admin_id UUID)` — `SECURITY DEFINER`, within one transaction: (1) fetch `task_completion_logs` row, raise exception if `status != 'pending'`, (2) UPDATE status=approved + reviewed_at/by, (3) UPDATE `public.users` wallet_balance += reward_amount_snapshot AND total_earned += reward_amount_snapshot, (4) INSERT row into `financial_audit_log`

- [x] T003 [SCHEMA] In the same migration: create `admin_reject_task(p_log_id UUID, p_admin_id UUID, p_reason TEXT)` — `SECURITY DEFINER`, transaction: (1) guard pending status, (2) UPDATE status=rejected + rejection_reason + reviewed_at/by, (3) INSERT audit log row. wallet_balance NOT modified.

- [x] T004 [SCHEMA] In the same migration: create `admin_approve_deposit(p_request_id UUID, p_admin_id UUID)` — `SECURITY DEFINER`, transaction: (1) fetch `package_subscription_requests` + join `packages.name`, guard pending status, (2) UPDATE request status=approved + reviewed_at/by, (3) UPDATE `public.users` SET current_package_level = packages.name WHERE id = request.user_id, (4) INSERT audit log row

- [x] T005 [SCHEMA] In the same migration: create `admin_reject_deposit(p_request_id UUID, p_admin_id UUID, p_reason TEXT)` — `SECURITY DEFINER`, transaction: (1) guard pending, (2) UPDATE status=rejected + reason + reviewed_at/by, (3) INSERT audit log. users.current_package_level NOT modified.

- [x] T006 [SCHEMA] In the same migration: create `get_referral_tree(p_root_id UUID, p_max_depth INT DEFAULT 5)` — recursive CTE on `public.users.invited_by` chain downward from root, returns columns: `id, full_name, referral_code, leadership_level, parent_id, depth`. Depth capped at `p_max_depth`.

- [x] T007 [P] [SCHEMA] Apply migration locally: `npx supabase db push` (or `supabase migration up`) and verify all 6 schema objects created without error

- [x] T008 [P] Create `lib/validations/admin-schemas.ts`: export Zod schemas — `approveDepositSchema` (`{requestId: z.string().uuid()}`), `rejectDepositSchema` (`{requestId, reason: z.string().min(1).trim()}`), `approveTaskSchema` (`{logId: z.string().uuid()}`), `rejectTaskSchema` (`{logId, reason: z.string().min(1).trim()}`), `updateUserLevelSchema` (`{userId: z.string().uuid(), level: z.number().int().min(1).max(6)}`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Middleware update + Admin layout shell. Nothing else can render until routing is protected.

⚠️ **CRITICAL**: Complete this phase entirely before any admin page code is written.

- [x] T009 [RBAC] Update `middleware.ts`: add three ordered rules before existing checks — (1) `/admin/**` + unauthenticated → redirect `/login`; (2) `/admin/**` + authenticated + role from JWT `app_metadata.role !== 'admin'` → redirect `/dashboard`; (3) `/dashboard/**` + authenticated + role `=== 'admin'` → redirect `/admin`. Keep all existing `/dashboard` unauthenticated-redirect and auth-page redirect logic intact. Also add `/admin` to the `config.matcher` pattern.

- [x] T010 [RBAC] Update `app/dashboard/layout.tsx` (or create it if it does not yet exist as a layout): add a server-side role check — call `createClient()`, get `supabase.auth.getUser()`, then fetch `role` from `public.users` using `createAdminClient()`; if `role === 'admin'`, call `redirect('/admin')`

- [x] T011 [RTL] Create `app/admin/_components/AdminSidebar.tsx` (Server Component): sticky sidebar `w-64` shown on `lg:` and above (`hidden lg:flex flex-col`), fixed to viewport end (RTL). Contains: brand name at top, `<nav>` with 5 links (النظرة العامة→`/admin/overview`, الإيداعات المعلقة→`/admin/deposits`, المهام المعلقة→`/admin/tasks`, المستخدمون→`/admin/users`, شجرة الإحالات→`/admin/users` with tree query). Extract active-link highlighting to a thin `SidebarLink.tsx` `"use client"` sub-component using `usePathname()`. Styling: `bg-white border-s border-slate-100`, links `hover:bg-slate-50 rounded-xl transition-all duration-200`.

- [x] T012 [P] [RTL] Create `app/admin/_components/AdminDrawer.tsx` (`"use client"`): mobile drawer overlay sliding in from end. `useState(open)` toggled by a trigger. Contains same nav links as sidebar. Backdrop click closes it.

- [x] T013 [P] [RTL] Create `app/admin/_components/AdminMobileHeader.tsx` (`"use client"`): sticky top bar `lg:hidden`. Imports `AdminDrawer`, renders hamburger icon button to open it. Logo/brand name centered.

- [x] T014 [RBAC] [RTL] Create `app/admin/layout.tsx` (Server Component — no `"use client"`): (1) call `createClient()` → `supabase.auth.getUser()` → if no user, `redirect('/login')`; (2) call `createAdminClient()` → fetch `role` from `public.users` by user id → if `role !== 'admin'`, `redirect('/dashboard')`; (3) render layout grid: `<AdminSidebar>` on the end (desktop) + `<AdminMobileHeader>` (mobile) + `<main>` content area with `p-6 lg:pe-72` to account for sidebar width.

- [x] T015 Create `app/admin/page.tsx`: single line — `import { redirect } from 'next/navigation'; export default function AdminRoot() { redirect('/admin/overview'); }`

- [x] T016 [P] Create `app/admin/loading.tsx`: full-page admin skeleton with pulse animation — sidebar placeholder block + 3 content skeleton cards (`animate-pulse bg-slate-100 rounded-2xl`)

- [x] T017 [P] Create `app/admin/error.tsx` (`"use client"`): Arabic error boundary — "حدث خطأ في لوحة التحكم" heading + retry button calling `reset()`

**Checkpoint**: Navigate to `/admin` as a `role='user'` account → verify redirect to `/dashboard`. Navigate as `role='admin'` → see admin layout shell with sidebar. Navigate to `/dashboard` as admin → redirect to `/admin`.

---

## Phase 3: US1 — Secure Admin Access & Layout (Priority: P1) 🎯

**Goal**: Complete the admin layout shell with all navigation working and fully verified.

**Independent Test**: Login as admin → `/admin` → see sidebar with 5 nav links, glassmorphic top bar on mobile, all links render their destination pages (even if empty). Login as non-admin → `/admin` → redirect to `/dashboard`. Unauthenticated → `/admin` → redirect to `/login`.

- [x] T018 [US1] [RTL] Verify and polish `AdminSidebar.tsx`: confirm all 5 links are correct hrefs, active state highlights correctly per `usePathname()`, `transition-all duration-200 hover:-translate-y-0.5` on link hover, `text-slate-900` active / `text-slate-500` inactive text color

- [x] T019 [P] [US1] [RTL] Create `app/admin/overview/loading.tsx`: 3 skeleton stat card placeholders (`animate-pulse bg-slate-100 h-28 rounded-2xl`)

- [x] T020 [P] [US1] [RTL] Create `app/admin/deposits/loading.tsx`: table skeleton — 5 skeleton rows (`animate-pulse bg-slate-100 h-12 rounded-xl`) under a skeleton header

- [x] T021 [P] [US1] [RTL] Create `app/admin/tasks/loading.tsx`: same pattern as deposits loading

- [x] T022 [P] [US1] [RTL] Create `app/admin/users/loading.tsx`: same pattern as deposits loading

**Checkpoint**: US1 complete. Admin shell is navigable and all redirects verified.

---

## Phase 4: US2 — Overview Dashboard (Priority: P1)

**Goal**: Overview page with three accurate live stat cards.

**Independent Test**: Seed DB with 10 users, 3 pending deposits, 7 pending tasks → load `/admin/overview` → stat cards show exactly 10 / 3 / 7.

- [x] T023 [US2] [RTL] Create `app/admin/overview/_components/StatCard.tsx` (Server Component, < 50 lines): props `{ title: string; value: number; variant: 'neutral' | 'warning' }`. Renders a `bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]` card. `warning` variant: amber ring `ring-1 ring-amber-200` + number in `text-amber-600`. `neutral`: number in `text-slate-900`. Micro-animation: `hover:-translate-y-1 transition-all duration-300`.

- [x] T024 [US2] Create `app/admin/overview/page.tsx` (RSC async): call `createAdminClient()`, run three `Promise.all` count queries — `COUNT(*)` on `public.users`, `COUNT(*)` on `package_subscription_requests WHERE status='pending'`, `COUNT(*)` on `task_completion_logs WHERE status='pending'`. Render three `<StatCard>` components side by side in a responsive grid (`grid grid-cols-1 sm:grid-cols-3 gap-4`). Labels: "إجمالي المستخدمين" (neutral), "الإيداعات المعلقة" (warning), "المهام المعلقة" (warning).

- [x] T025 [P] [US2] Create `app/admin/overview/error.tsx` (`"use client"`): Arabic "تعذر تحميل إحصائيات النظرة العامة" + retry button

**Checkpoint**: US2 complete. Overview stats accurate on load, update on manual refresh.

---

## Phase 5: US3 — Pending Deposits Approval (Priority: P1)

**Goal**: Admin can view pending deposits table, inspect receipt image, and approve or reject each request one at a time.

**Independent Test**: Seed 2 pending deposit requests → load `/admin/deposits` → see 2 rows → click عرض on first → signed receipt image visible → click موافقة → row disappears from table, user's `current_package_level` updated in DB, audit log row inserted. Second row: click رفض with empty reason → Save stays disabled → enter reason → رفض confirms → row disappears, `rejection_reason` persisted.

- [x] T026 [MANUAL-FIN] Create server actions in `app/admin/actions.ts` (`"use server"`): implement `approveDeposit(requestId: string)` and `rejectDeposit(requestId: string, reason: string)` — each: (1) `createClient()` → `getUser()` → fetch role from `public.users` → reject if not admin; (2) validate input with `approveDepositSchema` / `rejectDepositSchema` from `lib/validations/admin-schemas.ts`; (3) `createAdminClient().rpc('admin_approve_deposit', ...)` / `.rpc('admin_reject_deposit', ...)`; (4) return `{ success: true }` or `{ error: '<Arabic message>' }`. Map Supabase RPC exception "not_pending" to Arabic "تمت معالجة هذا الطلب بالفعل".

- [x] T027 [US3] Create `app/admin/deposits/page.tsx` (RSC async): use `createAdminClient()` to query all `package_subscription_requests WHERE status='pending'` with joins on `users` (full_name, phone_number) and `packages` (name). For each row, generate a signed URL via `createAdminClient().storage.from('proofs').createSignedUrl(row.receipt_url, 300)`. Pass enriched array to `<DepositsTable>`.

- [x] T028 [US3] [RTL] Create `app/admin/deposits/_components/DepositsTable.tsx` (`"use client"`): renders `<table>` with RTL headers (المستخدم | الهاتف | الباقة | المبلغ | التاريخ | الإجراء). Each row has a "عرض" button. `useState(selectedRow)` controls which row opens `<ProofViewerModal>`. After action resolves: call `router.refresh()` to trigger RSC re-fetch. Empty state: "لا توجد إيداعات معلقة حالياً" centered. Row hover: `hover:bg-slate-50`. Status badge if needed: soft amber `bg-amber-50 text-amber-700 rounded-full px-2 py-0.5 text-xs`.

- [x] T029 [US3] [RTL] Create `app/admin/_components/ProofViewerModal.tsx` (`"use client"`, shared by deposits and tasks): props `{ open: boolean; imageUrl: string; title: string; onClose: ()=>void; onApprove: ()=>Promise<void>; onReject: (reason: string)=>Promise<void> }`. Full-screen overlay `bg-slate-900/60 backdrop-blur-sm`. Centered panel with `<Image>` (Next.js) for the signed URL — `onError` fallback shows "الصورة غير متاحة" Arabic message. Two buttons: موافقة (`bg-emerald-600`) and رفض (`border border-red-300 text-red-600`). Clicking رفض reveals a `<textarea>` for rejection reason + "تأكيد الرفض" button (`bg-red-600`) disabled while reason is empty/whitespace. Shows loading spinner on both buttons during pending action. Clicking backdrop closes modal.

- [x] T030 [P] [US3] Create `app/admin/deposits/error.tsx` (`"use client"`): "تعذر تحميل قائمة الإيداعات المعلقة" + retry

**Checkpoint**: US3 complete. Approve/reject flow verified with audit log entries in DB.

---

## Phase 6: US4 — Pending Tasks Approval (Priority: P1)

**Goal**: Admin can view pending task submissions, inspect proof image, and approve (crediting wallet) or reject each — atomically.

**Independent Test**: Seed a `pending` task_completion_log with `reward_amount_snapshot = 0.5` → load `/admin/tasks` → see row → click عرض → proof image visible → click موافقة → row disappears, `wallet_balance` in `public.users` incremented by exactly `0.5000`, audit log row inserted. Reject path: reason required, wallet unchanged.

- [x] T031 [MANUAL-FIN] In `app/admin/actions.ts`, add `approveTask(logId: string)` and `rejectTask(logId: string, reason: string)`: same pattern as deposit actions but calling `admin_approve_task` and `admin_reject_task` RPCs. Map "not_pending" exception to "تمت معالجة هذا الطلب بالفعل".

- [x] T032 [US4] Create `app/admin/tasks/page.tsx` (RSC async): query all `task_completion_logs WHERE status='pending'` with joins on `users` (full_name) and `tasks` (title). Generate signed URL for each `proof_url`. Pass to `<TasksTable>`.

- [x] T033 [US4] [RTL] Create `app/admin/tasks/_components/TasksTable.tsx` (`"use client"`): same structure as `DepositsTable` but columns: المستخدم | المهمة | المكافأة | التاريخ | الإجراء. Reward column: `+$X.XX` format with `dir="ltr"` span. Reuses shared `<ProofViewerModal>` from `app/admin/_components/`. Empty state: "لا توجد مهام معلقة حالياً".

- [x] T034 [P] [US4] Create `app/admin/tasks/loading.tsx` and `app/admin/tasks/error.tsx`: skeleton rows + "تعذر تحميل قائمة المهام المعلقة" error boundary respectively

**Checkpoint**: US4 complete. Atomic wallet credit verified — cannot have status=approved without corresponding balance increment.

---

## Phase 7: US5 — User Management & Leadership Level (Priority: P2)

**Goal**: Paginated searchable user table; admin can change any user's Leadership Level (L1–L6).

**Independent Test**: Load `/admin/users` → see paginated table (20 rows/page). Type "01" in search → table filters. Click تعديل on any user → panel opens with L1–L6 dropdown. Select L3 → save → `leadership_level = 3` in DB, table row updates, toast "تم تحديث مستوى القيادة بنجاح" shown.

- [x] T035 [MANUAL-FIN] In `app/admin/actions.ts`, add `updateUserLevel(userId: string, level: number)`: (1) admin role guard; (2) validate with `updateUserLevelSchema`; (3) `createAdminClient().from('users').update({ leadership_level: level }).eq('id', userId)`; (4) return success or Arabic error.

- [x] T036 [US5] Create `app/admin/users/page.tsx` (RSC async): read `searchParams.search` (string | undefined) and `searchParams.page` (number, default 0). Query `public.users` with `createAdminClient()`: if search present, `.ilike('full_name', '%{search}%')` OR `.ilike('phone_number', '%{search}%')` (use `.or()`). `.order('created_at', { ascending: false })`. `.range(page*20, page*20+19)`. Also query total count for pagination. Pass `{ users, totalCount, page, search }` to `<UserSearchForm>` and `<UsersTable>`.

- [x] T037 [US5] [RTL] Create `app/admin/users/_components/UserSearchForm.tsx` (`"use client"`): controlled text input + "بحث" submit button. On submit: `router.push('/admin/users?search={value}&page=0')`. On clear: push without search param. Pre-fills from `defaultValue={search}` prop.

- [x] T038 [US5] [RTL] Create `app/admin/users/_components/UsersTable.tsx` (`"use client"`): props `{ users, totalCount, page, search }`. Renders RTL table: الاسم | الهاتف | الباقة | الرصيد | المستوى | تاريخ التسجيل | الإجراءات. Level column: renders "L{n}" badge (`bg-emerald-50 text-emerald-700`) or "—" if null. Each row has "تعديل" button (opens `<EditLevelPanel>`) and "عرض الشجرة" link (`/admin/users/{id}/tree`). Pagination controls at bottom: previous/next buttons updating `?page=` param via `router.push`. After `updateUserLevel` action: `router.refresh()`.

- [x] T039 [US5] [RTL] Create `app/admin/users/_components/EditLevelPanel.tsx` (`"use client"`): slide-over panel fixed to viewport end. Props `{ user: UserRow; onClose: ()=>void }`. Read-only user details (name, phone, current balance). `<select>` with 6 options — value 1 "L1" through value 6 "L6", preselected to user's current `leadership_level` or empty if null. "حفظ" button calls `updateUserLevel(user.id, selectedLevel)` Server Action. On success: toast "تم تحديث مستوى القيادة بنجاح" (toast via `useState` ephemeral message, auto-dismiss 3s). Calls `onClose()` + triggers `router.refresh()`.

- [x] T040 [P] [US5] Create `app/admin/users/error.tsx` (`"use client"`): "تعذر تحميل قائمة المستخدمين" + retry

**Checkpoint**: US5 complete. Leadership-level change reflected in DB and in table row without full page reload.

---

## Phase 8: US6 — Referral Tree (Priority: P2)

**Goal**: Visual indented collapsible tree rooted at any user, up to 5 levels deep.

**Independent Test**: Seed root user → 2 direct referees → 1 grandchild each. Click "عرض الشجرة" for root → tree renders 3 levels with CSS connector lines. Collapse a level-1 node → its children hidden. User with no referees → single root node + "لا يوجد مستخدمون تحت هذا الحساب" message.

- [x] T041 [US6] Create `app/admin/users/[id]/tree/page.tsx` (RSC async): params `{ id: string }`. Call `createAdminClient().rpc('get_referral_tree', { p_root_id: id, p_max_depth: 5 })`. Receive flat array `{ id, full_name, referral_code, leadership_level, parent_id, depth }`. Convert to nested `TreeNode[]` in JS (single pass: build a `Map<id, TreeNode>`, then attach children to parents). Pass root `TreeNode` to `<ReferralTree>`. If no root found → show "المستخدم غير موجود".

- [x] T042 [US6] [RTL] Create `app/admin/users/_components/ReferralTree.tsx` (`"use client"`): props `{ root: TreeNode }` where `TreeNode = { id: string; full_name: string; referral_code: string; leadership_level: number | null; children: TreeNode[] }`. `useState<Set<string>>(collapsedIds)` — root starts expanded (not in set). Recursive `<TreeNodeRow>` sub-component (< 80 lines): renders node card + collapse toggle if `children.length > 0`. Indentation via `ps-6` per depth level. CSS connector lines: `relative before:absolute before:top-5 before:end-full before:w-5 before:border-t-2 before:border-slate-200` on each non-root node; parent container has `border-e-2 border-slate-200` vertical line. Each node card: `bg-white rounded-xl px-4 py-3 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]` — shows full_name, referral_code `text-slate-500 text-sm`, leadership_level badge `bg-emerald-50 text-emerald-700`. If root has no children: show "لا يوجد مستخدمون تحت هذا الحساب" in muted Arabic text below root node.

- [x] T043 [P] [US6] Create `app/admin/users/[id]/tree/loading.tsx`: spine of indented skeleton nodes (3 levels, `animate-pulse`) simulating the tree structure

- [x] T044 [P] [US6] Create `app/admin/users/[id]/tree/error.tsx` (`"use client"`): "تعذر تحميل شجرة الإحالة" + retry

**Checkpoint**: US6 complete. Tree renders correctly for 3-generation seeded hierarchy. Collapse/expand works without page reload.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final hardening, type safety verification, and UX polish across all admin pages.

- [x] T045 [RBAC] Security audit: grep for any `createAdminClient()` call inside `"use client"` files — must be zero. Confirm `SUPABASE_SERVICE_ROLE_KEY` appears only in `.env.local` and server-only files.

- [x] T046 [RTL] Audit all new components for directional Tailwind utilities (`ml-`, `mr-`, `pl-`, `pr-`, `text-left`, `text-right`) — replace every instance with logical equivalents (`ms-`, `me-`, `ps-`, `pe-`, `text-start`, `text-end`). Constitution §II: non-negotiable.

- [x] T047 Run `npx tsc --noEmit` — resolve all TypeScript errors to zero. Pay special attention to: Supabase RPC return types, `searchParams` typing in Next.js 15 (now a `Promise`), and `TreeNode` recursive type.

- [x] T048 [P] Run `npm run build` — confirm production build completes with zero errors. Resolve any missing `"use client"` directives caught by the React Server Component boundary checks.

- [ ] T049 [RTL] Verify `ProofViewerModal` image fallback: test with a purposely broken signed URL → confirm "الصورة غير متاحة" Arabic placeholder renders (not a broken image icon).

- [ ] T050 [MANUAL-FIN] Verify audit log completeness: after one approve-deposit, one approve-task, and one reject-task action, query `financial_audit_log` — confirm exactly 3 rows inserted with correct `record_id`, `record_type`, `old_status='pending'`, `new_status`, and `changed_by` (admin user ID).

- [ ] T051 [MANUAL-FIN] Race-condition test: call `approveDeposit` twice with the same `requestId` in rapid succession (simulate via two sequential Server Action calls in a test script) — confirm second call returns "تمت معالجة هذا الطلب بالفعل" and does NOT double-update the user's package.

- [x] T052 [P] Update `supabase/seed.sql` (or create a dev-only seed snippet) to insert one seeded admin user record with `role='admin'` for local development testing, if one does not already exist.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 (T001–T008 complete) — **BLOCKS all feature phases**
- **Phase 3 (US1)**: Depends on Phase 2 complete
- **Phase 4 (US2)**: Depends on Phase 2 complete — can run in parallel with Phase 3
- **Phase 5 (US3)**: Depends on Phase 2 + T026 (actions.ts created first)
- **Phase 6 (US4)**: Depends on Phase 2 + T029 (ProofViewerModal) + T031 (task actions)
- **Phase 7 (US5)**: Depends on Phase 2 only (standalone feature)
- **Phase 8 (US6)**: Depends on Phase 2 + T006 (get_referral_tree RPC)
- **Phase 9 (Polish)**: Depends on all phases complete

### User Story Dependencies

- **US1 (Admin Layout)**: Phase 2 complete → independent
- **US2 (Overview)**: Phase 2 complete → independent
- **US3 (Deposits)**: Phase 2 complete, T026 done → independent of US1/US2
- **US4 (Tasks)**: Phase 2 complete, T029 done, T031 done → independent
- **US5 (Users)**: Phase 2 complete → independent
- **US6 (Referral Tree)**: Phase 2 complete, T006 done → independent

### Critical Path (single developer, sequential)

```
T001→T002→T003→T004→T005→T006 (migration) → T007 (apply) 
→ T008 (schemas) → T009 (middleware) → T010 (dashboard layout guard)
→ T011→T012→T013→T014→T015 (admin shell) → T016→T017 (loading/error)
→ T023→T024 (overview) → T026→T027→T028→T029→T030 (deposits)
→ T031→T032→T033→T034 (tasks) → T035→T036→T037→T038→T039→T040 (users)
→ T041→T042→T043→T044 (tree) → T045→T046→T047→T048→T049→T050→T051→T052 (polish)
```

---

## Parallel Opportunities

```
# Phase 1 — all migration tasks sequential (same file), T008 parallel:
T001 → T002 → T003 → T004 → T005 → T006 → T007
                                              └─ T008 (parallel after T007)

# Phase 2 — after T009, T010; sidebar + drawer + header are independent:
T009 → T010 → T011
              ├─ T012 [P]
              └─ T013 [P]

# Phase 3 loading states — all 4 parallel after T014:
T014 → T015 → T016 [P], T017 [P]
              T019 [P], T020 [P], T021 [P], T022 [P]

# Phase 5 + 6 — ProofViewerModal (T029) can be built parallel to DepositsTable (T028):
T026 → T027 → T028 [parallel with T029]

# Phase 7 — search form, table, and edit panel independent of each other:
T036 → T037 [P], T038 [P], T039 [P]
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3 only)

1. Complete Phase 1 (DB migration + Zod schemas)
2. Complete Phase 2 (middleware + admin shell)
3. Complete Phase 3 (US1 — layout polish)
4. Complete Phase 4 (US2 — overview stats)
5. Complete Phase 5 (US3 — deposit approvals)
6. **STOP & VALIDATE**: Admin can log in, see stats, approve/reject deposits
7. Deploy/demo — core financial approval loop is live

### Incremental Delivery

1. Setup + Foundational → admin shell accessible ✅
2. Add US2 (Overview) → stats visible ✅
3. Add US3 (Deposits) → financial gating works ✅
4. Add US4 (Tasks) → payout loop complete ✅
5. Add US5 (Users) → leadership management live ✅
6. Add US6 (Tree) → network visualization live ✅
7. Polish → hardened, type-safe, constitution-compliant ✅

---

## Notes

- `[P]` = task touches a different file from concurrent tasks; safe to run in parallel
- `[SCHEMA]` = generates a SQL migration — never edit already-applied migration files (constitution)
- `[MANUAL-FIN]` = modifies financial state — double-check atomic behavior and audit log
- `[RBAC]` = access control logic — must be verified by negative test (wrong role → redirect)
- `[RTL]` = UI component — must use logical CSS properties exclusively
- `ProofViewerModal` lives in `app/admin/_components/` (shared); both deposits and tasks import it
- `app/admin/actions.ts` is a single file containing all 5 server actions — keep < 200 lines by extracting helper functions if needed (constitution §V)
- The `current_package_level` column on `public.users` is TEXT (package name). `admin_approve_deposit` RPC fetches the package name and writes it there. This is documented tech debt (should be UUID FK) — do not change it in this feature.
