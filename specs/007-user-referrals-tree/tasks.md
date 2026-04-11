# Tasks: User Team & Referrals (فريق العمل والإحالات)

**Input**: Design documents from `/specs/007-user-referrals-tree/`  
**Branch**: `007-user-referrals-tree`  
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/rpc-contracts.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.  
**Tests**: Not requested — no test tasks generated.  
**Labels used**: `[SCHEMA]` `[RBAC]` `[RTL]` `[MANUAL-FIN]`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify the existing database schema and prepare the migration file scaffold before writing any SQL or UI code.

- [x] T001 [SCHEMA] Inspect `public.packages` table for a `price` column by querying `information_schema.columns` in Supabase SQL console — document result (exists or needs adding) as a comment at the top of `supabase/migrations/20260407000012_user_referrals_module.sql`
- [x] T002 [SCHEMA] Create the migration file scaffold `supabase/migrations/20260407000012_user_referrals_module.sql` with a header comment block listing all steps A1–A8 (empty stubs), following the header style of `supabase/migrations/20260406000009_admin_dashboard_schema.sql`
- [x] T003 [P] Create the route directory structure: `app/dashboard/team/_components/` (empty folders only, so all component file tasks can run in parallel without conflicts)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The entire migration must be applied before any UI component can be wired to real data. All Phase 3–5 tasks depend on this phase being complete and the migration applied in Supabase.

> ⚠️ **CRITICAL**: Apply the migration (`supabase db push` or paste into SQL console) at the end of this phase before starting Phase 3.

### A1 — Extend `financial_audit_log` record type constraint

- [x] T004 [SCHEMA] In `supabase/migrations/20260407000012_user_referrals_module.sql` — Step A1: DROP the existing `financial_audit_log_record_type_check` constraint and re-ADD it with `'referral_commission'` appended, following the exact pattern from `supabase/migrations/20260406000010_create_withdrawal_requests.sql` lines 7–16

### A2 — Add commission rates config to `admin_settings`

- [x] T005 [SCHEMA] In migration file — Step A2: `ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS referral_commission_rates JSONB NOT NULL DEFAULT '{"L1":0.05,"L2":0.03,"L3":0.02,"L4":0.01,"L5":0.005,"L6":0.005}'` with a `COMMENT ON COLUMN` explaining the per-level rate structure

### A3 — Create `user_referral_stats` snapshot table

