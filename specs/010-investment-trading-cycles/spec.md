# Feature Specification: Investment & Trading Cycles Module

**Feature Branch**: `010-investment-trading-cycles`  
**Created**: 2026-04-25  
**Status**: Draft  
**Input**: User description: "Build the Investment & Trading Cycles module for Teamo. The goal is to allow users to deposit capital (which cannot be withdrawn) to earn fixed percentage profits every 7 days based on their deposit tier."

---

## Clarifications

### Session 2026-04-25

- Q: When does an investment's lifecycle end / transition to "Completed" status? → A: Investment runs indefinitely. Cycles continue earning profit every 7 days until an admin or user explicitly requests closure, at which point the admin sets the status to Completed. Capital is never returned; only profits are withdrawable.
- Q: How is the user informed when their deposit request is approved or rejected by an admin? → A: An in-app notification record is created on admin decision (approve or reject), surfaced via the platform's existing notification system (badge/alert in the top app bar) on the user's next visit or while the app is open.
- Q: What is the minimum withdrawal amount? → A: 10 USDT. Withdrawal requests below 10 USDT must be rejected by the system.
- Q: Where do admins manage withdrawal requests — same investments page or a separate route? → A: Same `/admin/investments` page, using a tab/segmented-control toggle between "Deposit Requests" and "Withdrawal Requests".
- Q: What rounding rule applies to profit calculations? → A: Round **down** (floor) to 2 decimal places. The platform never over-pays due to rounding; any fractional cent below the floor is discarded.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Depositing Capital into an Investment Account (Priority: P1)

A registered user wants to invest funds by depositing capital into their Teamo investment account. They navigate to the Investment dashboard, choose a tier based on the amount they wish to deposit, view the admin's USDT wallet address, enter the deposit amount, and upload a screenshot of their completed payment. They understand upfront that this capital is permanently locked and cannot be withdrawn — only profits can.

**Why this priority**: This is the foundational action of the entire module. No profit cycles, no dashboard stats, no admin review flow exist without first having a deposit. All other stories depend on this path.

**Independent Test**: Can be tested end-to-end by a user successfully submitting a deposit request (screenshot + amount) and seeing a "pending review" status on their dashboard — without any admin action needed to verify the UI flow.

**Acceptance Scenarios**:

1. **Given** a logged-in user on the Investment dashboard, **When** they click "Deposit" and view the profit tier table, **Then** they see all 5 tiers (100–499 → 5%, 500–1999 → 8%, 2000–4999 → 12%, 5000–9999 → 18%, 10000+ → 25%) clearly displayed.
2. **Given** a user viewing the deposit flow, **When** they proceed past the tier table, **Then** they see the admin's USDT wallet address/QR prominently displayed with a copy button.
3. **Given** a user who has made the external payment, **When** they enter a valid deposit amount and upload a payment screenshot, **Then** their deposit request is submitted and they see a "Pending Admin Review" status with a confirmation message.
4. **Given** a user attempts to submit a deposit, **When** the amount entered falls below 100 (the minimum tier), **Then** the system rejects the submission with an informative message about the minimum deposit requirement.
5. **Given** a user with an existing active or pending deposit, **When** they attempt to open a new deposit, **Then** the system prevents this and explains they must wait until their current cycle completes or their request is rejected.

---

### User Story 2 — Viewing Investment Dashboard & Active Cycle Progress (Priority: P1)

A user with an approved active investment wants to monitor their capital at work. They visit the Investment dashboard to see their locked capital balance, total profits earned to date, the amount available for withdrawal, and a live visual countdown to the end of their current 7-day trading cycle.

**Why this priority**: This is the primary engagement surface. Users return to the app repeatedly to check their cycle progress. Without this, the module has no ongoing value after the initial deposit.

**Independent Test**: Can be tested with a seeded approved deposit. The dashboard must show correct capital, computed profit, withdrawable amount, and a countdown timer that accurately reflects time remaining in the current 7-day cycle.

**Acceptance Scenarios**:

