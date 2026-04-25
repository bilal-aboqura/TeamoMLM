# Feature Specification: Profit Shares & Equity Purchasing

**Feature Branch**: `009-profit-shares-equity`  
**Created**: 2026-04-25  
**Status**: Draft  
**Input**: User description: "Build a Profit Shares & Equity Purchasing module for the existing Teamo platform. The goal is to allow users to buy a percentage of the platform's future profits. The total available equity for sale is 30%."

---

## Clarifications

### Session 2026-04-25

- Q: Is the referral code entered during purchase the submitting user's own code, or a different user's (referrer's) code? → A: A **different user's** referral code — the person who referred/introduced the buyer. The code identifies and credits the referrer (introducer), not the purchaser.
- Q: Is there a maximum total equity percentage one user can own across all their accepted requests? → A: Yes, **10% per user** (matching the largest single package). A user cannot accumulate more than 10% total approved equity through multiple requests.
- Q: When remaining global equity is less than a package's percentage, can the system allow partial fulfilment at admin discretion? → A: **No partial fulfilment.** Packages that cannot be fully filled given the remaining equity are disabled in the UI before submission. No custom/split amounts are permitted.
- Q: How should the progress bar and user history status badges refresh after an admin action? → A: **Periodic polling** — the page auto-fetches fresh data every 10–15 seconds in the background. No real-time WebSocket or SSE infrastructure is required.
- Q: How should the system handle concurrent acceptance attempts on the same pending request by two admins simultaneously? → A: **First-write-wins** — the first acceptance commits atomically; the second admin receives a clear "request already processed" error and the admin table auto-refreshes to show the current state.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse & Purchase Equity Package (Priority: P1)

A registered platform user navigates to the Profit Shares section. They see the live progress bar displaying how much equity (out of 30%) has already been sold and how much remains. They browse the available packages (ranging from 0.25% for $500 up to 10% for $20,000), choose a package that fits their budget, and initiate a purchase. A modal appears showing the platform's official USDT wallet address. The user transfers the required amount, then submits a purchase request by entering their unique referral code and uploading a screenshot of the payment receipt.

**Why this priority**: This is the core revenue-generating flow. Without it, the entire module has no value. All other stories depend on this request being created.

**Independent Test**: Can be fully tested by a single registered user navigating to the equity page, selecting a package, filling the purchase modal, and submitting — confirming a "Pending" request appears in their history table.

**Acceptance Scenarios**:

1. **Given** a registered user is on the equity page, **When** they view the progress bar, **Then** the bar accurately reflects the total approved equity percentage out of 30%, updated in real time based on admin-approved requests.
2. **Given** a user views the package grid, **When** the page loads, **Then** all standard packages are displayed with their equity percentage and USD price clearly labeled.
3. **Given** a user clicks on a package to purchase, **When** the purchase modal opens, **Then** the platform's current USDT wallet address is displayed (sourced from the active admin settings).
4. **Given** a user is in the purchase modal, **When** they enter a referral code that does not exist in the system, **Then** the system rejects the submission and shows a clear error indicating the code is invalid.
5. **Given** a user enters a valid referral code and uploads a payment screenshot, **When** they submit the purchase request, **Then** a new request record is created in "Pending" status and the user's history table updates immediately to show it.
6. **Given** 0% equity remains (30% fully sold), **When** any user views the package grid, **Then** all package cards are visually disabled and a "Fully Subscribed" indicator is shown, preventing new submissions.

---

### User Story 2 - Track My Purchase Requests (Priority: P2)

After submitting one or more equity purchase requests, the user can scroll down the same page to view a personal history table. Each row shows the package purchased, the percentage amount, the dollar amount, the submission date, and the current status (Pending, Accepted, or Rejected).

**Why this priority**: Users need transparency into their financial submissions. Without visible request history, trust in the platform is undermined and support requests will increase.

**Independent Test**: Can be tested independently by seeding a user with pre-existing request records in various statuses and confirming the history table renders them all correctly with accurate status labels.

**Acceptance Scenarios**:

1. **Given** a user has submitted purchase requests, **When** they view the "My Requests History" section, **Then** all their requests are listed with: package name, equity %, dollar amount, submission date, and status badge.
2. **Given** an admin has just accepted one of the user's requests, **When** the user reloads or the page auto-refreshes, **Then** the status badge for that request updates from "Pending" to "Accepted".
3. **Given** a user has no purchase history, **When** they view the requests section, **Then** an empty-state message is displayed encouraging them to make their first purchase.

---

### User Story 3 - Admin Reviews & Processes Requests (Priority: P3)

A platform admin navigates to the dedicated Equity Requests admin page. They see a table of all submitted equity purchase requests from all users, with the most recent at the top. The admin can open the uploaded payment screenshot for any row. For pending requests, the admin can click "Accept" or "Reject". Accepting a request marks it as approved and automatically updates the global equity sold counter (which feeds the public progress bar).

**Why this priority**: Without admin processing, no request can ever be approved. The admin page is the control center that validates all purchases and maintains the integrity of the equity cap.

**Independent Test**: Can be tested independently by seeding pending requests and confirming the admin can view, open screenshot, and approve/reject — then verifying the global sold percentage updates correctly after an approval.

**Acceptance Scenarios**:

1. **Given** an admin navigates to the equity admin page, **When** the page loads, **Then** all equity purchase requests from all users are displayed in a table sorted by submission date descending.
2. **Given** an admin views a request row, **When** they click the screenshot thumbnail or view button, **Then** the uploaded payment proof image opens in a legible preview.
3. **Given** an admin clicks "Accept" on a pending request, **When** the action is confirmed, **Then** the request status changes to "Accepted" and the total sold equity percentage increases by the accepted package's percentage.
4. **Given** an admin clicks "Reject" on a pending request, **When** the action is confirmed, **Then** the request status changes to "Rejected" and the total sold equity counter remains unchanged.
5. **Given** an admin accepts a request that would push total sold equity beyond 30%, **When** the system processes it, **Then** the acceptance is blocked and the admin receives a clear warning that the equity cap would be exceeded.
6. **Given** a request is already Accepted or Rejected, **When** the admin views it, **Then** the Accept/Reject action buttons are disabled or hidden for that row (no double-processing).

---

### User Story 4 - Public Equity Progress Visibility (Priority: P4)

Any visitor (authenticated or not) to the Profit Shares page can see the live progress bar showing how much of the 30% total equity has been sold and how much remains available. This provides social proof and urgency for potential buyers.

**Why this priority**: The progress bar is a passive trust-building element. The core purchase flow works without it being interactive, but it significantly impacts conversion and urgency perception.

**Independent Test**: Can be verified independently by approving requests in the admin panel and confirming the progress bar percentage updates correctly on the public page without requiring a full page reload.

**Acceptance Scenarios**:

1. **Given** a visitor lands on the equity page, **When** the page loads, **Then** the progress bar is visible and correctly displays the current sold percentage as a proportion of 30% total available equity.
2. **Given** an admin has just approved a request for 2% equity, **When** any user views the page, **Then** the progress bar reflects the updated sold figure (increased by 2%).
3. **Given** the total sold equity is 0%, **When** a user views the bar, **Then** it shows "0% sold" and "30% available" with no misleading filled state.

---

### Edge Cases

- When remaining global equity is less than a package's percentage, that package is disabled in the UI entirely — the user cannot submit a request for it, and no partial or custom amounts are accepted.
- How does the system handle duplicate referral code submissions for the same package by the same user?
- What happens if a user attempts to enter their own referral code as the referrer code — is this blocked with a specific error message?
- What happens if the admin wallet address has not been configured in the Admin Settings table yet — how is this surfaced to the user?
- What if a user uploads a file that is not an image (e.g., PDF, video) as their payment proof?
- What happens if a user submits a request and the upload partially fails — is the request saved without a screenshot?
- If two admins attempt to accept the same pending request simultaneously, the system processes only the first action atomically; the second admin receives a "request already processed" error and sees the updated request state on the admin table.
- What happens when a user attempts to submit a new equity purchase request that would push their personal total above 10%? (e.g., they already hold 8% approved and try to purchase a 5% package)

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST display a public-facing progress bar on the Profit Shares page showing the percentage of equity already sold out of the 30% total cap.
- **FR-002**: The progress bar MUST be calculated dynamically, counting only equity purchase requests with "Accepted" status.
- **FR-003**: The system MUST display a grid of pre-defined equity packages ranging from 0.25% ($500) to 10% ($20,000).
- **FR-004**: Any package whose equity percentage exceeds the current remaining available equity MUST be visually disabled and non-purchasable. No partial fulfilment is permitted — a package is either available in full or blocked entirely.
- **FR-005**: When total sold equity reaches 30%, ALL packages MUST be disabled and the page MUST display a "Fully Subscribed" status.
- **FR-006**: Clicking a purchasable package MUST open a purchase modal displaying the platform's current USDT wallet address, fetched from the Admin Settings record.
- **FR-007**: If no USDT wallet address is configured in Admin Settings, the purchase modal MUST display a clear notice instead of an empty address field.
- **FR-008**: The purchase modal MUST require the user to enter a **referrer's referral code** before submission — the code of the existing platform user who introduced or referred the purchaser (not the submitting user's own code).
- **FR-009**: The system MUST validate that the entered referral code maps to a **different, existing user** in the platform's user database before allowing submission. The submitting user's own referral code MUST be rejected.
- **FR-010**: The purchase modal MUST require the user to upload a payment screenshot as proof of transfer.
- **FR-011**: The system MUST only accept image file types (JPEG, PNG, WebP) for the payment screenshot upload.
- **FR-012**: Upon successful submission, the system MUST create a new equity purchase request record with "Pending" status.
- **FR-013**: The authenticated user MUST be able to view a "My Requests History" table on the Profit Shares page listing all their own equity purchase requests.
- **FR-014**: The history table MUST show for each request: package name, equity percentage, USD amount, submission date, and current status badge.
- **FR-015**: Admins MUST have access to a dedicated Equity Requests page within the admin dashboard.
- **FR-016**: The admin page MUST display all equity purchase requests from all users, sorted by submission date (newest first).
- **FR-017**: Admins MUST be able to view the uploaded payment screenshot for any request.
- **FR-018**: Admins MUST be able to Accept or Reject any request that is in "Pending" status.
- **FR-019**: Accepting a request MUST atomically update that request's status to "Accepted" and increment the global sold equity counter by the package's percentage.
- **FR-020**: The system MUST prevent an admin from accepting a request if doing so would cause the total sold equity to exceed 30%.
- **FR-021**: Requests in "Accepted" or "Rejected" status MUST NOT have actionable Accept/Reject controls available.
- **FR-022**: The Profit Shares page MUST be accessible to authenticated platform users; the admin panel page is restricted to users with admin privileges.
- **FR-023**: The system MUST enforce a maximum total equity holding of 10% per user. A user MUST NOT be able to submit a new purchase request if their current total approved equity (sum of all their Accepted requests) plus the new package's percentage would exceed 10%. An appropriate error message MUST be shown.
- **FR-024**: The system MUST process all Accept and Reject actions atomically using a first-write-wins strategy. Before committing an acceptance, the system MUST verify the request is still in "Pending" status; if it has already been actioned, the operation MUST be rejected and the admin MUST receive a clear "request already processed" error.