- [x] T006 [SCHEMA] [RBAC] In migration file — Step A3: CREATE TABLE `public.user_referral_stats` with columns `user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE RESTRICT`, `direct_count INT NOT NULL DEFAULT 0 CHECK (direct_count >= 0)`, `total_team_size INT NOT NULL DEFAULT 0 CHECK (total_team_size >= 0)`, `total_earnings NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_earnings >= 0)`, `last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- [x] T007 [RBAC] In migration file — after table creation: `ALTER TABLE public.user_referral_stats ENABLE ROW LEVEL SECURITY` + `CREATE POLICY "stats_select_own" ON public.user_referral_stats FOR SELECT USING (auth.uid() = user_id)` — no INSERT/UPDATE/DELETE policies for user role
- [x] T008 [SCHEMA] In migration file — after RLS: seed existing users with `INSERT INTO public.user_referral_stats (user_id) SELECT id FROM public.users ON CONFLICT (user_id) DO NOTHING` to ensure every existing user has a stats row

### A4 — Create `referral_commissions` table

- [x] T009 [SCHEMA] [RBAC] [MANUAL-FIN] In migration file — Step A4: CREATE TABLE `public.referral_commissions` with all columns per `specs/007-user-referrals-tree/data-model.md` (beneficiary_id, depositing_user_id, deposit_request_id, upline_level SMALLINT 1–6, deposit_amount, commission_rate, commission_amount, created_at), then add `UNIQUE (depositing_user_id, upline_level)` idempotency constraint, enable RLS with `SELECT USING (auth.uid() = beneficiary_id)` policy

### A5 — Trigger: propagate stats on new user registration

- [x] T010 [SCHEMA] In migration file — Step A5: CREATE OR REPLACE FUNCTION `public.handle_new_user_for_stats()` RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER — logic: (1) UPSERT `user_referral_stats(user_id = NEW.id)` ON CONFLICT DO NOTHING; (2) if `NEW.invited_by IS NOT NULL`, walk ancestor chain up to 6 levels using a loop with a level counter, for each ancestor UPDATE `user_referral_stats SET total_team_size = total_team_size + 1, last_updated_at = now()` and for the L1 ancestor ALSO `SET direct_count = direct_count + 1`
- [x] T011 [SCHEMA] In migration file — after trigger function: `CREATE TRIGGER trg_stats_on_new_user AFTER INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_for_stats()`

### A6 — `distribute_referral_commissions` RPC

- [x] T012 [SCHEMA] [MANUAL-FIN] In migration file — Step A6: CREATE OR REPLACE FUNCTION `public.distribute_referral_commissions(p_request_id UUID, p_depositing_user_id UUID, p_deposit_amount NUMERIC, p_admin_id UUID) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER` — logic: declare a loop variable `v_ancestor_id UUID := p_depositing_user_id` and level counter; for each iteration (1–6): `SELECT invited_by INTO v_ancestor_id FROM public.users WHERE id = v_ancestor_id`; if `v_ancestor_id IS NULL` EXIT loop; read rate from `SELECT referral_commission_rates->>(CONCAT('L', level_counter)) FROM public.admin_settings LIMIT 1`; compute `commission = p_deposit_amount * rate`; if `commission > 0`: INSERT into `referral_commissions`, UPDATE `users.wallet_balance += commission` and `users.total_earned += commission`, UPDATE `user_referral_stats.total_earnings += commission`, INSERT into `financial_audit_log (record_id=p_request_id, record_type='referral_commission', old_status='pending', new_status='approved', changed_by=p_admin_id)`

### A7 — Amend `admin_approve_deposit` to call commission distribution

- [x] T013 [SCHEMA] [MANUAL-FIN] In migration file — Step A7: CREATE OR REPLACE FUNCTION `public.admin_approve_deposit` (full replacement of existing function from migration 009) — copy existing body verbatim, then after `UPDATE public.users SET current_package_level = ...`, add: fetch deposit amount (`SELECT p.price INTO v_deposit_amount FROM public.packages p WHERE p.id = v_row.package_id` — add `v_deposit_amount NUMERIC` to DECLARE block; if `packages.price` does not exist per T001 finding, also add `ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS price NUMERIC(12,2) NOT NULL DEFAULT 0.00` earlier in the migration); then check `IF NOT EXISTS (SELECT 1 FROM public.referral_commissions WHERE depositing_user_id = v_row.user_id) THEN PERFORM public.distribute_referral_commissions(p_request_id, v_row.user_id, v_deposit_amount, p_admin_id); END IF`

### A8 — `get_my_referral_tree` user-scoped RPC

- [x] T014 [SCHEMA] [RBAC] In migration file — Step A8: CREATE OR REPLACE FUNCTION `public.get_my_referral_tree() RETURNS TABLE (id UUID, full_name TEXT, referral_code TEXT, status TEXT, parent_id UUID, depth INT, created_at TIMESTAMPTZ) LANGUAGE plpgsql SECURITY DEFINER` — body: declare `v_root UUID := auth.uid()`; RETURN QUERY WITH RECURSIVE tree AS (SELECT u.id, u.full_name, u.referral_code, u.status, u.invited_by AS parent_id, 1 AS depth, u.created_at FROM public.users u WHERE u.invited_by = v_root UNION ALL SELECT child.id, child.full_name, child.referral_code, child.status, child.invited_by, parent.depth + 1, child.created_at FROM public.users child JOIN tree parent ON child.invited_by = parent.id WHERE parent.depth + 1 <= 6) SELECT \* FROM tree

- [ ] T015 [SCHEMA] Apply the completed migration to Supabase

**Checkpoint**: Migration applied ✅ — all three user story phases can now begin (in sequence or parallel).

---

## Phase 3: User Story 1 — Referral Overview Stats Cards (Priority: P1) 🎯 MVP

**Goal**: Display three pre-computed stats cards (direct referrals, total team size, referral earnings) on the `/dashboard/team` page, loading in under 1 second from the snapshot table.

**Independent Test**: Navigate to `/dashboard/team` as a logged-in user. Verify three stat cards render with correct numbers matching `user_referral_stats` row. Verify empty-state card renders for a user with all-zero stats.

### Implementation for User Story 1

- [x] T016 [US1] Create `app/dashboard/team/page.tsx` as a React Server Component — use `createServerClient` from `@supabase/ssr`, get session user ID, run `Promise.all` to fetch `user_referral_stats` row AND `users.referral_code` in parallel, render `<ReferralStatsCards>` with stats props, render placeholder `<div id="invite-link">` and `<div id="team-tree">` stubs so page mounts without other components blocking
- [x] T017 [P] [US1] [RTL] Create `app/dashboard/team/_components/ReferralStatsCards.tsx` as an RSC (no `"use client"`) — props: `{ directCount: number, totalTeamSize: number, totalEarnings: number }` — render three cards in `grid grid-cols-1 sm:grid-cols-3 gap-4` using only `ms-`/`me-`/`ps-`/`pe-` logical utilities; each card: `bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]`; stat number: `text-3xl font-bold text-emerald-600`; Arabic label: `text-sm text-slate-500 mt-1`; include `transition-all duration-200 hover:-translate-y-1` on each card
- [x] T018 [US1] [RTL] In `ReferralStatsCards.tsx` — add the zero-state: when `directCount === 0 && totalTeamSize === 0 && totalEarnings === 0`, render a single full-width soft callout card with emerald icon, text "ليس لديك أعضاء في فريقك بعد" and a link anchor `href="#invite-link"` styled as emerald button
- [x] T019 [P] [US1] Create `app/dashboard/team/loading.tsx` — render a three-column skeleton grid matching the real stats cards layout using `animate-pulse` on `bg-slate-100 rounded-2xl h-32` blocks; below it render skeleton placeholders for the invite card and tree section rows
- [x] T020 [P] [US1] Create `app/dashboard/team/error.tsx` — `"use client"` boundary following the pattern of `app/dashboard/error.tsx`; display Arabic error message "حدث خطأ أثناء تحميل بيانات الفريق" with a retry button calling `reset()`

**Checkpoint**: User Story 1 ✅ — Stats cards visible, empty state works, loading skeleton matches layout, errors handled. Can ship as MVP of the team page.

---

## Phase 4: User Story 2 — Invite Link Card (Priority: P2)

**Goal**: Display the user's unique referral link as a full URL (`https://teamoads.com/register?ref=[code]`) in a premium card with a 1-click clipboard copy and Arabic success toast.

