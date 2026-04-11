# Feature Specification: Wallet & Withdrawals (المحفظة والسحوبات)

**Feature Branch**: `006-wallet-withdrawals`
**Created**: 2026-04-06
**Status**: Draft
**Input**: User description: "Build the Wallet & Withdrawals module for the User Dashboard"

---

## Clarifications

### Session 2026-04-06

- Q: What happens to the withdrawal form after a successful submission? → A: Form fields clear, a success toast appears, and the page stays in place — the balance cards update automatically (no navigation away from the page).
- Q: Can a suspended user submit a withdrawal request? → A: No — suspended users are blocked from submitting. The server action rejects the request and the page shows an Arabic message explaining the account is suspended.
- Q: Does the withdrawal Amount field accept fractional cents, or is it limited to 2 decimal places? → A: Maximum 2 decimal places (e.g., $5.75 ✅ — $5.753 ❌), consistent with the platform’s existing NUMERIC(12,2) financial columns.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Wallet Overview at a Glance (Priority: P1)

A logged-in user opens the Wallet page and immediately sees their complete financial picture: their Available Balance (الرصيد المتاح — the funds they can withdraw right now), their Total Withdrawn (إجمالي المسحوبات — the cumulative amount they have successfully cashed out), and their Pending Withdrawals (السحوبات المعلقة — funds tied up in withdrawal requests awaiting admin approval). All three figures are displayed on premium balance cards in USD format (`$X.XX`), with the dollar sign rendered to the left of the number regardless of RTL layout.

**Why this priority**: The Wallet Overview is the first thing a user sees when they open the Wallet page. It must render correctly even before any withdrawal has ever been made. It is the data foundation on which all other stories depend — a user decides whether to withdraw by reading their available balance here.

**Independent Test**: Can be fully tested with a freshly created account (all values at $0.00) and a seeded account with a non-zero balance; verify all three cards render correct values, correct USD formatting, and correct RTL alignment without any withdrawal functionality being implemented.

**Acceptance Scenarios**:

1. **Given** a logged-in user with `wallet_balance = $25.50` and no prior withdrawals, **When** they open the Wallet page, **Then** the Available Balance card shows "$25.50", the Total Withdrawn card shows "$0.00", and the Pending Withdrawals card shows "$0.00".
2. **Given** a logged-in user who has one approved withdrawal of $10.00 and one pending withdrawal of $5.00, **When** they open the Wallet page, **Then** Total Withdrawn shows "$10.00" and Pending Withdrawals shows "$5.00".
3. **Given** a logged-in user on the Wallet page, **When** the page renders on a mobile device, **Then** all three balance cards are fully visible without horizontal scrolling, RTL-aligned, and the `$` symbol appears to the left of each number.

---

### User Story 2 — Submit a Withdrawal Request (Priority: P1)

A logged-in user with a positive Available Balance wants to convert their earnings into real money. They fill in the amount they wish to withdraw and provide their payment method details (e.g., a Vodafone Cash phone number or a USDT wallet address). On submission, the system immediately deducts the requested amount from their Available Balance (to prevent double-spending) and creates a "pending" withdrawal request for admin review. The user sees instant visual confirmation and the new request immediately appears in their Withdrawal History below with a "pending" status badge.

**Why this priority**: This is the core earning-redemption loop of the platform. Without it, users cannot access their earnings. The immediate balance deduction is a critical financial integrity control — it ensures the same funds cannot be withdrawn twice before an admin processes the first request.

**Independent Test**: Can be fully tested independently by submitting a valid withdrawal request and verifying: (1) the Available Balance decreases by the requested amount, (2) the Pending Withdrawals stat increases by the same amount, (3) a new row appears in the history table with status "pending", (4) submitting a second request for more than the new Available Balance is rejected.

**Acceptance Scenarios**:

