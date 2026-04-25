# Tasks: Investment & Trading Cycles Module

**Feature**: `010-investment-trading-cycles`  
**Input**: Design documents from `/specs/010-investment-trading-cycles/`  
**Prerequisites**: plan.md âœ… | spec.md âœ… | research.md âœ… | data-model.md âœ… | contracts/ âœ… | quickstart.md âœ…

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependency on incomplete tasks)
- **[Story]**: User story this task belongs to (US1â€“US5)
- All file paths are absolute from repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create all shared library code and the migration that ALL user stories depend on.

- [X] T001 Create `lib/investment/tiers.ts` â€” export `INVESTMENT_TIERS` constant and `resolveTier(amount: number): number | null` helper
- [X] T002 [P] Create `lib/investment/calc.ts` â€” export `computeInvestmentSummary(account, pendingWithdrawals)` pure function using floor-rounding formula: `Math.floor(capital * tier / 100 * 100) / 100`
- [X] T003 [P] Create `lib/investment/trading-report.ts` â€” export static `TRADING_REPORT` dummy constant (`{ totalTrades: 12, won: 9, lost: 3 }`) with `getTradingReport(tierPercentage: number): TradingReport` function
- [X] T004 [P] Create `lib/validations/investment-schemas.ts` â€” Zod schemas: `submitDepositSchema` (amount â‰¥ 100, receiptUrl non-empty), `submitWithdrawalSchema` (amount â‰¥ 10), `adminApproveDepositSchema` (UUID), `adminRejectDepositSchema` (UUID + optional reason), `adminApproveWithdrawalSchema` (UUID), `adminRejectWithdrawalSchema` (UUID + optional reason)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, RLS, RPCs, and storage bucket. MUST be complete before any UI work.

**âš ï¸ CRITICAL**: No user story UI work begins until this migration is applied and verified.

- [X] T005 Create `supabase/migrations/20260425000022_investment_trading_cycles.sql` with:
  - Extend `financial_audit_log.record_type` CHECK to include `'investment_deposit'` and `'investment_withdrawal'`
  - Create `public.investment_accounts` table (all columns per data-model.md including `created_at`, `updated_at`, trigger)
  - Create `public.investment_deposits` table (all columns, CHECK amount â‰¥ 100, trigger)
  - Create `public.investment_withdrawals` table (all columns, CHECK amount â‰¥ 10, trigger)
  - Create `public.in_app_notifications` table (no updated_at by design)
  - All indexes (deposits pending index, user_id + created_at index for withdrawals)
  - RLS: Enable on all 4 tables; user SELECT own rows; INSERT/UPDATE blocked except via RPC
  - RLS: Admin SELECT policies on `investment_deposits` and `investment_withdrawals` (role = 'admin' subquery)
  - Storage bucket `investment-receipts` (private) + INSERT/SELECT policies mirroring `equity-receipts`
  - RPC: `user_submit_investment_deposit(p_user_id, p_amount, p_tier_pct, p_receipt_url)` â€” FOR UPDATE lock, check no pending/accepted, insert deposit, return UUID
  - RPC: `admin_approve_investment_deposit(p_request_id, p_admin_id)` â€” FOR UPDATE, check pending, set accepted, UPSERT investment_accounts (add capital, set last_cycle_start = now(), set tier_pct), audit log, notification
  - RPC: `admin_reject_investment_deposit(p_request_id, p_admin_id, p_reason)` â€” FOR UPDATE, check pending, set rejected, audit log, notification
  - RPC: `user_submit_investment_withdrawal(p_user_id, p_amount)` â€” FOR UPDATE on investment_accounts, compute available_profit inline, check â‰¥ 10 and â‰¤ available, insert withdrawal
  - RPC: `admin_approve_investment_withdrawal(p_request_id, p_admin_id)` â€” FOR UPDATE, check pending, set accepted, UPDATE investment_accounts.withdrawn_profits += amount, audit log, notification
  - RPC: `admin_reject_investment_withdrawal(p_request_id, p_admin_id, p_reason)` â€” FOR UPDATE, check pending, set rejected, audit log, notification (no balance change needed)