### Key Entities

- **Equity Package**: A predefined offering representing a fixed percentage of the platform's future profits at a fixed USD price. Has attributes: label, equity percentage, price in USD.
- **Equity Purchase Request**: A user's application to buy a specific equity package. Has attributes: requesting user, selected package, referral code used, payment screenshot file reference, submission timestamp, status (Pending / Accepted / Rejected), and processing timestamp.
- **Global Equity Counter**: A derived aggregate value representing the sum of all Accepted request percentages. Used to enforce the 30% cap and render the public progress bar. Not stored as a fixed field — always computed from approved requests.
- **Admin Settings (USDT Wallet)**: The existing admin-controlled settings record that stores the platform's USDT wallet address, reused by this module.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A registered user can browse packages, open the purchase modal, enter a referral code, upload proof, and submit their request in under 3 minutes from first landing on the page.
- **SC-002**: The progress bar and user request status badges on the public page refresh automatically via polling every 10–15 seconds — ensuring updates from an admin approval are visible to any active user within 15 seconds without a manual page reload.
- **SC-003**: 100% of referral code validation errors are surfaced to the user before submission with a clear, actionable message — no silent failures.
- **SC-004**: The total sold equity never exceeds 30% — the system blocks any acceptance that would breach the cap, with a 0% error margin.
- **SC-005**: Admins can open, review, and action (Accept/Reject) any pending request within 2 clicks from the admin requests table.
- **SC-006**: All user request history is displayed with accurate status labels — status discrepancies between the user view and admin view are 0%.
- **SC-007**: Invalid file types (non-image uploads) are rejected at the point of selection with a user-facing error, before any network transfer occurs.