**Independent Test**: Visit `/dashboard/team`, locate the invite card. Click "نسخ الرابط". Verify clipboard contains the full URL (not just the code). Verify the success toast "تم نسخ الرابط!" appears and disappears after ~2 seconds. On a simulated clipboard-unavailable context, verify the fallback text selection occurs.

### Implementation for User Story 2

- [x] T021 [US2] In `app/dashboard/team/page.tsx` — replace the `<div id="invite-link">` stub: import `InviteLinkCard` and pass `referralCode` (from `users.referral_code` fetch) and `baseUrl` (`process.env.NEXT_PUBLIC_APP_URL ?? 'https://teamoads.com/register'`) as props; add `NEXT_PUBLIC_APP_URL` to `.env.local` if not already present (value: `http://localhost:3000/register` for dev)
- [x] T022 [US2] [RTL] Create `app/dashboard/team/_components/InviteLinkCard.tsx` as `"use client"` — comment: `// "use client" — clipboard API (navigator.clipboard) requires browser context`; props: `{ referralCode: string, baseUrl: string }`; derive `fullUrl = ${baseUrl}?ref=${referralCode}`; render card with: dark gradient header strip (`bg-gradient-to-r from-slate-900 to-slate-800 rounded-t-2xl p-4`), Arabic heading "رابط الدعوة الخاص بك" in white, share icon; then link display area (`bg-slate-50 rounded-b-2xl p-4 border border-slate-100`) showing `fullUrl` in `font-mono text-sm text-slate-700 break-all text-start`; then emerald copy button below
- [x] T023 [US2] In `InviteLinkCard.tsx` — implement `handleCopy` using `useState(false)` for `copied` state: try `navigator.clipboard.writeText(fullUrl)`, catch → try `document.execCommand('copy')` via hidden textarea (reuse pattern from existing `app/dashboard/_components/ReferralTool.tsx` lines 13–27), catch → call `inputRef.current?.select()` on a visible fallback `<input readOnly>` and show "انسخ الرابط يدوياً" instruction; on success: `setCopied(true)` + `setTimeout(() => setCopied(false), 2000)`
- [x] T024 [US2] [RTL] In `InviteLinkCard.tsx` — implement the inline success toast: when `copied === true`, render an absolutely-positioned toast `fixed bottom-6 start-1/2 -translate-x-1/2` (or inline below button) with `bg-emerald-600 text-white rounded-xl px-6 py-3 shadow-[0_4px_14px_0_rgba(5,150,105,0.39)] transition-all duration-300` showing "✓ تم نسخ الرابط!"; ensure it uses `start` not `left` for RTL correctness
- [x] T025 [US2] [RTL] Upgrade `app/dashboard/_components/ReferralTool.tsx` — change copied value from bare `referralCode` to full URL `https://teamoads.com/register?ref=${referralCode}`; update title label from "كود الإحالة الخاص بك" to "رابط الإحالة الخاص بك"; update `aria-label` on copy button; keep all other logic unchanged