**Checkpoint**: Apply migration locally (`supabase db push` or direct SQL). Verify all 4 tables and 6 RPCs exist. âœ“

---

## Phase 3: User Story 1 â€” Depositing Capital (Priority: P1) ðŸŽ¯ MVP

**Goal**: User can navigate to `/dashboard/investment`, see the tier table and admin wallet, upload a receipt, and submit a deposit request.

**Independent Test**: Quickstart Scenario 1 (steps 1â€“7): user submits deposit â†’ sees "pending" status without admin action.

### Implementation for User Story 1

- [X] T006 [US1] Create `app/dashboard/investment/actions.ts` â€” implement `submitInvestmentDeposit(_prevState, formData)` Server Action: getUser, Zod-validate, resolveTier, call `user_submit_investment_deposit` RPC, revalidatePath('/dashboard/investment')
- [X] T007 [P] [US1] Create `app/dashboard/investment/_components/EmptyInvestmentState.tsx` â€” RSC component showing onboarding CTA card with "Deposit" button trigger; emerald CTA, RTL Arabic copy
- [X] T008 [P] [US1] Create `app/dashboard/investment/_components/DepositModal.tsx` â€” `"use client"` modal/bottom-sheet: Step 1 tier table display (all 5 tiers with percentage badges), Step 2 admin USDT wallet address card with copy-to-clipboard, Step 3 amount input + file dropzone (Supabase Storage upload to `investment-receipts/{userId}/{uuid}.ext`), useFormState submission, error display; RTL layout, dashed upload zone per design system
- [X] T009 [US1] Create `app/dashboard/investment/page.tsx` â€” RSC: fetch `investment_accounts` row for current user + any `pending`/`accepted` `investment_deposits` + `investment_withdrawals`; derive `InvestmentSummary` via `computeInvestmentSummary()`; render `EmptyInvestmentState` if isEmpty, else render overview cards + countdown + trading report; include DepositModal trigger button
- [X] T010 [US1] Create `app/dashboard/investment/loading.tsx` â€” skeleton shimmer cards matching overview card layout
- [X] T011 [US1] Create `app/dashboard/investment/error.tsx` â€” RTL Arabic error boundary component

**Checkpoint**: User can visit `/dashboard/investment`, see empty state, open deposit modal, fill form, upload screenshot, submit, and see "Pending" status. âœ“

---

## Phase 4: User Story 4 â€” Admin Reviews Deposits (Priority: P1)

**Goal**: Admin sees all pending deposit requests on `/admin/investments`, can inspect screenshot in a lightbox, and approve or reject each request.

**Independent Test**: Quickstart Scenario 1 (steps 8â€“12): admin approves a deposit â†’ user account becomes active.

### Implementation for User Story 4

- [X] T012 [US4] Create `app/admin/investments/actions.ts` â€” implement `approveInvestmentDeposit(depositId)`, `rejectInvestmentDeposit(depositId, reason?)`, `approveInvestmentWithdrawal(withdrawalId)`, `rejectInvestmentWithdrawal(withdrawalId, reason?)` â€” all use `verifyAdmin()` + Zod + adminClient RPC call + revalidatePath('/admin/investments')
- [X] T013 [P] [US4] Create `app/admin/investments/_components/ReceiptLightbox.tsx` â€” `"use client"` full-screen image modal triggered by thumbnail click; uses Next.js `<Image>` for the signed URL; ESC key and backdrop click to close; `aria-modal`, `role="dialog"` labels in Arabic
- [X] T014 [P] [US4] Create `app/admin/investments/_components/DepositRequestsTable.tsx` â€” RSC-compatible table component receiving `AdminDepositRow[]` prop; columns: user name + phone, amount, tier badge (emerald), submission date, receipt thumbnail (triggers ReceiptLightbox), status badge, Approve / Reject action buttons with optimistic disable; rejection reason input (shown on reject); `hover:bg-slate-50` rows, soft status badges per design system
- [X] T015 [P] [US4] Create `app/admin/investments/_components/InvestmentAdminTabs.tsx` â€” `"use client"` segmented control toggling between "Ø·Ù„Ø¨Ø§Øª Ø§Ù„Ø¥ÙŠØ¯Ø§Ø¹" and "Ø·Ù„Ø¨Ø§Øª Ø§Ù„Ø³Ø­Ø¨" tabs; stores active tab in URL search param `?tab=deposits|withdrawals` for deep-linking; renders correct table component per active tab
- [X] T016 [US4] Create `app/admin/investments/page.tsx` â€” RSC: fetch pending + history deposit rows (with signed receipt URLs via `createSignedUrl`), fetch withdrawal rows, enrich with user identity from `users` table join; pass as props to InvestmentAdminTabs; `export const dynamic = "force-dynamic"`
- [X] T017 [US4] Create `app/admin/investments/loading.tsx` â€” admin skeleton loader
- [X] T018 [US4] Create `app/admin/investments/error.tsx` â€” RTL admin error boundary