---

## Assumptions

- The platform already has a working authentication and authorization system that distinguishes between standard users and admin users — this module will reuse those roles.
- An "Admin Settings" table or record already exists in the database and contains a field for the platform's USDT wallet address; this module reads from it but does not manage it.
- The referral code validation checks against the existing `users` table or equivalent user record store, using the referral code field already present on user profiles.
- The predefined equity packages (0.25% → $500, 0.5% → $1,000, 1% → $2,000, 2% → $4,000, 5% → $10,000, 10% → $20,000) are fixed at launch; dynamic package creation by admins is out of scope for this version.
- Payment is handled entirely off-platform (user manually transfers USDT); the system only records the intent and proof — no payment gateway integration is required.
- A single user may submit multiple equity purchase requests (e.g., buy 1% now and 2% later), but their total approved equity across all requests is capped at 10% — the system prevents submission if this cap would be breached.
- Mobile-first layout applies: the package grid is single-column on mobile, multi-column on larger screens, consistent with the platform's existing design system.
- The admin approval workflow does not send automated email/push notifications to users upon status change in this version (out of scope); users check their history table manually.
- File storage for uploaded payment screenshots uses the platform's existing file/media storage infrastructure.
- The Profit Shares page polls for updated equity data (progress bar and request statuses) every 10–15 seconds automatically; no real-time push infrastructure (WebSockets, SSE) is required.