**Checkpoint**: User Story 2 ✅ — Full URL invite link shown, copy works with Arabic toast, fallback for restricted clipboard, existing ReferralTool on home page upgraded.

---

## Phase 5: User Story 3 — My Downline Tree (Priority: P3)

**Goal**: Render an interactive, collapsible indented tree of the authenticated user's downline (up to 6 levels) with expand/collapse per node, status badges, and an empty state — all secured server-side so a user can only see their own tree.

**Independent Test**: Seed a test user hierarchy (at least 3 levels deep) in the dev DB. Navigate to `/dashboard/team`. Verify root-level members (L1) render expanded by default. Click a node → children appear. Click again → children hide. Inspect DOM — confirm no node renders at depth > 6. Verify a suspended member shows the "معلق" badge. Verify a user with no downline sees the empty-state card.

### Implementation for User Story 3

- [x] T026 [US3] [RBAC] In `app/dashboard/team/page.tsx` — add a third server-side fetch: call `supabase.rpc('get_my_referral_tree')` (no args — RPC uses `auth.uid()` internally); transform the flat `TreeRow[]` result into a nested `TreeNode[]` structure using a server-side `buildTree(rows, rootId)` helper function defined in the same file or extracted to `app/dashboard/team/_components/treeUtils.ts`; pass the resulting `tree: TreeNode[]` prop to `<MyDownlineTree>`
- [x] T027 [US3] Create `app/dashboard/team/_components/treeUtils.ts` — export `buildTree(rows: TreeRow[], rootId: string): TreeNode[]` — groups rows by `parent_id`, recursively assembles children arrays; TypeScript types `TreeRow` and `TreeNode` per `specs/007-user-referrals-tree/contracts/rpc-contracts.md`
- [x] T028 [US3] [RTL] Create `app/dashboard/team/_components/MyDownlineTree.tsx` as `"use client"` — comment: `// "use client" — expand/collapse state requires useState per node`; props: `{ tree: TreeNode[], currentUserId: string }`; render the root user row at the top as a non-expandable header node (`bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-4`) with the label "أنت (الجذر)"; then render `<TreeNode>` for each item in `tree`
- [x] T029 [US3] [RTL] In `MyDownlineTree.tsx` — implement recursive `TreeNode` sub-component (internal, not exported): accepts `{ node: TreeNode, depth: number }`; renders with `ms-[calc(${depth}*1.5rem)]` indentation per level (logical RTL ms- not ml-); node card: `bg-white rounded-xl p-4 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all duration-200`; row content: level badge `L{depth}` (`bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full px-2 py-0.5`), `full_name` in `font-semibold text-slate-900`, join date in `text-xs text-slate-400`, status badge (active: `bg-emerald-50 text-emerald-700 "نشط"`; suspended: `bg-yellow-50 text-yellow-700 "معلق"`); if `node.children.length > 0`: show chevron icon (`ChevronDownIcon` rotated 90° when expanded via `transition-transform duration-200`); if leaf: no chevron (FR-010)
- [x] T030 [US3] In `MyDownlineTree.tsx` — implement expand/collapse: use `useState<Record<string, boolean>>` keyed by node `id` to track expanded state; L1 nodes start expanded (`true`), L2+ start collapsed (`false`); toggle on node click; render `node.children` only when `expandedMap[node.id] === true`; wrap children list in `<div className="mt-2 space-y-2">`
- [x] T031 [US3] [RTL] In `MyDownlineTree.tsx` — implement empty state: when `tree.length === 0`, render a centered card `bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]` with a team icon (slate-300), heading "ليس لديك أعضاء في فريقك بعد" (`text-slate-700 font-semibold`), subtext "شارك رابط الدعوة لتبدأ في بناء فريقك" (`text-sm text-slate-400`), and an anchor `href="#invite-link"` styled as a slate-900 button
- [x] T032 [US3] In `app/dashboard/team/page.tsx` — replace the `<div id="team-tree">` stub with the actual `<MyDownlineTree tree={treeData} currentUserId={userId} />` render; add `id="team-tree"` wrapper `<section>` so the invite card's deep-link anchor works

