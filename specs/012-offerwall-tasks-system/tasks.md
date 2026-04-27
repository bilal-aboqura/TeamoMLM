# Tasks: Apps Offerwall & Tasks System

**Branch**: `012-offerwall-tasks-system`  
**Input**: Design documents from `/specs/012-offerwall-tasks-system/`  
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅ | quickstart.md ✅

**Organization**: Tasks are grouped by user story (P1 → P2 → P3) to enable independent implementation and testing of each story. No tests were requested — implementation tasks only.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: New schema validation file, extend existing validation schemas, and prepare storage path conventions.

- [ ] T001 Create `lib/validations/offerwall-schemas.ts` with `offerwallProofUploadSchema` (UUID task_id, File proof: JPEG/PNG/WebP ≤10 MB) per contracts/contracts.md
- [ ] T002 Extend `lib/validations/admin-schemas.ts` — add `description: z.string().min(10).max(2000)` to `createTaskSchema` and `updateTaskSchema`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database migration that creates both new tables, all RLS policies, and 3 new RPC functions. **Nothing else can be built until this is applied.**

⚠️ **CRITICAL**: All user story phases depend on this migration being applied.

- [ ] T003 Create `supabase/migrations/20260425000023_offerwall_tasks_system.sql` — this single migration must contain ALL of the following in order:
  1. `ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT ''` + comment
  2. Admin-write RLS policy `tasks_admin_all` on `public.tasks`
  3. `CREATE TABLE public.offerwall_submissions` with all columns, CHECK constraint on status, `updated_at` trigger, unique partial index `offerwall_submissions_one_active` on `(user_id, task_id) WHERE status IN ('pending','approved')`, performance indexes, RLS policies (`offerwall_sub_select_own`, `offerwall_sub_admin_all`)
  4. `CREATE TABLE public.wallet_transactions` with all columns, CHECK constraints, index, RLS policies (`wallet_tx_select_own`, `wallet_tx_admin_all`)
  5. `CREATE OR REPLACE FUNCTION public.user_submit_offerwall_proof(p_task_id UUID, p_screenshot_path TEXT)` — SECURITY DEFINER, auth.uid() identity, active-submission guard, 3-rejection cap guard, INSERT to offerwall_submissions
  6. `CREATE OR REPLACE FUNCTION public.admin_approve_offerwall_submission(p_submission_id UUID)` — SECURITY DEFINER, auth.uid() + role='admin' guard, FOR UPDATE lock, status='pending' guard, UPDATE submission, UPDATE users.wallet_balance + total_earned, INSERT wallet_transactions, INSERT financial_audit_log
  7. `CREATE OR REPLACE FUNCTION public.admin_reject_offerwall_submission(p_submission_id UUID, p_reason TEXT)` — SECURITY DEFINER, auth.uid() + role='admin' guard, FOR UPDATE lock, UPDATE submission to 'rejected', INSERT financial_audit_log
  - Full SQL per `data-model.md` sections 2–5

**Checkpoint**: Apply migration with `supabase db push`. Verify tables exist and RLS is enabled. No UI work should begin before this.

---

## Phase 3: User Story 1 — User Discovers and Completes a Task (Priority: P1) 🎯 MVP

**Goal**: Users see the offerwall grid, tap a task, read instructions with an external action link, upload a screenshot, and see their card transition to "Pending Review."

**Independent Test**: Create one active task (with description + reward_amount + external_url) in Supabase → load `/dashboard/tasks` → verify task card shows "متاح" badge → open detail modal → verify "Go to App" link opens external_url → upload valid screenshot → verify card changes to "Pending Review" badge.

### Implementation for User Story 1

