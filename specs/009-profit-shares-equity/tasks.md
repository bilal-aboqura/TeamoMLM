# Task Breakdown: Profit Shares & Equity Purchasing

**Feature**: Profit Shares & Equity Purchasing  
**Branch**: `009-profit-shares-equity`

## Implementation Strategy

This feature will be built in phases corresponding to the prioritized user stories. 
The MVP (Minimum Viable Product) requires completing Phase 1, Phase 2, and Phase 3 (User Story 1).
Subsequent phases add history tracking, admin processing, and live progress visibility.

### Dependencies & Execution Order

- **Setup & Foundational (Phases 1-2)** must be completed first.
- **US1 (Phase 3)** depends on Phase 2.
- **US2 (Phase 4)** depends on US1 (needs data to show).
- **US3 (Phase 5)** depends on US1 (needs data to process).
- **US4 (Phase 6)** depends on US3 (needs accepted data to show progress).

*Parallel Opportunities*: Once Phase 2 is complete, US1 and the UI components of US3/US4 can be developed in parallel by stubbing the data fetching layer.

---

## Phase 1: Setup (Database & Storage)
*Goal: Initialize the data model and storage buckets required for the feature.*

- [X] T001 Execute SQL to create `profit_share_requests` table with `profit_share_status` enum in Supabase.
- [X] T002 Execute SQL to create `equity-receipts` storage bucket in Supabase.
- [X] T003 Execute SQL to set up Row Level Security (RLS) policies for the table and bucket.
- [X] T004 Execute SQL to ensure `usdt_wallet_address` exists in the `platform_settings` table.

## Phase 2: Foundational (Core Utilities & Schemas)
*Goal: Implement shared server-side functions and schemas used across multiple stories.*

- [X] T005 Create `EquityPurchaseSchema` and `EQUITY_PACKAGES` constants in `lib/validations/equity-schemas.ts` (copying from `contracts/types.ts`).
- [X] T006 Implement server utility to fetch `usdt_wallet_address` from `platform_settings` in `lib/db/settings.ts`.
- [X] T007 Implement server utility to calculate `total_sold_equity` (sum of accepted percentages) in `lib/db/equity.ts`.
- [X] T008 Implement server utility to check if a `sponsor_referral_code` is valid and belongs to a different user in `lib/db/users.ts`.
- [X] T009 Implement Supabase storage upload utility for the `equity-receipts` bucket in `lib/storage/upload.ts`.

## Phase 3: [US1] Browse & Purchase Equity Package
*Goal: Allow users to view available packages and submit a purchase request with a receipt.*
*Independent Test: A user can view packages, open the modal, upload an image, enter a valid referral code, and submit successfully.*

- [X] T010 [US1] Create the main Profit Shares page skeleton in `app/dashboard/profit-shares/page.tsx`.
- [X] T011 [US1] Create `PackageGrid` component to display `EQUITY_PACKAGES` in `app/dashboard/profit-shares/_components/PackageGrid.tsx`.
- [X] T012 [US1] Create `PurchaseModal` component with file upload and referral code inputs in `app/dashboard/profit-shares/_components/PurchaseModal.tsx`.
- [X] T013 [US1] Implement `submitPurchaseRequest` Server Action enforcing the 10% per-user cap and remaining global equity checks in `app/dashboard/profit-shares/actions.ts`.
- [X] T014 [US1] Integrate `PurchaseModal` with the Server Action and handle loading/error/success states.
- [X] T015 [US1] Implement logic in `PackageGrid` to visually disable packages that exceed the remaining available equity.

## Phase 4: [US2] Track My Purchase Requests
*Goal: Allow users to view their past and pending purchase requests.*
*Independent Test: A user can see their submitted requests in a table with accurate status badges.*

- [X] T016 [US2] Implement server utility to fetch a user's `profit_share_requests` in `lib/db/equity.ts`.
- [X] T017 [US2] Create `RequestHistory` table component in `app/dashboard/profit-shares/_components/RequestHistory.tsx`.
- [X] T018 [US2] Create a status badge component for Pending/Accepted/Rejected states in `app/dashboard/profit-shares/_components/RequestStatusBadge.tsx`.
- [X] T019 [US2] Integrate `RequestHistory` into the main Profit Shares page below the package grid.

## Phase 5: [US3] Admin Reviews & Processes Requests
*Goal: Allow admins to view, accept, or reject pending equity requests.*
*Independent Test: An admin can view requests, open a receipt, and accept a request (which atomically updates DB).*

- [X] T020 [US3] Create the Equity Requests admin page skeleton in `app/admin/equity-requests/page.tsx`.
- [X] T021 [US3] Implement server utility to fetch all `profit_share_requests` (with user details) in `lib/db/admin-equity.ts`.
- [X] T022 [US3] Create `AdminRequestsTable` component to list all requests in `app/admin/equity-requests/_components/AdminRequestsTable.tsx`.
- [X] T023 [US3] Implement `processPurchaseRequest` Server Action with atomic `UPDATE` and 30% global cap verification in `app/admin/equity-requests/actions.ts`.
- [X] T024 [US3] Implement a receipt image viewer modal/dialog in the admin table.
- [X] T025 [US3] Integrate Accept/Reject buttons in the admin table with the Server Action.

## Phase 6: [US4] Public Equity Progress Visibility
*Goal: Display a live progress bar of sold equity.*
*Independent Test: The progress bar accurately shows total sold equity and polls for updates every 10-15s.*

- [X] T026 [P] [US4] Create `ProgressBar` UI component in `app/dashboard/profit-shares/_components/ProgressBar.tsx`.
- [X] T027 [US4] Implement a client-side polling hook (using SWR or React Query) to fetch `total_sold_equity` every 15 seconds.
- [X] T028 [US4] Create a lightweight API route or dedicated Server Action for the polling client to hit in `app/api/equity/progress/route.ts` or `actions.ts`.
- [X] T029 [US4] Integrate the `ProgressBar` at the top of the Profit Shares page.

## Phase 7: Polish & Cross-Cutting Concerns
*Goal: Final UI polish, error handling, and design system alignment.*

- [X] T030 Ensure all new UI components strictly use RTL logical CSS properties (`ms-`, `pe-`, etc.).
- [X] T031 Verify that all error messages from server actions are surfaced clearly in the UI.
- [X] T032 Add a "Fully Subscribed" UI state to the Profit Shares page when the global 30% cap is reached.
- [X] T033 Verify that the `PurchaseModal` gracefully handles non-image file uploads and displays appropriate errors.
