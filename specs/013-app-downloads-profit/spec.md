# Feature Specification: App Downloads Profit

**Feature Branch**: `013-app-downloads-profit`  
**Created**: 2026-04-25  
**Status**: Draft  
**Input**: User description: "Build the App Downloads Profit (الربح بالتطبيقات) module as a standalone system. It must use entirely new database tables and routes to avoid any conflict with legacy task systems."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Eligible User Completes an App Offer (Priority: P1)

An eligible user opens "الربح بالتطبيقات", sees available app download offers, opens the download link, uploads a screenshot proof, and sees the offer status move to "Under Review" until admin review.

**Why this priority**: This is the core earning flow. Without it, users cannot discover app offers or submit proof for app-profit earnings.

**Independent Test**: Can be tested by giving one user app-profit access, publishing one active app offer, submitting a proof screenshot, and confirming the user's submission appears as "Under Review" without changing any legacy task records.

**Acceptance Scenarios**:

1. **Given** a user who meets app-profit access requirements and an active app offer, **When** the user opens `/dashboard/app-profits`, **Then** the user sees the offer title, provider, download link, USD reward, and their current status.
2. **Given** an eligible user viewing an offer that has not been executed, **When** the user uploads a valid screenshot proof, **Then** the system records a new app-profit submission with "Under Review" status and hides duplicate submission for the same active review.
3. **Given** a user who does not meet app-profit access requirements, **When** the user opens `/dashboard/app-profits`, **Then** the user is blocked and sees a clear access message without seeing the offer list.

---

### User Story 2 - Admin Manages App Offers and Reviews Proofs (Priority: P2)

An admin creates and maintains app download offers from providers such as MyLead, CPAlead, and Tapjoy, then reviews submitted screenshots and approves or rejects them.

**Why this priority**: App offers and proof reviews are required to keep the earning flow operational and prevent automatic wallet credit without human verification.

**Independent Test**: Can be tested by creating an offer, submitting proof as a user, then approving or rejecting the proof from the admin review queue and confirming the user-facing status updates.

**Acceptance Scenarios**:

1. **Given** an admin is on app-profit offer management, **When** the admin creates an offer with title, provider, download link, reward, required tier, and active state, **Then** eligible users can see it if it is active.
2. **Given** a pending app-profit submission, **When** an admin approves it, **Then** the submission becomes "Approved" and the user's App Profits Wallet increases by the offer reward exactly once.
3. **Given** a pending app-profit submission, **When** an admin rejects it, **Then** the submission becomes "Rejected" and no app-profit balance is credited.

---

### User Story 3 - User Views App-Profit History (Priority: P3)

An eligible user opens their app-profit history to see their submitted app tasks, dates, proof screenshots, USD amounts, and statuses.

**Why this priority**: Users need transparency and supportability around what they submitted, what was approved, and what amount was earned.

**Independent Test**: Can be tested by creating submissions in different statuses and confirming the history table shows each row with the correct app name, date, screenshot proof, amount, and status.

**Acceptance Scenarios**:

1. **Given** a user has app-profit submissions, **When** the user opens `/dashboard/app-profits/history`, **Then** the user sees only their own app-profit submissions.
2. **Given** a submission has a screenshot proof, **When** the user views history, **Then** the proof is visible through controlled access and not through a public unrestricted file URL.

---

### User Story 4 - User Requests Friday-Only Withdrawal (Priority: P4)

An eligible user views their App Profits Wallet and can request a withdrawal only on Fridays. Requests go to admin review before payout.

**Why this priority**: Withdrawal completes the business cycle, but it depends on earning and review flows being in place first.

**Independent Test**: Can be tested by setting an app-profit balance, checking that the withdrawal button is disabled on non-Fridays, enabled on Fridays, and that submitted requests appear in the admin payout queue.

**Acceptance Scenarios**:

1. **Given** today is not Friday, **When** a user opens `/dashboard/app-profits/withdraw`, **Then** the withdrawal button is disabled and the page explains that withdrawals open on Fridays only.
2. **Given** today is Friday and the user has sufficient App Profits Wallet balance, **When** the user submits a withdrawal request, **Then** a pending app-profit withdrawal request is created for admin review.
3. **Given** a pending app-profit withdrawal, **When** an admin marks it paid or rejected, **Then** the withdrawal status updates without affecting legacy task or deposit balances.

### Edge Cases