**Checkpoint**: Admin can visit `/admin/investments`, see pending deposit, view screenshot lightbox, approve â†’ user account is credited. âœ“

---

## Phase 5: User Story 2 â€” Investment Dashboard & Cycle Countdown (Priority: P1)

**Goal**: User with an approved investment sees live Capital Balance, Total Earned Profit, Available to Withdraw, and a visual 7-day countdown timer.

**Independent Test**: Quickstart Scenario 1 (steps 13â€“16): dashboard shows $500 capital, $0 profit initially, then $40 after simulating 1 cycle.

### Implementation for User Story 2

- [X] T019 [US2] Create `app/dashboard/investment/_components/InvestmentOverviewCards.tsx` â€” RSC component receiving `InvestmentSummary` prop; renders 3 stat cards: Capital Balance (slate-900 gradient header), Total Earned Profit (emerald accent), Available to Withdraw (emerald accent); `bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]` per design system; monetary values formatted to 2 decimal places with "USDT" suffix
- [X] T020 [P] [US2] Create `app/dashboard/investment/_components/CycleCountdownTimer.tsx` â€” `"use client"` component receiving `nextCycleAt: string | null` prop; uses `setInterval(1000)` to recompute `{ days, hours, minutes, seconds }`; displays as 4 segmented boxes (D / H / M / S) with animated digit transitions; stops at 0 and shows "ØªÙ… Ø§Ø­ØªØ³Ø§Ø¨ Ø§Ù„Ø£Ø±Ø¨Ø§Ø­" message; justify-comment for `"use client"` boundary
- [X] T021 [US2] Update `app/dashboard/investment/page.tsx` â€” integrate `InvestmentOverviewCards` and `CycleCountdownTimer` into the RSC render path; pass `summary.nextCycleAt` to timer; ensure `WithdrawModal` trigger button is conditionally rendered only when `availableProfit > 0`

**Checkpoint**: Dashboard displays accurate capital, profit, and live countdown using seeded data from Quickstart Scenario 1. âœ“

---

## Phase 6: User Story 3 â€” Trading Report (Priority: P2)

**Goal**: Users with an active investment see a static Trading Report card showing trade win/loss stats and net result tied to their tier.

**Independent Test**: Quickstart Scenario 1 (step 14): Trading Report visible with 12 trades, 9 won, 3 lost, net = user's tier %.

### Implementation for User Story 3

- [X] T022 [US3] Create `app/dashboard/investment/_components/TradingReportCard.tsx` â€” RSC component receiving `report: TradingReport` prop; displays: total trades count, win count (emerald), loss count (slate-500), net result percentage (emerald bold); subtle progress bar showing win/loss ratio; shown only when `!summary.isEmpty`; RTL layout; `bg-white rounded-2xl` card styling

**Checkpoint**: Trading Report card visible on dashboard with correct values. Hidden when no active investment. âœ“

---

## Phase 7: User Story 5 â€” Profit Withdrawal (Priority: P2)