1. **Given** a user with one approved deposit (e.g., $500 approved 3 days ago), **When** they visit `/dashboard/investment`, **Then** they see their Capital Balance ($500), Total Earned Profit ($0 — no full cycle complete yet), and Available for Withdrawal ($0).
2. **Given** a user whose first full 7-day cycle has just completed (e.g., $500 at 8%), **When** they visit the dashboard, **Then** Total Earned Profit shows $40 and Available for Withdrawal shows $40.
3. **Given** a user mid-cycle, **When** they view the dashboard, **Then** a visual countdown timer shows the days, hours, and minutes remaining until the next profit is credited.
4. **Given** a user with multiple completed cycles (e.g., 3 cycles of $2000 at 12%), **When** they view the dashboard, **Then** Total Earned Profit correctly shows the cumulative profit across all completed cycles ($720).
5. **Given** a user with no investment history, **When** they visit `/dashboard/investment`, **Then** they see an empty state with a clear call-to-action to make their first deposit.

---

### User Story 3 — Viewing the Trading Report (Priority: P2)

A user wants to understand the platform's trading performance for the current cycle. They see a visual summary showing the number of trades executed, how many were won vs. lost, and the net result percentage — giving context to why they are earning their stated profit rate.

**Why this priority**: This builds user trust and explains the profit mechanism. It is a supporting feature that increases retention but is not required for core financial operations.

**Independent Test**: Can be tested independently as a static display component visible to any user with an active investment. The data shown is a platform-level summary, not user-specific, and can be validated by checking the displayed values match the dummy/seeded data.

**Acceptance Scenarios**:

1. **Given** a user with an active investment on the dashboard, **When** they scroll to the Trading Report section, **Then** they see a summary card showing total trades (e.g., 12), trades won (e.g., 9), trades lost (e.g., 3), and net result (e.g., +8%).
2. **Given** any user with an active cycle, **When** viewing the Trading Report, **Then** the result percentage displayed is consistent with their active tier's promised return (e.g., a user on the 8% tier sees a result of +8%).
3. **Given** a user with no active investment, **When** they visit the investment page, **Then** the Trading Report section is hidden or shows a locked/placeholder state.

---

### User Story 4 — Admin Reviewing & Approving Deposit Requests (Priority: P1)

An admin user visits the admin investments panel and sees a list of all pending deposit requests. Each request shows the user's name, submitted amount, claimed tier, and the uploaded payment screenshot. The admin can view the screenshot in full, then approve or reject the request. On approval, the user's investment account is credited and their 7-day cycle starts immediately from that moment.

**Why this priority**: Without admin approval, no user can ever receive profits. This is the critical gate that unlocks the entire profit cycle for every user.

**Independent Test**: Can be tested by creating a test deposit request, logging in as admin, approving it, and verifying the user's Capital Balance is updated and a cycle start timestamp is recorded.

**Acceptance Scenarios**:

1. **Given** an admin on `/admin/investments`, **When** they view the page, **Then** they see two tabs — "Deposit Requests" and "Withdrawal Requests" — with the Deposit Requests tab active by default.
2. **Given** an admin on the Deposit Requests tab, **When** they view the list, **Then** they see a table of all deposit submissions with: user identity, submitted amount, inferred tier, submission date, and a thumbnail of the uploaded screenshot.
3. **Given** an admin reviewing a pending deposit request, **When** they click to view the full screenshot, **Then** the payment proof image opens in a lightbox or full-screen modal.
4. **Given** an admin clicking "Approve" on a valid deposit request, **When** the action is confirmed, **Then** the user's Capital Balance is updated, the cycle start timestamp is recorded as the current moment, the request moves to "Approved" status, and an in-app notification is created informing the user their investment is now active.
5. **Given** an admin clicking "Reject" on a fraudulent/invalid request, **When** they optionally provide a rejection reason, **Then** the request is moved to "Rejected" status, the user sees their request status updated as rejected on their dashboard, and an in-app notification is created informing the user of the rejection.
6. **Given** an admin on the Withdrawal Requests tab, **When** they view the list, **Then** they see all withdrawal requests with: user identity, requested amount, available balance at time of request, and request date.
7. **Given** an admin viewing the investments list on either tab, **When** they filter by status (Pending, Approved, Rejected), **Then** the table updates to show only the matching records.

---

### User Story 5 — Withdrawing Available Profits (Priority: P2)

A user with accumulated profit wants to withdraw their earnings. They navigate to the withdrawal section of the Investment dashboard, enter the amount they wish to withdraw (up to their "Available for Withdrawal" balance), and submit a withdrawal request. The platform processes this manually through admin review.

**Why this priority**: Withdrawals are the reward mechanism. Users must be able to access their profits to trust the system. However, withdrawal requests follow the same manual admin-review pattern as deposits.

