# Tasks: Packages & Daily Tasks (002-packages-tasks)

**Input**: Design documents from `/specs/002-packages-tasks/`
**Prerequisites**: plan.md ✅ · spec.md ✅ · research.md ✅ · data-model.md ✅ · contracts/server-actions.md ✅ · quickstart.md ✅

**Organization**: Tasks are grouped by user story for independent implementation and testing. No automated test tasks — manual acceptance tests per spec.md acceptance scenarios.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependency)
- **[US#]**: User story this task belongs to
- Exact file paths included in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database migrations, storage bucket, shared validation schemas, and helper utilities. Must be complete before any feature work begins.

- [X] T001 Create migration `supabase/migrations/20260402000003_create_packages_table.sql` — full SQL from `data-model.md` (packages table, trigger, index, RLS policy `packages_select_active`, comments)
- [X] T002 [P] Create migration `supabase/migrations/20260402000004_create_admin_settings_table.sql` — full SQL from `data-model.md` (admin_settings table, trigger, RLS policy `admin_settings_select`, comments)
- [X] T003 [P] Create migration `supabase/migrations/20260402000008_create_financial_audit_log.sql` — full SQL from `data-model.md` (financial_audit_log table, indexes, RLS blocking all user access — no SELECT policy, comments)
- [X] T004 Create migration `supabase/migrations/20260402000005_create_package_sub_requests_table.sql` — full SQL from `data-model.md` (package_subscription_requests table, trigger, partial unique index `pkg_sub_requests_one_pending_per_user WHERE status='pending'`, lookup index, RLS policy `pkg_sub_requests_select_own`, FK refs to packages + users ON DELETE RESTRICT, comments)
- [X] T005 [P] Create migration `supabase/migrations/20260402000006_create_tasks_table.sql` — full SQL from `data-model.md` (tasks table, trigger, composite index on `display_order, id`, RLS policy `tasks_select_active`, comments; NO reward_amount column — per research §1)
- [X] T006 [P] Create migration `supabase/migrations/20260402000007_create_task_completion_logs_table.sql` — full SQL from `data-model.md` (task_completion_logs table, trigger, unique index `task_logs_one_per_day` on `(user_id, task_id, completion_date)`, lookup index, RLS policy `task_logs_select_own`, FK refs to users + tasks ON DELETE RESTRICT, comments)
- [ ] T007 Apply all 6 migrations: run `supabase db push` (or paste each into Supabase Dashboard → SQL Editor in order 000003→000008); verify all 6 tables exist with correct columns, indexes, and RLS enabled
- [ ] T008 Create `proofs` private Supabase Storage bucket: run the bucket creation SQL from `quickstart.md` Step 2 in Supabase Dashboard → SQL Editor; verify bucket appears as **Private** in Dashboard → Storage
- [X] T009 [P] Create Zod validation schemas in `lib/validations/packages-tasks-schemas.ts` — export `receiptUploadSchema` (package_id UUID, receipt File JPEG/PNG ≤5 MB) and `taskProofUploadSchema` (task_id UUID, proof File JPEG/PNG ≤5 MB) — exact rules from `data-model.md` Validation Rules section; export input types

**Checkpoint**: All 6 tables exist in Supabase with correct schema. `proofs` bucket exists as private. Zod schemas compile without TypeScript errors. Visiting `/dashboard` while unauthenticated still redirects to `/login` (existing middleware unchanged).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Seed data required for any user-facing flow to work, and data-fetch helper functions used across all user story phases.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete. The packages grid, purchase modal, and task list all depend on seeded data.

- [ ] T010 Seed the `packages` table: run the seed INSERT from `quickstart.md` Step 3 in Supabase Dashboard → SQL Editor; verify 6 rows with `display_order` 1–6 and `is_active = true`
- [ ] T011 [P] Seed the `admin_settings` table: run the INSERT from `quickstart.md` Step 4 in Supabase Dashboard → SQL Editor; verify 1 row with `is_active = true` and valid `payment_address`
- [ ] T012 [P] Seed the `tasks` table: insert at least 15 active tasks (covering the max `daily_task_count` of any package) using the seed SQL from `quickstart.md` Step 5; verify `SELECT count(*) FROM tasks WHERE is_active = true` returns ≥ 15
- [X] T013 [P] Create data-fetch helper `getPackagesWithUserStatus(userId)` in `app/dashboard/packages/data.ts` as a server-side async function — queries `packages LEFT JOIN package_subscription_requests` (for this user's records) filtered by `is_active = true`, returns array including `userStatus: 'none' | 'pending' | 'active'` per package; uses `createClient()` from `lib/supabase/server.ts`
- [X] T014 [P] Create data-fetch helper `getActivePaymentSetting()` in `app/dashboard/packages/data.ts` — queries `admin_settings WHERE is_active = true LIMIT 1`; returns `PaymentSetting | null`
- [X] T015 [P] Create data-fetch helper `getDailyTasksWithCompletionStatus(userId, dailyTaskCount)` in `app/dashboard/tasks/data.ts` — uses the LEFT JOIN query from `contracts/server-actions.md` (tasks + task_completion_logs for user + CURRENT_DATE), ordered by `display_order ASC, id ASC`, limited to `dailyTaskCount`; returns array with `completionStatus: 'available' | 'pending' | 'approved' | 'rejected'`
- [X] T016 [P] Create data-fetch helper `getUserRequestHistory(userId)` in `app/dashboard/history/data.ts` — two parallel queries: `package_subscription_requests` and `task_completion_logs` for the user, both ordered by `created_at DESC`; returns `{ packageRequests, taskLogs }`

**Checkpoint**: Seed data verified in Supabase. All 4 data-fetch helpers compile with TypeScript. A test query of `getPackagesWithUserStatus` against a test user returns 6 packages with `userStatus: 'none'`.

---

## Phase 3: User Story 1 — Browse & Purchase a Subscription Package (Priority: P1) 🎯 MVP

**Goal**: Users can view all 6 package cards, open a purchase modal with admin payment instructions, upload a transfer receipt, and submit a pending subscription request.

**Independent Test**: Navigate to `/dashboard/packages` — verify 6 premium package cards render with correct data. Click "اشتراك" on any package — verify modal opens with admin payment info. Upload a JPEG image and submit — verify a `pending` row appears in `package_subscription_requests` and the user's `wallet_balance` is unchanged.

### Implementation for User Story 1

- [X] T017 [US1] Implement `purchasePackage` Server Action in `app/dashboard/packages/actions.ts` following the exact 7-step processing flow in `contracts/server-actions.md` Action 1:
  1. Zod validation (`receiptUploadSchema`) — field-level Arabic errors on failure
  2. Auth check via `supabase.auth.getUser()` — abort if no session
  3. Pending-lock check — `SELECT id WHERE user_id = X AND status = 'pending' LIMIT 1`; return Arabic error if found
  4. Package existence check — `SELECT id, price WHERE id = package_id AND is_active = true`
  5. Storage upload — `file.arrayBuffer()` → `supabaseAdmin.storage.from('proofs').upload('receipts/{userId}/{uuid}.ext', buffer)`
  6. DB insert into `package_subscription_requests` with `status = 'pending'` and `amount_paid = package.price` snapshot; on `23505` error → delete uploaded file → return duplicate error
  7. Return `{ success: true }`
- [X] T018 [P] [US1] Create `app/dashboard/packages/page.tsx` as an async Server Component: call `getPackagesWithUserStatus(user.id)` and `getActivePaymentSetting()` in parallel (`Promise.all`); pass both as props to `PackageGrid`; use `max-w-4xl mx-auto px-4 py-8` container layout
- [X] T019 [P] [US1] Create `app/dashboard/packages/_components/PackageGrid.tsx` as a Server Component (RSC, no `"use client"`): renders a responsive grid (`grid grid-cols-1 md:grid-cols-3 gap-6`); maps packages array to `PackageCard` components; passes `paymentSetting` and `userProfile` as context props
- [X] T020 [US1] Create `app/dashboard/packages/_components/PackageCard.tsx` as a Server Component (RSC): premium card styling (`bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:-translate-y-1 transition-all duration-300`); displays: package name, price, daily task count, per-task reward, daily profit, lock icon; active package gets emerald border + badge; "اشتراك" button triggers `PurchaseModal`; disabled indicator for active/pending
- [X] T021 [US1] Create `app/dashboard/packages/_components/PurchaseModal.tsx` as a Client Component (`"use client"` — file upload state, modal open/close, `useFormState`/`useFormStatus`): modal overlay with bottom-sheet on mobile; admin payment block with copy button; file upload zone with drag-and-drop; submit button; Arabic error messages; success closes modal
- [X] T022 [P] [US1] Create `app/dashboard/packages/loading.tsx`: 6-card skeleton grid using `animate-pulse bg-slate-100 rounded-2xl h-64` placeholder blocks in same grid layout as `PackageGrid`
- [X] T023 [P] [US1] Create `app/dashboard/packages/error.tsx`: Arabic error boundary ("تعذر تحميل الباقات") with retry button (`"use client"`)

**Checkpoint**: Full package purchase flow works end-to-end. Invalid file type blocked with Arabic error. Valid receipt upload creates a `pending` row in `package_subscription_requests`. User's `wallet_balance` is unchanged. Active package card (if any) is visually highlighted. Pending purchase blocks a second submission attempt.

---

## Phase 4: User Story 2 — View and Complete Daily Tasks (Priority: P2)

**Goal**: Users with an active subscription can view today's task list (quantity-gated by their package tier), click a task to open a modal with the external link and proof upload zone, and submit a pending task completion log.

**Independent Test**: Log in with an account that has an approved active package (set `current_package_level` via Supabase Dashboard). Navigate to `/dashboard/tasks` — verify the correct number of tasks appears (matching `daily_task_count`). Click "تنفيذ" on a task — verify modal opens with external link and upload zone. Upload a proof image and submit — verify a `pending` row appears in `task_completion_logs` with correct `reward_amount_snapshot` and the task updates to "مكتملة" state.

### Implementation for User Story 2

- [X] T024 [US2] Implement `submitTaskProof` Server Action in `app/dashboard/tasks/actions.ts` following the exact 8-step processing flow in `contracts/server-actions.md` Action 2:
  1. Zod validation (`taskProofUploadSchema`) — field-level Arabic errors
  2. Auth check via `supabase.auth.getUser()`
  3. Active package check — query `public.users` for `current_package_level`; if null → return Arabic "لا يمكن إرسال المهام بدون اشتراك نشط"
  4. Package data fetch — `SELECT daily_profit, daily_task_count FROM packages WHERE name = current_package_level`; compute `reward_amount_snapshot = daily_profit / daily_task_count` (4dp, rounded)
  5. Duplicate-submission check — `SELECT id FROM task_completion_logs WHERE user_id = X AND task_id = Y AND completion_date = CURRENT_DATE LIMIT 1`; return Arabic error if found
  6. Task validation — `SELECT id FROM tasks WHERE id = task_id AND is_active = true`; return error if not found
  7. Storage upload — `file.arrayBuffer()` → `supabaseAdmin.storage.from('proofs').upload('task-proofs/{userId}/{uuid}.ext', buffer)`
  8. DB insert into `task_completion_logs` with `status = 'pending'`, `reward_amount_snapshot`, `completion_date = new Date().toISOString().split('T')[0]`; on `23505` → delete uploaded file → return duplicate error; return `{ success: true }`
- [X] T025 [P] [US2] Create `app/dashboard/tasks/page.tsx` as an async Server Component: auth check → `getUser()` → redirect if no session; query `public.users` for `current_package_level`; if null → render `NoPackageEmptyState` component with link to `/dashboard/packages`; otherwise fetch `package` by level → call `getDailyTasksWithCompletionStatus(user.id, package.daily_task_count)`; compute `rewardPerTask = package.daily_profit / package.daily_task_count`; pass tasks array + `rewardPerTask` as props to `TaskList`; wrap in `max-w-md mx-auto px-4 py-6` container
- [X] T026 [P] [US2] Create `app/dashboard/tasks/_components/TaskList.tsx` as a Server Component (RSC): renders a `space-y-3` list of `TaskItem` components; receives tasks array and `rewardPerTask` as props; if tasks array is empty → renders empty state "لا توجد مهام متاحة اليوم، يرجى العودة لاحقاً"
- [X] T027 [P] [US2] Create `app/dashboard/tasks/_components/TaskItem.tsx` as a Server Component (RSC, < 200 lines): card styling (`bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]`); left side: platform label badge (`bg-slate-100 text-slate-600 text-xs rounded-full px-2 py-1`) + task title (`text-slate-900 font-medium`); right side: reward display `+<span dir="ltr">$X.XXXX</span>` in `text-emerald-600 font-bold`; if `completionStatus !== 'available'` → show "مكتملة ✓" badge (`bg-emerald-50 text-emerald-700 rounded-full px-3 py-1 text-sm`) and disabled button; if available → "تنفيذ" button that triggers `TaskExecutionModal` (rendered as Client Component sibling in the list)
- [X] T028 [US2] Create `app/dashboard/tasks/_components/TaskExecutionModal.tsx` as a Client Component (`"use client"` — `useFormState`/`useFormStatus`, file state, modal open/close; add justification comment): bottom-sheet modal (same overlay pattern as `PurchaseModal`); displays task title as heading; large tappable "افتح الرابط" button (`bg-slate-900 text-white rounded-xl w-full py-4 text-lg font-bold`) with `target="_blank" rel="noopener noreferrer"` external link icon; file upload zone below with dashed border styling matching `PurchaseModal` upload zone; "رفع الإثبات" label; on file selection shows filename; submit button (`bg-emerald-600 text-white rounded-xl`) with pending state; Arabic inline errors (`aria-live="polite"`); on success → close modal + update parent task status to "مكتملة" via `router.refresh()` or optimistic state; dismissible via ✕ and backdrop
- [X] T029 [P] [US2] Create `app/dashboard/tasks/_components/NoPackageEmptyState.tsx` as a Server Component (RSC): centered illustration area + Arabic message "يجب الاشتراك في باقة للوصول إلى المهام اليومية" + emerald CTA button linking to `/dashboard/packages`
- [X] T030 [P] [US2] Create `app/dashboard/tasks/loading.tsx`: animated skeleton list — 5 placeholder cards (`animate-pulse bg-slate-100 rounded-2xl h-20`) matching `TaskItem` dimensions
- [X] T031 [P] [US2] Create `app/dashboard/tasks/error.tsx`: Arabic error boundary ("تعذر تحميل المهام") with retry button (`"use client"`)

**Checkpoint**: Task list renders with correct number of tasks for user's active tier. "تنفيذ" opens modal with external link and upload zone. Proof upload creates `pending` row in `task_completion_logs` with correct `reward_amount_snapshot`. Task tile updates to "مكتملة" after submission. User without active package sees empty state with packages link. Attempting to re-submit the same task is blocked.

---

## Phase 5: User Story 3 — View Submission History (Priority: P3)

**Goal**: Users can view all their past package subscription requests and task completion logs in a tabbed history view, with status badges and rejection reasons.

**Independent Test**: With at least one pending package request and one pending task log in the DB, navigate to `/dashboard/history` — verify both records appear with correct status badge, package name/task title, and submission date. Verify rejection reasons display when present (set one directly in Supabase Dashboard for the test).

### Implementation for User Story 3

- [X] T032 [P] [US3] Create `app/dashboard/history/page.tsx` as an async Server Component: auth check → redirect if no session; call `getUserRequestHistory(user.id)`; pass both arrays as props to `HistoryTabs` client component; wrap in `max-w-md mx-auto px-4 py-6` container
- [X] T033 [US3] Create `app/dashboard/history/_components/HistoryTabs.tsx` as a Client Component (`"use client"` — `useState` for active tab; add comment): renders an elegant segmented control ("طلبات الاشتراك" | "سجل المهام") using `bg-slate-100 rounded-xl p-1` container with active tab pill (`bg-white rounded-lg shadow-sm transition-all`); conditionally renders `SubscriptionRequestList` or `TaskLogList` based on active tab; receives both data arrays as props from RSC parent
- [X] T034 [P] [US3] Create `app/dashboard/history/_components/SubscriptionRequestList.tsx` as a Server Component (RSC — receives pre-fetched data as props): maps `packageRequests` array to history cards; each card (`bg-white rounded-2xl p-4 border border-slate-100`): package name, amount `<span dir="ltr">$X.XX</span>`, submission date (Arabic-formatted using `toLocaleDateString('ar-EG')`), status badge; status badge styles: `pending` → `bg-yellow-50 text-yellow-700`, `approved` → `bg-emerald-50 text-emerald-700`, `rejected` → `bg-red-50 text-red-700`; rejection_reason shown in `text-slate-500 text-sm mt-2` when present; empty state: "لم تقدم أي طلبات اشتراك بعد"
- [X] T035 [P] [US3] Create `app/dashboard/history/_components/TaskLogList.tsx` as a Server Component (RSC — receives pre-fetched data as props): maps `taskLogs` array to history cards with same card styling; shows task title, reward `<span dir="ltr">+$X.XXXX</span>`, completion date, status badge (same palette as above); rejection_reason when present; empty state: "لم تُكمل أي مهام بعد"
- [X] T036 [P] [US3] Create `app/dashboard/history/loading.tsx`: skeleton for 3 history card placeholders in tab layout with `animate-pulse` blocks
- [X] T037 [P] [US3] Create `app/dashboard/history/error.tsx`: Arabic error boundary ("تعذر تحميل سجل الطلبات") with retry button (`"use client"`)

**Checkpoint**: History page renders with correct package requests and task logs for the authenticated user. Status badges use correct colors. Rejection reasons display when present. Empty states show for users with no records. Both tabs switch correctly.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: RTL audit, ARIA labels, micro-animations, navigation integration, and module-wide acceptance test run.

- [X] T038 [P] Integrate all 3 new routes into the dashboard navigation: add "الباقات" (`/dashboard/packages`), "المهام" (`/dashboard/tasks`), and "سجلي" (`/dashboard/history`) links to the dashboard layout or bottom navigation if one exists; ensure active route is visually highlighted
- [X] T039 [P] RTL & Tailwind audit across all new files
- [X] T040 [P] Add Arabic ARIA labels to all interactive elements: `PurchaseModal` (upload zone `aria-label="رفع صورة التحويل"`, submit button, close button), `TaskExecutionModal` (external link button, upload zone, submit, close), `HistoryTabs` (tab buttons), status badges (`role="status"`)
- [X] T041 [P] Add `aria-live="polite"` to dynamic error containers; verify upload zones use `<label>` + hidden `<input>`
- [X] T042 [P] Verify `lib/supabase/admin.ts` is NOT imported in any `"use client"` file
- [X] T043 [P] Verify constitution shadow compliance across all new card components
- [ ] T044 Run full manual acceptance test suite against all acceptance scenarios from `spec.md` User Stories 1–3 (20 scenarios total); document each as Pass/Fail; resolve any failures before marking phase complete
- [ ] T045 Seed database root/admin record for testing (if not already done in `001-auth-profile` T043): ensure at least one user with `current_package_level` set to a valid package name exists for testing Task Story 2 flows

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 completion — BLOCKS all user story phases
- **User Story Phases (3, 4, 5)**: All depend on Phase 2; can proceed in priority order or in parallel with different team members
- **Phase 6 (Polish)**: Depends on all desired user story phases being operationally complete

### User Story Dependencies

- **US1 (P1)**: After Phase 2 — no dependency on US2/US3 — **MVP stop point**
- **US2 (P2)**: After Phase 2 — depends on US1 only for the admin package approval test setup (seeded manually); no code dependency
- **US3 (P3)**: After Phase 2 — reads from tables populated by US1 and US2 flows; data-fetch helper `getUserRequestHistory` is self-contained

### Critical Path

```
T001–T003 (parallel) → T004–T006 (parallel) → T007 (apply migrations)
                                                      ↓
                                               T008 (storage bucket)
                                                      ↓
                          T009 (Zod schemas, parallel with T008)
                                                      ↓
                   T010–T016 (foundational seed + helpers, parallel)
                                                      ↓
                 T017 (Server Action) → T018–T023 (US1 UI, parallel)
                                                      ↓
                 T024 (Server Action) → T025–T031 (US2 UI, parallel)
                                                      ↓
                 T032 → T033 → T034–T037 (US3 UI, parallel)
                                                      ↓
                              T038–T045 (Polish, mostly parallel)
```

### Parallel Opportunities Per Phase

**Phase 1**: T001, T002, T003 can run in parallel — separate migration files. T004, T005, T006 can run in parallel after T001–T003. T009 can run in parallel with T007+T008.

**Phase 2**: T010, T011, T012 (seed) can run in parallel. T013, T014, T015, T016 (data helpers) can all run in parallel — separate files.

**Phase 3 (US1)**: T018 (page), T019 (grid), T022 (loading), T023 (error) can all start in parallel after T017. T020 (PackageCard) can start after T019 scaffold is defined.

**Phase 4 (US2)**: T025 (page), T026 (list), T027 (item), T029 (empty state), T030 (loading), T031 (error) can all run in parallel after T024. T028 (modal) depends on T027 for task data shape.

**Phase 5 (US3)**: T034, T035, T036, T037 can all run in parallel after T032+T033 scaffold.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T009)
2. Complete Phase 2: Foundational (T010–T016)
3. Complete Phase 3: User Story 1 (T017–T023)
4. **STOP and VALIDATE**: Test all 6 acceptance scenarios from spec.md §US1
5. Deploy/demo — users can purchase packages

### Incremental Delivery

1. Phase 1 + 2 → Foundation ready (DB + storage + helpers)
2. US1 complete → Package purchase flow works → **MVP**
3. US2 complete → Daily tasks flow works → daily engagement enabled
4. US3 complete → History view works → user transparency complete
5. Phase 6 → Polish + acceptance test sign-off

### Parallel Team Strategy (2 developers)

After Phase 1 + 2 completion:
- **Dev A**: US1 (T017–T023) — packages grid + purchase modal
- **Dev B**: US2 (T024–T031) — tasks list + task execution modal
- Both complete independently; Phase 5 + 6 are sequential cleanup

---

## Notes

- `[P]` tasks modify different files with no shared dependency — safe to parallelize
- All `"use client"` boundaries carry a required justification comment
- All USD amounts use `<span dir="ltr">` wrappers — constitution-compliant RTL exception
- `supabaseAdmin` client used exclusively in `actions.ts` files — never in `"use client"` components
- `reward_amount_snapshot` is always computed server-side from DB values — never from client input
- `completion_date` is always set server-side — never from FormData
- Storage paths (receipts/, task-proofs/) are stored — never public signed URLs in DB
- Commit after each phase checkpoint before starting the next phase