**Checkpoint**: User Story 3 ✅ — Tree renders, expands/collapses, depth capped at 6, status badges shown, empty state motivates sharing.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Navigation wiring, RTL audit, and full-page verification across all three sections.

- [x] T033 [RTL] Add "فريق" tab to dashboard bottom navigation in `app/dashboard/layout.tsx` (or the nav sub-component) — use `UsersIcon` (already available from heroicons in the project), label "فريق", `href="/dashboard/team"` — follow the exact prop/className pattern of existing nav tabs; verify the active-state highlight applies correctly when on `/dashboard/team`
- [x] T034 [P] [RTL] RTL audit across all new files — grep for any occurrence of `ml-`, `mr-`, `pl-`, `pr-`, `text-left`, `text-right`, `left-`, `right-` in `app/dashboard/team/` and fix each to its logical equivalent (`ms-`, `me-`, `ps-`, `pe-`, `text-start`, `text-end`, `start-`, `end-`)
- [ ] T035 [P] Full-page integration smoke test (manual): (1) log in as a user with a known downline; (2) navigate to `/dashboard/team`; (3) verify all 3 sections render with correct data; (4) verify loading skeleton shows on hard refresh with throttled network; (5) verify copy toast appears and disappears; (6) verify tree expand/collapse; (7) verify `/dashboard/team` is accessible only to authenticated users (unauthenticated redirect to `/login`)
- [ ] T036 Database verification (SQL console) — execute the 5 verification queries from `specs/007-user-referrals-tree/plan.md` Verification Plan section; document results confirming: trigger fires correctly, commission distribution is accurate, `get_my_referral_tree` is auth-scoped, unique constraint blocks duplicates

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on T001 T002 T003 — BLOCKS all UI phases
- **Phase 3 (US1 — Stats)**: Depends on Phase 2 migration applied (T015) — no dependency on US2 or US3
- **Phase 4 (US2 — Invite Link)**: Depends on Phase 2 (T015) — independent of US1/US3 in data terms; shares `page.tsx` file with US1 so run sequentially on same file
- **Phase 5 (US3 — Tree)**: Depends on Phase 2 (T015) specifically T014 (`get_my_referral_tree` RPC) — independent of US1/US2 components
- **Phase 6 (Polish)**: Depends on all three user story phases complete