**Independent Test**: Can be tested by seeding a user with an approved investment past one full cycle, submitting a withdrawal request for the earned profit, and verifying the request appears in the admin panel and the user's available balance is reduced by the requested amount (pending).

**Acceptance Scenarios**:

1. **Given** a user with $40 available for withdrawal, **When** they submit a withdrawal request for $40, **Then** their available balance shows $0 (pending) and a new withdrawal request appears in the admin queue.
2. **Given** a user with $40 available, **When** they try to withdraw $50, **Then** the system rejects the request with a message indicating the amount exceeds their available balance.
3. **Given** a user with $40 available, **When** they try to withdraw $5, **Then** the system rejects the request with a message indicating the minimum withdrawal amount is 10 USDT.
3. **Given** a user with $0 available for withdrawal, **When** they visit the withdrawal section, **Then** the withdrawal form is disabled with an explanation that profits are credited at the end of each 7-day cycle.
4. **Given** a withdrawal request is approved by admin, **When** the admin marks it as processed, **Then** the user's Total Earned Profit is reduced by the withdrawn amount and a record is added to their withdrawal history.

---

### Edge Cases

- **What happens when a user deposits mid-cycle after a previous rejection?** The new approval date becomes the new cycle start; prior rejected deposits leave no residual state.
- **What if the admin approves a deposit at exactly midnight or during a DST transition?** Cycle calculations must use UTC timestamps to avoid drift.
- **What if a user tries to withdraw more than once while the first withdrawal is still pending?** The system must reserve pending withdrawal amounts against available balance to prevent double-spending.
- **What happens if a user's account is deactivated while they have an active investment?** Capital remains locked; admin must manually handle edge case resolution.
- **What if a user uploads a screenshot that is not a valid image?** The system must reject non-image files and display an appropriate error before submission.
- **What if the deposit amount doesn't match any tier?** The tier is inferred from the submitted amount. Any amount below 100 is rejected. Amounts between tiers fall into the lower matching tier (e.g., $499 qualifies for the 5% tier).
- **When does an active investment stop accruing profit?** Never automatically — cycles continue indefinitely until admin or user explicitly requests closure and admin marks it Completed. A Completed investment no longer accrues profit, but any already-earned profit remains available for withdrawal.
- **What if a user tries to withdraw an amount below the minimum?** The system must reject the request before submission with a clear message: "Minimum withdrawal amount is 10 USDT."

---

## Requirements *(mandatory)*

### Functional Requirements

**Deposit Flow**
- **FR-001**: The system MUST display all 5 profit tiers and their corresponding percentage returns to users before initiating a deposit.
- **FR-002**: The system MUST display the platform's USDT wallet address (with a copy-to-clipboard action) as part of the deposit flow.
- **FR-003**: Users MUST be able to enter a deposit amount and upload a payment screenshot image to submit a deposit request.
- **FR-004**: The system MUST reject deposit submissions with an amount below 100.
- **FR-005**: The system MUST prevent a user from submitting a new deposit request if they already have one in "Pending" or "Active" status.
- **FR-006**: The system MUST store the payment screenshot securely and make it accessible only to authorized admins.

**Investment Dashboard**
- **FR-007**: The system MUST display the user's total locked Capital Balance on the investment dashboard.
- **FR-008**: The system MUST dynamically calculate and display Total Earned Profit based on the number of fully completed 7-day cycles since the deposit's admin-approval timestamp — without relying on scheduled background jobs.
- **FR-009**: The system MUST display the amount Available for Withdrawal, calculated as Total Earned Profit minus any pending or processed withdrawal amounts.
- **FR-010**: The system MUST display a visual 7-day countdown timer showing days, hours, and minutes remaining until the next profit credit event.
- **FR-011**: The system MUST display a Trading Report section for users with an active investment, showing trade count, win/loss count, and net result percentage.
- **FR-012**: The system MUST display an empty/onboarding state for users with no investment history.