1. **Given** a user with an Available Balance of $20.00, **When** they submit a withdrawal request for $15.00 with valid payment details, **Then** their Available Balance immediately updates to $5.00, the Pending Withdrawals stat shows $15.00, a new withdrawal request is created with status "pending", and a success confirmation ("تم إرسال طلب السحب بنجاح") appears.
2. **Given** a user with an Available Balance of $10.00, **When** they attempt to submit a withdrawal request for $15.00 (exceeding their balance), **Then** the form shows a validation error ("المبلغ المطلوب يتجاوز رصيدك المتاح") before any submission, and the balance is NOT modified.
3. **Given** a user with an Available Balance of $10.00, **When** they attempt to submit a withdrawal request for $0.00 or a negative amount, **Then** the form shows a validation error ("يجب أن يكون المبلغ أكبر من صفر") and no request is created.
4. **Given** a user with an Available Balance of $10.00, **When** they attempt to submit a withdrawal request with the payment details field empty, **Then** the form shows a validation error ("تفاصيل وسيلة الدفع مطلوبة") and no request is created.
5. **Given** a user with an Available Balance of $0.00, **When** they open the withdrawal form, **Then** the submit button is disabled and an inline message explains they have no available balance to withdraw.
6. **Given** a user who just submitted a valid withdrawal request, **When** they look at the Wallet page, **Then** the new request appears at the top of the Withdrawal History table with a "معلق" (Pending) status badge, the correct amount, payment details, and today's date.

---

### User Story 3 — Withdrawal History (Priority: P2)

A logged-in user wants to track all their past and pending withdrawal requests. The Withdrawal History table shows every request they have ever made, sorted newest-first, with the date, amount, payment details, and current status. Status values are color-coded: Pending (معلق) in amber, Approved (مقبول) in green, Rejected (مرفوض) in red. The history is the user's financial ledger for cash-outs — they can quickly tell which withdrawals have been paid and which are waiting.

**Why this priority**: Transparency and trust. Users can see their pending requests are in the queue and their approved requests confirm payment was made. This is important for user confidence but is a read-only view that depends on Story 2 to have data.

**Independent Test**: Can be fully tested independently by seeding a user with 3 withdrawal records at different statuses (pending, approved, rejected) and verifying the table renders all 3 records correctly with proper status badges, amounts, dates, and payment details.

**Acceptance Scenarios**:

1. **Given** a user with no withdrawal history, **When** they view the Withdrawal History section, **Then** an empty-state message is shown in Arabic: "لا توجد طلبات سحب حتى الآن".
2. **Given** a user with 3 withdrawal requests (one pending, one approved, one rejected), **When** they view the Withdrawal History, **Then** all 3 records are shown newest-first with correct status badges: amber "معلق", green "مقبول", red "مرفوض".
3. **Given** a user who has a rejected withdrawal, **When** they view the Withdrawal History, **Then** the rejection reason (if provided by admin) is visible on the rejected row.
4. **Given** a user with many withdrawal requests, **When** they view the Withdrawal History, **Then** all records are accessible without requiring pagination (scroll-based infinite content acceptable for MVP; pagination is a future enhancement).

---

### Edge Cases

- What happens if a user submits a withdrawal request while another pending request exists? Multiple concurrent pending requests are allowed — the balance deduction for each is applied immediately, so the constraint is the total Available Balance remaining non-negative after each deduction.
- What happens if the server-side balance check and deduction fail mid-transaction (e.g., database error)? The entire operation must be atomic — either the balance is deducted AND the request is created, or neither happens. A partial state (balance deducted but no request created, or vice versa) is never acceptable.
- What happens if a user's session expires while they have the withdrawal form open? On submission, the server rejects the request with an authorization error and the user is redirected to login.
- What happens if the user enters a very long payment details string (e.g., 1000 characters)? The system must enforce a maximum length of 200 characters on both client and server.
- What happens if two concurrent withdrawal submissions race against the same balance? The server-side deduction must use an atomic database operation (compare-and-decrement with a non-negative constraint) so that one request succeeds and the other is rejected with the "insufficient balance" error.
- What if an admin approves a withdrawal after it was already rejected (or vice versa)? The status of a request that has already been approved or rejected MUST NOT be changeable — this constraint is enforced by the Admin module and is relevant context here.
- What happens when a suspended user opens the Wallet page? The three balance cards MUST still render (read-only), but the withdrawal form MUST be replaced by a full-width banner: "حسابك موقوف. لا يمكنك تقديم طلبات سحب حتى يتم إعادة تفعيل حسابك." — the submit button must not be accessible.

---

## Requirements *(mandatory)*

### Functional Requirements

**Wallet Overview**