**Goal**: User with available profit can submit a withdrawal request (â‰¥ 10 USDT, â‰¤ available balance). Admin reviews and approves/rejects from the Withdrawal Requests tab.

**Independent Test**: Quickstart Scenario 1 (steps 17â€“22): user withdraws $40 â†’ admin approves â†’ `withdrawn_profits` = 40.

### Implementation for User Story 5

- [X] T023 [US5] Create `app/dashboard/investment/actions.ts` â€” add (or extend) `submitInvestmentWithdrawal(_prevState, formData)` Server Action: getUser, Zod-validate (amount â‰¥ 10), call `user_submit_investment_withdrawal` RPC, revalidatePath; handle RPC error codes: `'below_minimum'`, `'insufficient_profit'`, `'no_active_investment'`
- [X] T024 [US5] Create `app/dashboard/investment/_components/WithdrawModal.tsx` â€” `"use client"` modal: shows Available to Withdraw balance prominently, single amount input with real-time validation (â‰¥ 10, â‰¤ available), submit via useFormState, Arabic error messages, disabled state when `availableProfit = 0` with explanatory text "Ø§Ù„Ø£Ø±Ø¨Ø§Ø­ ØªÙØ­ØªØ³Ø¨ ÙƒÙ„ 7 Ø£ÙŠØ§Ù…"
- [X] T025 [US5] Create `app/admin/investments/_components/WithdrawalRequestsTable.tsx` â€” RSC-compatible table receiving `AdminWithdrawalRow[]`; columns: user name + phone, requested amount, request date, status badge, Approve / Reject actions with optional reason input; mirrors DepositRequestsTable styling

**Checkpoint**: Full withdrawal flow works: submit â†’ admin tab shows request â†’ admin approves â†’ dashboard shows updated available balance. âœ“

---

## Phase 8: User Story (Notifications) â€” In-App Notification Badge

**Goal**: Users see a notification badge in the top app bar when their deposit or withdrawal request is approved/rejected.

**Independent Test**: Quickstart Scenario 5: admin approves deposit â†’ user sees unread badge on nav.

### Implementation

- [X] T026 [US2] Create `components/NotificationBadge.tsx` â€” RSC component: queries `in_app_notifications` for current user (`is_read = false` count); renders badge count on bell icon (Lucide `Bell`); 0-count = hidden; linked to a simple notification drawer or mark-all-read action
- [X] T027 [US2] Create `app/dashboard/investment/_components/MarkNotificationsRead.tsx` â€” `"use client"` component that calls a server action to mark all notifications as read when user views the investment page; co-located with the investment route
- [X] T028 [P] [US2] Create `app/dashboard/investment/actions.ts` â€” add `markInvestmentNotificationsRead()` Server Action: getUser, update `in_app_notifications SET is_read = true WHERE user_id = ? AND is_read = false`, revalidatePath
- [X] T029 [US2] Update `app/dashboard/layout.tsx` â€” integrate `<NotificationBadge />` into the top app bar RSC render (alongside existing user avatar / rank badge)