**Admin Panel**
- **FR-013**: Admins MUST be able to view deposit and withdrawal requests on the `/admin/investments` page, organized via a tab/segmented-control toggling between "Deposit Requests" and "Withdrawal Requests". The Deposit Requests tab is the default active view.
- **FR-014**: Admins MUST be able to approve a pending deposit request, which simultaneously records a cycle-start timestamp and credits the user's Capital Balance.
- **FR-015**: Admins MUST be able to reject a deposit request with an optional reason.
- **FR-016**: Admins MUST be able to filter the request list (on either tab) by status: Pending, Approved, Rejected.
- **FR-022**: Admins MUST be able to view, approve, and reject withdrawal requests from the "Withdrawal Requests" tab on `/admin/investments`, with each row showing: user identity, requested amount, and request date.

**Profit & Withdrawal Logic**
- **FR-017**: Profit calculations MUST be based on the number of complete 7-day periods elapsed since the cycle start timestamp — no partial-cycle payouts. Each cycle's profit MUST be computed as `floor(capital × tier_percentage / 100, 2)` (floor-rounded to 2 decimal places). Cumulative profit is the sum of all completed cycle profits.
- **FR-018**: The system MUST prevent users from submitting a withdrawal request exceeding their Available for Withdrawal balance (accounting for pending withdrawals).
- **FR-019**: Withdrawal requests MUST be stored and processed through the same manual admin-review mechanism as deposits.
- **FR-020**: The system MUST create an in-app notification record for the affected user whenever an admin approves or rejects their deposit request. The notification must be visible via the platform's existing notification system on the user's next interaction with the app.
- **FR-021**: The system MUST reject any withdrawal request where the requested amount is less than 10 USDT, displaying a clear message to the user stating the minimum withdrawal amount.

### Key Entities

- **Investment**: Represents a user's locked capital deposit. Attributes: user reference, deposit amount, inferred tier percentage, status (Pending / Active / Rejected / Completed), cycle start timestamp (set on admin approval), payment screenshot reference. Status transitions: Pending → Active (on admin approval) or Pending → Rejected (on admin rejection). Active → Completed only via explicit admin or user closure request — there is no automatic termination based on time or cycle count.
- **Profit Tier**: A static configuration mapping deposit amount ranges to profit percentages. Not stored per-user; used at calculation time.
- **Withdrawal Request**: Represents a user's request to withdraw earned profit. Attributes: user reference, investment reference, requested amount, status (Pending / Approved / Rejected), request timestamp.
- **Trading Report**: Platform-level summary data for the current cycle. Attributes: total trades, trades won, trades lost, net result percentage. May be static/dummy data for the initial release.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can complete the entire deposit submission flow (from landing on the investment page to receiving a "pending review" confirmation) in under 3 minutes.
- **SC-002**: An admin can review, inspect the screenshot, and approve or reject a pending deposit request in under 60 seconds.
- **SC-003**: The investment dashboard correctly displays earned profit for 100% of test cases across all 5 tiers and multiple completed cycles, using floor-rounding to 2 decimal places, with zero discrepancy from the expected `floor(capital × tier% / 100, 2) × completed_cycles` formula.
- **SC-004**: The 7-day countdown timer is accurate to within 1 minute of the true remaining cycle duration at any point in time.
- **SC-005**: The system correctly prevents withdrawal amounts exceeding the available balance in 100% of tested scenarios, including concurrent attempts.
- **SC-006**: All deposit screenshots are accessible only to authenticated admins — no public URL exposure.
- **SC-007**: Users with no investment history see a clear onboarding call-to-action rather than an empty or broken dashboard.

---

## Assumptions

- Users are already authenticated via the platform's existing authentication system; this feature does not introduce new auth mechanisms.
- All monetary values are denominated in USDT (USD Tether). Currency conversion is out of scope.
- The profit percentages and tier thresholds defined in the feature description are fixed for this release and not admin-configurable via UI (they are hardcoded configuration values).
- The "Trading Report" data (trades won/lost, net result) is static/dummy data for the initial release. A live data integration is explicitly out of scope.
- A user can only have one active investment at a time. Multiple concurrent investments per user are out of scope for this release.
- Capital is permanently locked and can never be withdrawn — only profits generated by the capital can be withdrawn.
- Profit cycles are non-overlapping and non-compounding: the profit is calculated on the original locked capital only, not on accumulated profits.
- The admin wallet USDT address is a single, platform-wide address managed outside this feature's configuration UI (stored in platform settings or environment configuration).
- Mobile-first, RTL (Arabic) layout is required, consistent with the rest of the Teamo platform design system.
- Withdrawal requests follow the same manual admin-review pattern already established by the platform's wallet/deposit flows; no new automated payout integration is required.