- **FR-001**: The Wallet page MUST display three balance cards: "Available Balance" (الرصيد المتاح), "Total Withdrawn" (إجمالي المسحوبات), and "Pending Withdrawals" (السحوبات المعلقة).
- **FR-002**: "Available Balance" MUST reflect the user's current `wallet_balance` column value from the database in real-time on page load.
- **FR-003**: "Total Withdrawn" MUST be computed as the sum of all `amount` values from the user's withdrawal requests with status `approved`.
- **FR-004**: "Pending Withdrawals" MUST be computed as the sum of all `amount` values from the user's withdrawal requests with status `pending`.
- **FR-005**: All monetary values MUST be displayed in USD format (`$X.XX`) with the `$` symbol rendered to the left of the numeric value, regardless of page RTL direction.

**Withdrawal Request**

- **FR-006**: The withdrawal form MUST contain exactly two fields: Amount (المبلغ) and Payment Method Details (تفاصيل وسيلة الدفع). Both are mandatory. The Amount field MUST restrict input to a maximum of 2 decimal places; values with more than 2 decimal places MUST be rejected client-side with the Arabic error: "المبلغ يجب أن يكون بحد أقصى خانتين عشريتين".
- **FR-007**: The system MUST validate client-side that the requested Amount is greater than zero AND does not exceed the user's current Available Balance. Failing validation MUST show an inline Arabic error without submitting to the server.
- **FR-008**: The system MUST re-validate server-side that the requested Amount does not exceed `wallet_balance` at the moment of processing, before any database mutation. If the balance is insufficient at the server check (e.g., due to a concurrent request), the submission MUST be rejected with the Arabic error: "رصيدك غير كافٍ لإتمام هذا الطلب".
- **FR-009**: A valid withdrawal submission MUST be processed as a single atomic operation that simultaneously: (a) decrements `wallet_balance` by the requested amount, and (b) inserts a new withdrawal request record with status `pending`. If either step fails, both steps MUST be rolled back.
- **FR-010**: The Payment Method Details field MUST accept free-text input (phone numbers, wallet addresses, etc.) with a maximum length of 200 characters, enforced on both client and server.
- **FR-011**: Upon successful submission: (a) all form fields MUST be cleared/reset to their empty default state, (b) a success toast MUST appear with the Arabic message "تم إرسال طلب السحب بنجاح" and auto-dismiss after 3 seconds, (c) the page MUST stay in place (no navigation), and (d) the three balance cards and the Withdrawal History table MUST refresh to reflect the new state without a full page reload.
- **FR-012**: If the user's Available Balance is $0.00, the withdrawal form submit button MUST be disabled and an Arabic message MUST explain: "لا يوجد رصيد متاح للسحب".
- **FR-013**: The minimum withdrawal amount MUST be $1.00. Amounts below this threshold MUST trigger the Arabic validation error: "الحد الأدنى للسحب هو $1.00".

**Withdrawal History**

- **FR-014**: The Withdrawal History section MUST display all of the authenticated user's withdrawal requests, sorted by creation date descending (newest first).
- **FR-015**: Each row in the Withdrawal History MUST show: Date (formatted in Arabic locale), Amount (USD format), Payment Method Details (truncated gracefully if too long), and Status badge.
- **FR-016**: The status display MUST use Arabic labels and color coding: "معلق" (amber), "مقبول" (green), "مرفوض" (red).
- **FR-017**: If an admin has provided a rejection reason for a rejected request, that reason MUST be visible on the corresponding row.
- **FR-018**: When the user has no withdrawal history, the section MUST display an empty-state message: "لا توجد طلبات سحب حتى الآن".

**Security & Data Integrity**

- **FR-019**: All withdrawal-related data operations MUST only return or modify records belonging to the currently authenticated user. Users MUST NOT be able to view or submit on behalf of other users.
- **FR-020**: The server MUST reject any withdrawal submission from an unauthenticated request. If the session has expired, the user MUST be redirected to the login page.
- **FR-026**: The server action MUST verify the authenticated user's `status` is `active` before processing any withdrawal submission. If `status = 'suspended'`, the submission MUST be rejected with the Arabic error: "حسابك موقوف. لا يمكنك تقديم طلبات سحب." The Wallet page MUST detect the suspended status on load and replace the withdrawal form with a suspension notice banner, making the submit button inaccessible.
- **FR-021**: The `wallet_balance` column MUST be constrained at the database level to be non-negative (`wallet_balance >= 0`). Any decrement that would result in a negative balance MUST fail at the database constraint level as a last-resort safety net (beyond the server-side check in FR-008).