**Checkpoint**: Notification badge appears after admin action; clears after user views dashboard. âœ“

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T030 [P] Add `/admin/investments` link to admin sidebar navigation in `app/admin/layout.tsx` â€” use Lucide `TrendingUp` icon, Arabic label "Ø§Ù„Ø§Ø³ØªØ«Ù…Ø§Ø±Ø§Øª"
- [X] T031 [P] Add `/dashboard/investment` link to the user bottom navigation bar â€” use Lucide `BarChart2` icon, Arabic label "Ø§Ù„Ø§Ø³ØªØ«Ù…Ø§Ø±"
- [ ] T032 Run manual quickstart.md verification: all 6 scenarios pass including floor-rounding edge cases
- [X] T033 [P] Verify all new components are < 200 lines (Constitution Principle V); split any approaching the limit
- [X] T034 [P] Verify all RTL utility classes (`ps-`, `pe-`, `ms-`, `me-`, `text-start`, `text-end`) â€” grep for any `pl-`, `pr-`, `ml-`, `mr-`, `text-left`, `text-right` in new files and replace
- [ ] T035 Review `financial_audit_log` entries after running quickstart scenarios â€” confirm all deposit and withdrawal admin actions generate audit rows

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies â€” start immediately; T001â€“T004 fully parallel
- **Phase 2 (Foundational)**: Depends on Phase 1 (tiers/calc needed to write correct RPC logic) â€” **BLOCKS all UI phases**
- **Phase 3 (US1 â€” Deposit)**: Depends on Phase 2 migration applied âœ“
- **Phase 4 (US4 â€” Admin)**: Depends on Phase 2; can run in parallel with Phase 3 (different files)
- **Phase 5 (US2 â€” Dashboard)**: Depends on Phase 3 (page.tsx already exists, extending it)
- **Phase 6 (US3 â€” Trading Report)**: Depends on Phase 5 (page.tsx integration)
- **Phase 7 (US5 â€” Withdrawal)**: Depends on Phase 4 (admin actions.ts exists); extends Phase 3 actions.ts
- **Phase 8 (Notifications)**: Depends on Phase 2 (table exists); can run alongside Phase 3â€“7
- **Phase 9 (Polish)**: Depends on all stories complete

### User Story Dependencies

- **US1 (Deposit)**: Independent after Phase 2
- **US4 (Admin)**: Independent after Phase 2; parallel to US1
- **US2 (Dashboard)**: Depends on US1 (page.tsx must exist first)
- **US3 (Trading Report)**: Depends on US2 (page.tsx integration point)
- **US5 (Withdrawal)**: Depends on US1 (actions.ts) and US4 (admin actions.ts)

---

## Parallel Opportunities

```
Phase 1:  T001 â•‘ T002 â•‘ T003 â•‘ T004   (all parallel, different files)
Phase 2:  T005 (single migration file â€” sequential)
Phase 3+: T006â€“T011 (US1) â•‘ T012â€“T018 (US4)   (different routes, fully parallel)
          T019â€“T021 (US2, after US1)
          T022 (US3, after US2)
          T023â€“T025 (US5, after US4)
          T026â€“T029 (Notifications, after Phase 2)
Phase 9:  T030 â•‘ T031 â•‘ T033 â•‘ T034 â•‘ T035   (parallel polish)
```

---

## Implementation Strategy

### MVP (Phase 1 + 2 + 3 + 4)

1. Complete Phase 1: Shared lib (tiers, calc, schemas) â€” 30 min
2. Complete Phase 2: Migration with all RPCs â€” 90 min
3. Complete Phase 3: User deposit flow â€” 60 min
4. Complete Phase 4: Admin review panel â€” 60 min
5. **STOP and VALIDATE**: Quickstart Scenario 1 (depositâ†’approveâ†’dashboard)
6. Deploy MVP â€” users can deposit; admin can approve; dashboard shows locked capital âœ“

### Incremental Delivery

1. MVP above â†’ âœ… Core investment loop working
2. Add Phase 5 (US2 Dashboard with profit calc + countdown) â†’ âœ… Cycle tracking live
3. Add Phase 6 (US3 Trading Report) â†’ âœ… Trust-building UI complete
4. Add Phase 7 (US5 Withdrawals) â†’ âœ… Full profit cycle working
5. Add Phase 8 (Notifications) â†’ âœ… UX polish complete
6. Phase 9 Polish â†’ âœ… Production ready

---

## Notes

- `[P]` tasks = different files, no incomplete-task dependencies â€” safe to run in parallel
- `[Story]` maps each task to its user story for independent traceability
- The `computeInvestmentSummary()` function in `lib/investment/calc.ts` is the single source of truth for all profit numbers â€” test it exhaustively against quickstart.md rounding scenarios before building UI
- The `CycleCountdownTimer` is the **only** `"use client"` component that requires justification (browser `setInterval` API) â€” all others should be RSC by default
- Never call `createAdminClient()` from user-facing server actions â€” use `createClient()` so `auth.uid()` is populated correctly in RPCs (see existing pattern in `app/admin/actions.ts` comments)