### Within Each Phase

```
Phase 2 internal order:
T004 → T005 → T006 → T007 → T008 → T009 → T010 → T011 → T012 → T013 → T014 → T015

Phase 3 internal order:
T016 → T017 [P with T019, T020] → T018 (depends T017)

Phase 4 internal order:
T021 (amends T016's page.tsx) → T022 → T023 (depends T022) → T024 (depends T022) → T025 [P]

Phase 5 internal order:
T026 (amends T016/T021's page.tsx) → T027 [P] → T028 → T029 (depends T028) → T030 (depends T028/T029) → T031 (depends T028) → T032 (amends page.tsx)
```

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 complete — no dependency on US2/US3
- **US2 (P2)**: Can start after Phase 2 complete — shares `page.tsx` with US1, recommend sequential (US1 → US2)
- **US3 (P3)**: Can start after Phase 2 complete — shares `page.tsx` with US1/US2, recommend sequential (US1 → US2 → US3)

### Parallel Opportunities

```bash
# Phase 2: These migration steps are sequential (single file) but internally these can run in parallel:
[T006, T007, T008] are logically grouped but sequential in SQL transactional sense

# Phase 3: These tasks touch different files, run in parallel after T016:
T017 (ReferralStatsCards.tsx) || T019 (loading.tsx) || T020 (error.tsx)

# Phase 4: T025 (ReferralTool.tsx) is a different file — run in parallel with T021-T024
T021 → T022 → T023 → T024 || T025

# Phase 6: RTL audit and smoke test are different concerns — parallel:
T034 (RTL audit) || T035 (smoke test) || T036 (DB verification)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: Foundational migration (T004–T015) — apply migration
3. Complete Phase 3: Stats cards (T016–T020)
4. **STOP and VALIDATE**: Stats page renders with real data, loading/error states work
5. This is a deployable MVP — users can see their team summary

### Incremental Delivery

1. Setup + Foundational → Migration applied ✅
2. US1 Stats Cards → Deployed → Users see team summary 📊
3. US2 Invite Link → Deployed → Users can copy and share their referral link 🔗
4. US3 Downline Tree → Deployed → Users explore their full network hierarchy 🌳
5. Polish → Navigation wired, RTL verified, all smoke tests pass ✅

---

## Notes

- `[P]` = task touches a different file from its phase siblings, safe to execute in parallel
- `[SCHEMA]` = SQL migration step — apply in order within the migration file
- `[RBAC]` = Row-Level Security policy — verify in Supabase dashboard after migration
- `[RTL]` = must use logical Tailwind utilities only (`ms-`, `me-`, `ps-`, `pe-`, `text-start`, `text-end`)
- `[MANUAL-FIN]` = touches financial tables or balance mutations — double-check SECURITY DEFINER and audit log insertion
- T001 is the only task with a conditional outcome — its result (packages.price exists or not) gates the exact SQL in T013
- The `page.tsx` file is amended across phases T016 → T021 → T026 → T032 — always work sequentially on this file
