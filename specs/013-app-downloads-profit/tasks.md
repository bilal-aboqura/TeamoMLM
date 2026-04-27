# Tasks: App Downloads Profit

**Branch**: `013-app-downloads-profit`  
**Input**: Design documents from `/specs/013-app-downloads-profit/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

## Phase 1: Setup

**Purpose**: Shared types, validation, and route scaffolding.

- [X] T001 Create `lib/app-profits/types.ts` with AppProfitOffer, AppProfitSubmission, AppProfitWallet, AppProfitWithdrawal, and status union types from contracts.
- [X] T002 Create `lib/validations/app-profit-schemas.ts` with Zod schemas for offer CRUD, proof upload, withdrawal amount, and admin rejection reason.
- [X] T003 Create `lib/app-profits/access.ts` with server helpers to check app-profit eligibility from `users.leadership_level`, `users.current_package_level`, and `user_isolated_wallets.app_package_amount`.

## Phase 2: Foundational

**Purpose**: Isolated schema, storage, RLS, and RPCs required before UI.

- [X] T004 Create `supabase/migrations/20260425000025_app_downloads_profit.sql` with four isolated tables, private `app-profit-proofs` bucket, RLS policies, indexes, triggers, and app-profit RPCs.
- [X] T005 Verify `.gitignore` and `.dockerignore` still contain Node/Next/Supabase essentials; append only missing critical patterns if needed.

## Phase 3: User Story 1 - Eligible User Completes an App Offer (P1)

**Goal**: Eligible users see app offers, open download links, upload screenshot proof, and see Under Review status.

**Independent Test**: Create an active offer and eligible user, submit proof at `/dashboard/app-profits`, verify pending submission and no legacy task table writes.

- [X] T006 [US1] Create `app/dashboard/app-profits/data.ts` to fetch gated user access, wallet, active offers, and per-user submission statuses.
- [X] T007 [US1] Create `app/dashboard/app-profits/actions.ts` with `submitAppProfitProof` that validates file, uploads to `app-profit-proofs`, calls `user_submit_app_profit_proof`, cleans up upload on RPC failure, and revalidates app-profit routes.
- [X] T008 [P] [US1] Create `app/dashboard/app-profits/_components/AccessLockedState.tsx` for the locked Arabic access message.
- [X] T009 [P] [US1] Create `app/dashboard/app-profits/_components/AppOfferList.tsx` rendering text-only app offers.
- [X] T010 [P] [US1] Create `app/dashboard/app-profits/_components/AppOfferCard.tsx` with app name, provider, reward, status badge, download link, and upload action trigger.
- [X] T011 [P] [US1] Create `app/dashboard/app-profits/_components/ProofUploadModal.tsx` as a justified client component using `useActionState` for proof upload.
- [X] T012 [US1] Create `app/dashboard/app-profits/page.tsx` as an async Server Component with access gate and offer list.
- [X] T013 [P] [US1] Create `app/dashboard/app-profits/loading.tsx` with skeleton cards.
- [X] T014 [P] [US1] Create `app/dashboard/app-profits/error.tsx` with Arabic retry boundary.

## Phase 4: User Story 2 - Admin Manages Offers and Reviews Proofs (P2)

**Goal**: Admins create app offers and approve/reject screenshot proofs.

**Independent Test**: Admin creates offer, user submits proof, admin approves it, and only `app_profits_balance` changes.

- [X] T015 [US2] Create `app/admin/app-profits/manage/actions.ts` with create/update/toggle/delete app-profit offer Server Actions.
- [X] T016 [P] [US2] Create `app/admin/app-profits/manage/_components/OfferForm.tsx` for offer creation/editing.
- [X] T017 [P] [US2] Create `app/admin/app-profits/manage/_components/OffersTable.tsx` for CRUD/toggle controls.
- [X] T018 [US2] Create `app/admin/app-profits/manage/page.tsx` to list offers and render management UI.
- [X] T019 [P] [US2] Create `app/admin/app-profits/manage/loading.tsx` and `app/admin/app-profits/manage/error.tsx`.
- [X] T020 [US2] Create `app/admin/app-profits/reviews/actions.ts` with approve/reject submission Server Actions calling app-profit RPCs.
- [X] T021 [US2] Create `app/admin/app-profits/reviews/page.tsx` fetching pending/reviewed submissions and signed proof URLs.
- [X] T022 [P] [US2] Create `app/admin/app-profits/reviews/_components/ReviewsTable.tsx` with signed screenshot preview and approve/reject controls.
- [X] T023 [P] [US2] Create `app/admin/app-profits/reviews/loading.tsx` and `app/admin/app-profits/reviews/error.tsx`.

## Phase 5: User Story 3 - User Views App-Profit History (P3)

**Goal**: Users see their app submissions, proofs, amounts, dates, and statuses.

**Independent Test**: With submissions in all statuses, `/dashboard/app-profits/history` shows only the current user's rows.

- [X] T024 [US3] Create `app/dashboard/app-profits/history/page.tsx` with access gate, signed proof URLs, and history table.
- [X] T025 [P] [US3] Create `app/dashboard/app-profits/history/loading.tsx` and `app/dashboard/app-profits/history/error.tsx`.

## Phase 6: User Story 4 - Friday-Only Withdrawals (P4)

**Goal**: Users request app-profit withdrawals only on Fridays; admins process payout queue.

**Independent Test**: Non-Friday withdrawal is disabled and rejected server-side; Friday request appears in admin queue and can be paid/rejected.

- [X] T026 [US4] Create `app/dashboard/app-profits/withdraw/actions.ts` with `submitAppProfitWithdrawal` enforcing Friday with `new Date().getDay() === 5`.
- [X] T027 [P] [US4] Create `app/dashboard/app-profits/withdraw/_components/WithdrawForm.tsx` with disabled non-Friday UI.
- [X] T028 [US4] Create `app/dashboard/app-profits/withdraw/page.tsx` with access gate, wallet balance, day-state, and withdrawal history.
- [X] T029 [P] [US4] Create `app/dashboard/app-profits/withdraw/loading.tsx` and `app/dashboard/app-profits/withdraw/error.tsx`.
- [X] T030 [US4] Create `app/admin/app-profits/withdrawals/actions.ts` with paid/reject withdrawal Server Actions.
- [X] T031 [US4] Create `app/admin/app-profits/withdrawals/page.tsx` fetching pending and historical app-profit withdrawals.
- [X] T032 [P] [US4] Create `app/admin/app-profits/withdrawals/_components/WithdrawalsTable.tsx`.
- [X] T033 [P] [US4] Create `app/admin/app-profits/withdrawals/loading.tsx` and `app/admin/app-profits/withdrawals/error.tsx`.

## Phase 7: Polish & Navigation

- [X] T034 Add app-profit navigation links to `app/dashboard/page.tsx`, `app/admin/_components/AdminSidebar.tsx`, and `app/admin/_components/AdminMobileHeader.tsx` without removing legacy task links.
- [X] T035 Run `npx.cmd tsc --noEmit` and `npm.cmd run build`; fix any failures.
- [ ] T036 Run quickstart.md manual checklist where environment data is available; leave unchecked if live Friday/admin data is unavailable.

## Dependencies & Execution Order

1. Phase 1 must complete before all other phases.
2. T004 blocks user/admin flows because all routes depend on isolated tables and RPCs.
3. US1 is the MVP.
4. US2 depends on T004 and can be developed after US1 data contracts are in place.
5. US3 depends on submissions from US1.
6. US4 depends on wallet from T004 and can be implemented after US1.
7. Navigation and validation run last.

## Parallel Execution Examples

- After T004: T008, T009, T010, T011, T013, and T014 can be built in parallel.
- In US2: T016, T017, T019, T022, and T023 touch separate files and can run in parallel after actions/data shape are defined.
- In US4: T027, T029, T032, and T033 are independent UI/support files.

## Implementation Strategy

1. Build schema and access gate.
2. Deliver MVP user offer list and proof upload.
3. Add admin offer/review tools and atomic approval.
4. Add user history.
5. Add Friday-only withdrawal workflow.
6. Add navigation and run full validation.