- User has a qualifying main package but no rank: access is granted.
- User has a qualifying rank but no qualifying package: access is granted.
- User purchased a dedicated app package but has a lower rank and lower main package: access is granted.
- User tries to submit proof twice while a previous proof for the same offer is under review or already approved: duplicate active submission is blocked.
- Offer becomes inactive after the user opens the page: new proof submission is rejected and the user is asked to refresh.
- Admin attempts to approve an already approved or rejected submission: no duplicate credit is issued.
- Screenshot proof is missing, empty, too large, or unsupported: submission is rejected with a clear message.
- User tries to withdraw more than their App Profits Wallet balance: request is rejected.
- User tries to bypass the Friday-only UI restriction: server-side validation still blocks the request on non-Fridays.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The App Downloads Profit module MUST be standalone and MUST NOT read from or write to legacy daily-task, offerwall, deposit, or package-task execution records.
- **FR-002**: The system MUST expose separate user areas for the app offer list, app-profit history, and app-profit withdrawals.
- **FR-003**: The system MUST expose separate admin areas for app offer management, proof review, and withdrawal processing.
- **FR-004**: The app offer list MUST be inaccessible unless the user qualifies by rank, by main package tier, or by a dedicated app package purchase.
- **FR-005**: The access gate MUST allow Commander Level 1 or higher.
- **FR-006**: The access gate MUST allow users with main package B1 or higher.
- **FR-007**: The access gate MUST allow users who purchased a dedicated app package at one of the configured app-package tiers: 200, 300, 400, 500, or 600 USD.
- **FR-008**: The system MUST show each active app offer with app name, provider, download link, USD reward, required tier, and user-specific status.
- **FR-009**: Offer status labels MUST include Not Executed, Under Review, Approved, and Rejected.
- **FR-010**: The system MUST NOT require or display app images for this MVP.
- **FR-011**: Users MUST be able to upload a screenshot proof for an active offer they are allowed to access.
- **FR-012**: Proof screenshots MUST be private and only available to the submitting user and admins through controlled access.
- **FR-013**: Admins MUST be able to create, edit, activate, and deactivate app offers without affecting legacy task definitions.
- **FR-014**: Admins MUST be able to approve or reject app-profit submissions.
- **FR-015**: Approving a submission MUST atomically change the submission status and credit the user's App Profits Wallet.
- **FR-016**: The App Profits Wallet MUST be isolated from deposit balances, legacy task balances, and any other earning wallet.
- **FR-017**: Approval MUST be idempotent: an approved submission cannot be credited more than once.
- **FR-018**: Rejected submissions MUST not credit any wallet balance.
- **FR-019**: Users MUST have a "My Tasks" history showing app name, date, proof screenshot, USD amount, and status.
- **FR-020**: Users MUST be able to view their App Profits Wallet balance separately from all other balances.
- **FR-021**: Users MUST be able to request app-profit withdrawals only on Fridays.
- **FR-022**: The withdrawal interface MUST disable the withdraw action and explain the Friday-only rule on all non-Friday days.
- **FR-023**: Server-side withdrawal validation MUST reject non-Friday withdrawal attempts even if the UI is bypassed.
- **FR-024**: App-profit withdrawal requests MUST enter an admin review queue before payout.
- **FR-025**: Admins MUST be able to mark app-profit withdrawals as paid or rejected.
- **FR-026**: App-profit withdrawals MUST not reduce or mutate deposit balances or legacy task balances.
- **FR-027**: All money amounts in this module MUST be represented in USD.
- **FR-028**: The module MUST support providers including MyLead, CPAlead, and Tapjoy while allowing additional provider names.

### Key Entities

- **App Profit Offer**: A downloadable app earning opportunity with title, provider, download link, USD reward, required tier, and active/inactive state.
- **App Profit Submission**: A user's screenshot proof for a specific app offer, including status, creation date, and review outcome.
- **App Profits Wallet**: The isolated USD balance for earnings from app downloads only.
- **App Profit Withdrawal**: A user request to withdraw App Profits Wallet funds, with pending, paid, or rejected status.
- **User Access Profile**: The set of rank, main package, and app-package qualifications used to determine whether the user may access the module and how many offers they may execute.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of users who do not meet the access gate are blocked from viewing app offers.
- **SC-002**: Eligible users can submit proof for an app offer in under 2 minutes from opening the offer list.
- **SC-003**: Admins can approve or reject a pending screenshot submission in under 1 minute from the review page.
- **SC-004**: Approved submissions credit the App Profits Wallet exactly once in 100% of repeated approval attempts.
- **SC-005**: 100% of app-profit balance changes remain isolated from deposit and legacy task balances.
- **SC-006**: Withdrawal requests are accepted on Fridays and rejected on non-Fridays in 100% of tested attempts.
- **SC-007**: Users can find every submitted app task in history with status and amount in under 10 seconds.

## Assumptions

- Existing user authentication and admin authentication are reused.
- A user profile already contains or can expose fields for rank, main package tier, and app package qualification.
- Dedicated app-package purchase tracking can be represented as a user-profile qualification for MVP access control.
- Quotas by rank/package are part of the business model, but MVP scope enforces access only; quota enforcement can be added later.
- Proof screenshots are image files uploaded by authenticated users.
- Payout execution after an admin marks a withdrawal paid happens outside this module or through existing admin operations.