- [ ] T004 [US1] Rewrite `app/dashboard/tasks/actions.ts` — replace `submitTaskProof` with `submitOfferwallProof(_prevState, formData)` using `offerwallProofUploadSchema`; upload file to `proofs` bucket at `task-proofs/{user_id}/{uuid}.{ext}`; on upload success call `user_submit_offerwall_proof` RPC via `createClient()` (NOT admin client); on RPC failure delete uploaded file; map RPC exceptions (`task_not_found`, `already_submitted`, `max_attempts_reached`) to Arabic error messages; return `SubmitProofResult` type per contracts/contracts.md
- [ ] T005 [US1] Rewrite `app/dashboard/tasks/data.ts` — add `fetchOfferwallTasks(userId: string): Promise<OfferwallTask[]>`; query `public.tasks` (is_active=true) joined with `public.offerwall_submissions` for the current user; compute `user_status` using `deriveStatus()` helper (`completed` if any approved, `pending` if any pending, `locked` if rejected count ≥ 3, else `available`); return typed `OfferwallTask[]` per contracts/contracts.md
- [ ] T006 [P] [US1] Create `app/dashboard/tasks/_components/OfferwallGrid.tsx` — Server Component wrapper that receives `OfferwallTask[]` as props; renders a responsive grid (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`); maps each task to `<TaskCard>`; renders empty state ("لا توجد مهام متاحة حالياً" with Inbox icon from lucide-react) when array is empty; RTL-first, no emoji, Tailwind only
- [ ] T007 [P] [US1] Update `app/dashboard/tasks/_components/TaskCard.tsx` — accept `OfferwallTask` prop; display task title, platform_label, reward_amount (emerald-600 text); render status badge based on `user_status` using these Tailwind classes: `available`→`bg-emerald-50 text-emerald-700`, `pending`→`bg-amber-50 text-amber-700`, `completed`→`bg-slate-100 text-slate-600`, `locked`→`bg-red-50 text-red-700`; map statuses to Arabic labels: "متاح" / "قيد المراجعة" / "مكتمل" / "مقفل"; add lucide-react icon per status (CircleCheck, Clock, CheckCircle2, Lock); card has `hover:-translate-y-1 transition-all duration-300` micro-animation; clicking opens `TaskDetailModal`; add `"use client"` directive with justification comment
- [ ] T008 [US1] Update `app/dashboard/tasks/_components/TaskDetailModal.tsx` — bottom-sheet modal (`"use client"`); display task title, description (full text), reward_amount; show prominent "اذهب إلى التطبيق" button (emerald-600, ExternalLink icon from lucide-react) that opens `external_url` in a new tab (`target="_blank" rel="noopener noreferrer"`); below that, conditionally render the proof upload form ONLY when `user_status === 'available'`; form uses `useActionState(submitOfferwallProof, { success: false, idle: true })`; drag-and-drop file zone (`border-dashed border-2 border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all`); show inline error messages mapped from `SubmitProofResult.error`; on success close modal and call `router.refresh()`; when `user_status === 'pending'` show "في انتظار المراجعة" notice; when `user_status === 'locked'` show "وصلت للحد الأقصى من المحاولات" notice with Lock icon
- [ ] T009 [US1] Update `app/dashboard/tasks/page.tsx` — async Server Component; call `fetchOfferwallTasks(userId)` (get userId from `createClient().auth.getUser()`); pass result to `<OfferwallGrid tasks={tasks} />`; add page title "عروض المهام" with subtitle; use `createClient()` for user identity; add `export const dynamic = 'force-dynamic'`
- [ ] T010 [US1] Add `app/dashboard/tasks/loading.tsx` — skeleton grid matching 3-column layout; 6 skeleton cards with `animate-pulse bg-slate-100 rounded-2xl h-32`; RTL-compatible
- [ ] T011 [US1] Add/update `app/dashboard/tasks/error.tsx` — display Arabic error message "حدث خطأ أثناء تحميل المهام" with a retry button; use `"use client"` with error boundary pattern

**Checkpoint**: US1 fully testable — user can submit a task proof and see status badges update.

---

## Phase 4: User Story 2 — Admin Creates and Manages Tasks (Priority: P2)

**Goal**: Admins can create tasks with `description` and `external_url` fields, edit existing tasks, and toggle active/inactive status.

**Independent Test**: Log in as admin → `/admin/tasks` → create task with Title + Description + URL + Reward → verify task appears in list → edit reward amount → verify update reflected → toggle task off → verify task disappears from user offerwall.

### Implementation for User Story 2

- [ ] T012 [US2] Update `app/admin/tasks/actions.ts` — add `description` field to `createTask` and `updateTask` server actions (read from formData, pass through updated `createTaskSchema`/`updateTaskSchema`); existing `toggleTaskStatus` and `deleteTask` actions unchanged
- [ ] T013 [P] [US2] Update `app/admin/tasks/_components/CreateTaskForm.tsx` — add `<textarea>` field for `description` (Arabic label "تعليمات المهمة", placeholder "اشرح للمستخدم بالتفصيل ماذا يفعل...", `rows={4}`, styled per design system: `border border-slate-200 rounded-xl bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20`); keep all existing fields; ensure `action_url` field has label "رابط التطبيق / الموقع" (it already exists as `action_url` in the schema); `reward_amount` is a required field — remove the "optional" affordance if present
- [ ] T014 [P] [US2] Update `app/admin/tasks/_components/TaskManagementTable.tsx` — add a "الوصف" column showing a truncated description preview (max 60 chars + "..."); keep all existing columns; no functional changes to edit/delete/toggle flows

**Checkpoint**: US2 fully testable — admin can create, edit, and toggle tasks independently of user-facing offerwall.

---

## Phase 5: User Story 3 — Admin Reviews Submissions and Approves/Rejects (Priority: P3)

**Goal**: Admins see all pending submissions with signed screenshot previews, approve (atomically credits wallet + logs transaction) or reject (with optional note, unlocks resubmission if under attempt cap).

**Independent Test**: Submit a task proof as a user → log in as admin → `/admin/task-submissions` → see submission row with screenshot rendered → click Approve → verify user's `wallet_balance` in Supabase increased by `reward_amount` → verify `wallet_transactions` row exists with correct source_label → verify submission shows Approved → verify user task card shows "مكتمل".

### Implementation for User Story 3

- [ ] T015 [US3] Create `app/admin/task-submissions/actions.ts` — two server actions:
  1. `approveOfferwallSubmission(submissionId: string): Promise<AdminActionResult>` — call `admin_approve_offerwall_submission` RPC via `createClient()` (user session, NOT admin client); map RPC exceptions to Arabic error strings; on success `revalidatePath('/admin/task-submissions')`
  2. `rejectOfferwallSubmission(submissionId: string, reason?: string): Promise<AdminActionResult>` — call `admin_reject_offerwall_submission` RPC via `createClient()`; map exceptions; on success revalidate
  - Return type `AdminActionResult = { success: true } | { error: string }` per contracts/contracts.md
  - ⚠️ Both actions MUST use `createClient()` (user JWT) not `createAdminClient()` — RPCs use auth.uid() internally
- [ ] T016 [P] [US3] Create `app/admin/task-submissions/_components/SubmissionsTable.tsx` — `"use client"` component; receives `OfferwallSubmission[]` as props; renders a data table with columns: user name, task title, reward, submission date, status badge, screenshot thumbnail (renders signed URL in `<img>` with `w-16 h-16 object-cover rounded-lg cursor-pointer` that opens full-size in new tab), Approve/Reject action buttons; Approve button: `bg-emerald-600 text-white rounded-xl px-3 py-1.5 text-sm hover:bg-emerald-700 transition-all active:scale-95` with CheckCircle icon; Reject button: `bg-slate-100 text-slate-700 rounded-xl px-3 py-1.5 text-sm hover:bg-slate-200 transition-all` with X icon; clicking Reject opens inline rejection reason input (optional textarea + confirm button); status badges: pending→amber, approved→emerald, rejected→red-50/red-700; disable approve/reject buttons for non-pending rows; loading states per button using `useTransition`; RTL layout; lucide-react icons only
- [ ] T017 [P] [US3] Create `app/admin/task-submissions/_components/SubmissionReviewCard.tsx` — mobile-friendly card variant of a single submission row; same data and actions as `SubmissionsTable` but card layout for small screens; shown instead of table below `sm` breakpoint
- [ ] T018 [US3] Create `app/admin/task-submissions/page.tsx` — async Server Component; use `createAdminClient()` to fetch ALL `offerwall_submissions` with JOIN to tasks (title, reward_amount) and users (full_name); filter by status=pending by default (support `?status=all|approved|rejected` query param for filtering); generate signed URLs for each screenshot_path via `supabase.storage.from('proofs').createSignedUrl(path, 900)`; build `OfferwallSubmission[]` array per contracts/contracts.md; pass to `<SubmissionsTable>` (desktop) and `<SubmissionReviewCard>` list (mobile); add pending count badge in page heading; add status filter segmented control (Pending / Approved / Rejected / All) using URL search params; `export const dynamic = 'force-dynamic'`
- [ ] T019 [P] [US3] Create `app/admin/task-submissions/loading.tsx` — skeleton rows (5× pulse skeleton cards); Arabic "جاري تحميل الطلبات..." label
- [ ] T020 [P] [US3] Create `app/admin/task-submissions/error.tsx` — error boundary with Arabic "حدث خطأ أثناء تحميل الطلبات" and retry button; `"use client"`
- [ ] T021 [US3] Update `app/dashboard/history/_components/TaskLogList.tsx` — change data source from `task_completion_logs` to `wallet_transactions` filtered by `transaction_type = 'task_reward'`; display each row as "+{amount} USDT · {source_label} · {status}" per FR-019 format; use emerald-600 for amount, slate-500 for label and status; ChevronRight icon (RTL: ChevronLeft) per row; format `created_at` as Arabic locale date

**Checkpoint**: All 3 user stories fully functional and independently testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Admin navigation link, edge case guards, accessibility, and final validation.

- [ ] T022 [P] Add `/admin/task-submissions` navigation link to the admin sidebar/nav in `app/admin/_components/` (or `app/admin/layout.tsx`) — use "مراجعة الإثباتات" label with ClipboardList icon from lucide-react; add pending count badge using a separate server fetch
- [ ] T023 [P] Add "مهام العروض" navigation entry to the user dashboard bottom nav or sidebar in `app/dashboard/layout.tsx` — use ListTodo icon; ensure active state styling matches existing nav items
- [ ] T024 Run the quickstart.md Step 5 test checklist manually — verify all 10 items pass; fix any failing items before marking complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately. T001 and T002 are parallel.
- **Phase 2 (Foundational)**: Depends on Phase 1 (schemas must exist before migration references them in comments). **Blocks all user story phases.**
- **Phase 3 (US1)**: Depends on Phase 2 only. T006, T007, T010, T011 are parallel after T005 is done.
- **Phase 4 (US2)**: Depends on Phase 2 only. T013 and T014 are parallel. Independent of Phase 3.
- **Phase 5 (US3)**: Depends on Phase 2. T016, T017, T019, T020 are parallel. T018 depends on T015. T021 is independent.
- **Phase 6 (Polish)**: Depends on Phases 3, 4, 5.

### User Story Dependencies

```
Phase 1 (T001, T002)
    ↓
Phase 2 (T003) ← BLOCKS ALL BELOW
    ↓         ↓              ↓
Phase 3 (US1) Phase 4 (US2) Phase 5 (US3)  ← Can run in parallel
    ↓         ↓              ↓
              Phase 6 (Polish)
```

### Within Each User Story

- **US1**: T005 (data layer) → T009 (page) | T004 (actions), T006, T007, T008, T010, T011 can be parallelized
- **US2**: T012 (actions) → T013, T014 (components) — T013 and T014 parallel after T012
- **US3**: T015 (actions) → T016, T017, T018 | T019, T020, T021 can be parallelized

---

## Parallel Execution Examples

### Phase 3 (US1) — parallel opportunities

```
Stream A: T004 (actions.ts) — new submitOfferwallProof logic
Stream B: T005 (data.ts)    — fetchOfferwallTasks + deriveStatus
    After both: T006, T007, T008 in parallel (different component files)
    After T006+T007+T008: T009 (page wires everything together)
    Parallel to all: T010, T011 (loading/error files)
```

### Phase 5 (US3) — parallel opportunities

```
Stream A: T015 (actions.ts) → T018 (page.tsx)
Stream B: T016 (SubmissionsTable) — parallel with T015
Stream C: T017 (SubmissionReviewCard) — parallel with T015
Stream D: T019, T020, T021 — fully parallel with all above
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete **Phase 1** (T001–T002) — ~15 min
2. Complete **Phase 2** (T003) — apply migration, verify schema — ~30 min
3. Complete **Phase 3** (T004–T011) — offerwall grid + submission flow — ~2–3 hours
4. **STOP and VALIDATE**: Run quickstart.md test items 1–4 → user can discover, open, and submit tasks
5. Deploy/demo MVP if ready

### Incremental Delivery

1. MVP (Phase 1–3) → User earning flow live ✅
2. Add Phase 4 (US2) → Admins can manage task content ✅
3. Add Phase 5 (US3) → Admins can review and approve/reject, wallet credited ✅
4. Add Phase 6 → Navigation + final polish ✅

---

## Notes

- `[P]` = can run in parallel (different files, no unresolved dependencies)
- `[US1/2/3]` = maps task to user story for traceability
- **Never use `createAdminClient()` for the 3 new RPCs** — they use `auth.uid()` internally and require the user session JWT
- All new components: lucide-react icons only, no emoji, `dir="rtl"` inherited from root, logical Tailwind utilities (`ms-`, `ps-`, `text-start`)
- Components must stay under 200 lines — extract sub-components if approaching limit
- `"use client"` boundaries must carry a justification comment
- Commit after each phase checkpoint