**UI**

- **FR-022**: All text, labels, error messages, and UI copy MUST be in Arabic.
- **FR-023**: The entire page MUST be RTL-aligned (`dir="rtl"`). No directional utility classes (left/right) may override core RTL layout.
- **FR-024**: Balance cards MUST follow the established design constitution: `bg-white rounded-2xl`, soft shadow `shadow-[0_2px_10px_rgba(0,0,0,0.02)]`, no heavy borders on content cards.
- **FR-025**: Interactive form elements (inputs, submit button) MUST follow the established design constitution: `border border-slate-200 rounded-xl`, focus ring `focus:ring-2 focus:ring-emerald-500/20`, primary button `bg-slate-900`.

### Key Entities

- **Withdrawal Request**: Represents a single cash-out request submitted by a user. Key attributes: unique ID, user ID (FK → users), amount (USD, `NUMERIC(12,2)`, positive, ≥ $1.00, max 2 decimal places), payment method details (free text, max 200 chars), status (`pending` | `approved` | `rejected`), rejection reason (nullable text, populated by admin on reject), created at, updated at.
- **User (existing entity)**: `wallet_balance` is decremented on withdrawal submission and may be incremented on admin rejection (if platform policy requires refund on reject — see Assumptions).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can submit a withdrawal request in under 60 seconds from opening the Wallet page to seeing the success confirmation.
- **SC-002**: After a valid withdrawal submission, the Available Balance card on the Wallet page reflects the deducted amount within 1 second of the confirmation appearing (no manual page refresh required).
- **SC-003**: 100% of withdrawal submissions where the requested amount exceeds the current balance MUST be rejected — no request is ever created or balance deducted in this case.
- **SC-004**: The server-side atomicity guarantee means 0% occurrence of a "phantom deduction" state (balance decremented but no withdrawal record created), even under concurrent load.
- **SC-005**: The Withdrawal History table renders all records for a user with up to 100 historical withdrawals without visible layout degradation or performance issues.
- **SC-006**: All monetary values displayed on the Wallet page are formatted to exactly 2 decimal places in 100% of renders.
- **SC-007**: The Wallet page loads and displays all three balance cards in under 3 seconds on a standard mobile connection.

---

## Assumptions

- **Balance refund on admin rejection**: When an admin rejects a withdrawal request, the platform's policy is to **refund the withheld amount back to the user's `wallet_balance`**. This refund is performed by the Admin module's `admin_reject_withdrawal` RPC function. This spec covers only the user-facing submission; the refund is handled server-side by admin actions (separate module).
- **Payment method is free-text**: The platform does not validate the format of Vodafone Cash numbers or USDT addresses server-side. The payment details field is free-text, and the admin manually processes the payment based on the provided info.
- **No withdrawal cancellation by user**: Once a withdrawal request is submitted, the user cannot cancel it. Only an admin can reject it (which triggers a refund, per the assumption above). This keeps the financial flow predictable and prevents abuse.
- **No minimum withdrawal fee**: The platform does not deduct any processing fee from withdrawal amounts. The user receives exactly the amount they request ($1.00 minimum).
- **Pagination is a future enhancement**: For MVP, all withdrawal history records are shown in a single scrollable list. Pagination will be added when record counts grow to a level that impacts performance.
- **Single ledger currency**: USD is the only currency, consistent with the established platform constitution (see spec 001-auth-profile). No currency conversion is needed.
- **Data freshness**: The Wallet page is a server-rendered page (RSC). Data is fetched fresh on every page load/navigation. No real-time subscriptions or auto-refresh mechanisms are required for MVP.
- **`wallet_balance` non-negative DB constraint already exists**: The `public.users` migration already enforces `wallet_balance >= 0` as a DB-level constraint. This spec relies on that existing constraint as the final safety net.
- **New DB table required**: A `withdrawal_requests` table does not yet exist in the schema. A new migration must be created as part of this feature.
