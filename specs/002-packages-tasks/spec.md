# Feature Specification: Packages & Daily Tasks

**Feature Branch**: `002-packages-tasks`
**Created**: 2026-04-02
**Status**: Draft
**Input**: User description: "Build the Packages & Daily Tasks module for our manual MLM platform."

---

## Clarifications

### Session 2026-04-02

- Q: Can a user have more than one simultaneously active package subscription at the same time? → A: No — exactly one active package at a time. Admin activation of a new package replaces the previous active package on the user's profile.
- Q: How are tasks assigned to package tiers — shared pool or exclusive per tier? → A: Shared global task pool; the package tier determines only the daily **quantity** of tasks the user receives, not which specific tasks.
- Q: After an admin rejects a package purchase request, can the user immediately re-submit? → A: Yes — a rejected request is treated as closed; the user may submit a new request for any package immediately.
- Q: Where does a task's reward amount come from? → A: Derived from the user's active package at submission time — each task pays `daily_profit ÷ daily_task_count`. No per-task reward_amount is stored on the tasks table.
- Q: When a user's package is replaced mid-day by admin, how is today's task list recalculated? → A: Next-day effect only — today's task list and task count remain unchanged; the new package's `daily_task_count` and `daily_profit` apply starting the next calendar day.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Browse & Purchase a Subscription Package (Priority: P1)

A logged-in user navigates to the Packages view (الباقات) and sees the 6 available subscription tiers displayed in a premium grid. Each package card clearly shows the package name, price, daily task count, daily profit, and subscription duration. A lock icon communicates the 1-year deposit lock rule. When the user presses the "اشتراك" (Subscribe) button on a package, a modal appears with the admin's payment instructions (wallet address / Vodafone Cash number) and a receipt upload zone. The user transfers funds externally, uploads a screenshot of the transfer receipt (صورة التحويل), and submits. The system creates a **pending** package subscription request for admin review. No package is activated until an admin approves the request.

**Why this priority**: Without packages, users cannot earn — packages are the financial foundation of the entire platform. The purchase flow is the highest-value user action and the primary revenue event.

**Independent Test**: Can be fully tested by navigating to `/packages`, verifying all 6 package cards render with correct data, tapping "اشتراك" on any package, uploading a receipt image, and submitting — then verifying a pending subscription record exists in the database, without any admin approval or financial changes taking place.

**Acceptance Scenarios**:

1. **Given** a logged-in user with no active package, **When** they visit the Packages page, **Then** they see 6 package cards in a responsive grid, each displaying the package name, price, daily profit, daily task count, and a lock icon with the 1-year deposit rule, with no package marked as their "current" package.
2. **Given** a logged-in user viewing the Packages page, **When** they have an active subscription, **Then** their current package card is visually highlighted (e.g., a distinct emerald border or "باقتي الحالية" label), and the subscribe button is replaced with an indicator showing it is already active.
3. **Given** a logged-in user who clicks "اشتراك" on any package card, **When** the modal opens, **Then** they see the admin's payment wallet details, the package price clearly labeled, and a file upload zone for the transfer receipt — and nothing is submitted yet.
4. **Given** a user in the purchase modal who has NOT uploaded a receipt, **When** they attempt to submit, **Then** submission is blocked and an Arabic validation message is shown: "يرجى رفع صورة التحويل أولاً".
5. **Given** a user in the purchase modal who has uploaded a valid receipt image, **When** they submit the form, **Then** a pending subscription request is created with status `pending`, the receipt file is stored securely, the modal closes, and the user sees a success message: "تم إرسال طلبك بنجاح، في انتظار موافقة الإدارة".
6. **Given** a submitted purchase request, **When** admin has NOT yet reviewed it, **Then** the user's package status remains "غير مفعّل" and their wallet balance is not modified.

---

### User Story 2 — View and Complete Daily Tasks (Priority: P2)

A logged-in user with an active subscription navigates to the Daily Tasks view (المهام اليومية) and sees a list of today's available tasks assigned to their package tier. Each task entry shows the task type (e.g., "أعجب بفيديو يوتيوب"), the reward amount (e.g., +$0.50), and a "تنفيذ" (Execute) button. Clicking the button opens a bottom-sheet modal with the task link (which opens the target platform) and a screenshot upload zone. The user completes the external action, takes a screenshot, uploads it as proof (صورة الإثبات), and submits. The system creates a **pending** task completion log for admin review. No reward is credited until admin approval.

**Why this priority**: Daily tasks are the core earning mechanic for active users. After package activation (US1), this is the primary driver of daily engagement and platform retention.

**Independent Test**: Can be fully tested by logging in with an account that has an active package (seeded in DB), navigating to `/tasks`, verifying today's tasks are listed, clicking "تنفيذ", uploading a proof screenshot, and submitting — then verifying a pending task log record exists in the database, without any balance change.

**Acceptance Scenarios**:

1. **Given** a logged-in user with an active subscription, **When** they visit the Daily Tasks page, **Then** they see a list of today's tasks for their package tier, each showing the task type, platform icon or label, and reward amount.
2. **Given** a logged-in user with an active subscription who has already completed a task today, **When** they view the task list, **Then** that task is shown with a "مكتملة" (Completed) indicator and the "تنفيذ" button is disabled or hidden.
3. **Given** a logged-in user without an active package, **When** they visit the Daily Tasks page, **Then** they see an empty state message: "يجب الاشتراك في باقة للوصول إلى المهام اليومية" with a link to the Packages page.
4. **Given** a logged-in user who clicks "تنفيذ" on an available task, **When** the task modal opens, **Then** they see the task's external link as a large, tappable button and a file upload zone for the proof screenshot.
5. **Given** a user in the task modal who clicks the external link, **When** the link is activated, **Then** it opens in a new tab/browser window without navigating away from the platform.
6. **Given** a user in the task modal who has NOT uploaded a proof screenshot, **When** they attempt to submit, **Then** submission is blocked and an Arabic validation message is shown: "يرجى رفع صورة الإثبات أولاً".
7. **Given** a user in the task modal who has uploaded a valid proof screenshot, **When** they submit the form, **Then** a pending task completion log is created with status `pending`, the proof file is stored securely, the modal closes, and the task is marked as completed in today's task list — with an Arabic confirmation: "تم إرسال الإثبات، في انتظار موافقة الإدارة".
8. **Given** a submitted task proof, **When** admin has NOT yet approved it, **Then** the user's wallet balance is not modified and the task reward remains pending.

---

### User Story 3 — View Subscription & Task History (Priority: P3)

A logged-in user can navigate to a "طلباتي" (My Requests) tab or section to review all their submitted package purchase requests and task completion logs, each showing its current status: pending (قيد المراجعة), approved (تم القبول), or rejected (مرفوض). Rejected submissions display a reason if provided by the admin.

**Why this priority**: Transparency on request status builds user trust and reduces admin support load. It is not required for the core earning flow but is important for user confidence on a financial platform.

**Independent Test**: Can be fully tested by submitting at least one package request and one task proof, then navigating to the history view and verifying both records appear with their correct pending status.

**Acceptance Scenarios**:

1. **Given** a logged-in user who has submitted at least one package purchase request, **When** they view their request history, **Then** they see each request with the package name, submission date, amount paid, and current status badge (pending / approved / rejected).
2. **Given** a logged-in user who has submitted at least one task completion log, **When** they view their task history, **Then** they see each entry with the task name, reward amount, submission date, and status badge.
3. **Given** an admin has rejected a package request with a reason, **When** the user views that request in their history, **Then** the rejection reason is displayed beneath the status badge in Arabic.
4. **Given** a user with no submitted requests, **When** they view the history, **Then** they see an empty state illustration with a friendly Arabic prompt to browse packages.

---

### Edge Cases

- What happens if a user uploads a file that is not an image (e.g., a PDF or video)? The system must reject the upload with an Arabic error: "يرجى رفع صورة فقط (JPEG أو PNG)".
- What happens if the uploaded image exceeds the maximum file size? The system must reject it with an Arabic error specifying the limit: "حجم الصورة يجب أن لا يتجاوز 5 ميغابايت".
- What happens if a user tries to purchase a package while a pending purchase request already exists for that same package? The system must block the duplicate submission and inform the user: "لديك طلب قيد المراجعة لهذه الباقة".
- What happens if a user attempts to complete a task that does not belong to their active package tier? The system must not display that task in their list (server-side filtering by package tier).
- What happens if a user's active subscription expires or is rejected after tasks are submitted but before admin review? The pending task logs remain in the database for admin to adjudicate — they are not automatically rejected.
- What happens if the admin's payment wallet information has not been configured yet? The purchase modal must show a clear Arabic message: "معلومات الدفع غير متوفرة حالياً، يرجى التواصل مع الدعم" instead of empty fields.
- What happens if the daily task list is empty for a given tier (no tasks configured by admin)? The user sees an empty state: "لا توجد مهام متاحة اليوم، يرجى العودة لاحقاً".
- What happens if a user attempts to resubmit proof for a task already in pending or approved state? The "تنفيذ" button must be disabled or hidden, preventing double submission.
- What happens after an admin rejects a package purchase request? The request status is set to `rejected` and is no longer treated as an active lock. The user may immediately submit a new purchase request for any package tier. The rejection reason is displayed in their request history.
- What happens if an admin approves a new package for a user who already had an active package mid-day? The package replacement takes effect at the **start of the next calendar day**. Today's task list continues to use the previous package's `daily_task_count` and per-task reward calculation. `reward_amount_snapshot` values already stored in `task_completion_logs` for today are not altered.

---

## Requirements *(mandatory)*

### Functional Requirements

**Packages View**

- **FR-001**: The Packages page MUST display all 6 available subscription tiers in a responsive grid (1 column on mobile, 3 columns on desktop).
- **FR-002**: Each package card MUST display: Package Name (Arabic), Price (USD, formatted as `$X.XX`), Daily Task Count, Daily Profit (USD/day), and Total ROI or lock duration indicator.
- **FR-003**: Each package card MUST display a lock icon (🔒) with the label "إيداع لمدة سنة" (1-year deposit lock) to communicate the capital lock-in rule.
- **FR-004**: The user's currently active package (if any) MUST be visually distinguished from unsubscribed packages using an emerald highlight or "باقتي الحالية" badge — this state is determined by the admin-approved subscription record on the user's profile.
- **FR-005**: Each package card MUST include a call-to-action button: "اشتراك" for packages the user is not subscribed to, or a disabled "نشطة" indicator for the current active package. A user holds exactly one active package at a time — admin approval of a new package replaces the previous active package on the user profile.
- **FR-006**: The 6 package tiers MUST be stored in the database and configurable by admins. The frontend MUST read package data from the database, not hardcoded values.

**Manual Purchase Flow**

- **FR-007**: Clicking the "اشتراك" button on a package card MUST open a modal displaying the admin-configured payment instructions (method label, wallet address/number).
- **FR-008**: The purchase modal MUST clearly display the selected package name and the exact USD amount to be transferred.
- **FR-009**: The purchase modal MUST include a file upload zone accepting JPEG and PNG images only, with a maximum file size of 5 MB, for the transfer receipt (صورة التحويل).
- **FR-010**: The receipt image MUST be uploaded to a private Supabase Storage bucket before the purchase request record is persisted in the database.
- **FR-011**: Submission of the purchase form MUST create a record in the `package_subscription_requests` table with `status = 'pending'`, linking the user ID, package ID, receipt storage URL, and submission timestamp.
- **FR-012**: A user MUST NOT be able to submit a new purchase request while they already have a `pending` request for **any** package tier. Only `pending` status constitutes a lock — `rejected` requests are treated as closed and do NOT block re-submission. The system MUST block duplicate-pending submissions and display: "لديك طلب اشتراك قيد المراجعة بالفعل".
- **FR-013**: Upon successful submission, the modal MUST close and display a transient success notification: "تم إرسال طلبك بنجاح، في انتظار موافقة الإدارة".
- **FR-014**: The user's `current_package_level` and `wallet_balance` in `public.users` MUST NOT be modified during the purchase submission flow. All changes to those fields are exclusively admin-controlled.

**Daily Tasks View**

- **FR-015**: The Daily Tasks page MUST display a quantity-limited selection of tasks from the global task pool, where the number of tasks shown equals the `daily_task_count` value of the user's active package tier. Task selection is server-side and deterministic for a given day (e.g., ordered by `display_order ASC`, limited to `daily_task_count`). Tasks are NOT filtered by tier content — all tiers draw from the same pool of active tasks.
- **FR-016**: Users without an active (admin-approved) package MUST see the Daily Tasks page in an empty state with a link to the Packages page, and MUST NOT see any tasks.
- **FR-017**: Each task entry in the list MUST display: Task title (Arabic), target platform label (e.g., YouTube, TikTok, Instagram), the calculated reward per task (`daily_profit ÷ daily_task_count` for the user's active package, formatted as `+$X.XX`), and a status indicator (available / completed today). The reward is computed server-side from the user's active package — it is not stored on the task record.
- **FR-018**: A task that the user has already submitted a proof for today (regardless of approval status) MUST be displayed as "مكتملة" with a disabled action button — preventing double submission.
- **FR-019**: The task list MUST be scoped to the current calendar day (server timezone). Tasks reset daily — prior day completions do not carry forward. The `daily_task_count` from the user's active package determines how many tasks appear on any given day. If admin replaces a user's active package mid-day, the new package's task count and per-task reward apply starting the **next calendar day** — today's task list and reward calculation continue using the package that was active at the start of the day (midnight).

**Task Execution Flow**

- **FR-020**: Clicking "تنفيذ" on an available task MUST open a modal (bottom-sheet animation on mobile) showing: the task instruction in Arabic, the external target link as a large tappable button, and a proof screenshot upload zone.
- **FR-021**: The external task link MUST open in a new tab/window, preserving the user's position in the platform.
- **FR-022**: The proof upload zone MUST accept JPEG and PNG images only, with a 5 MB maximum file size. Dashed border styling with Arabic upload instruction label.
- **FR-023**: The proof image MUST be uploaded to a private Supabase Storage bucket before the task log record is persisted.
- **FR-024**: Submission of the task proof form MUST create a record in the `task_completion_logs` table with `status = 'pending'`, linking the user ID, task ID, proof storage URL, completion date, and a `reward_amount_snapshot` computed at submission time as `active_package.daily_profit ÷ active_package.daily_task_count` (rounded to 4 decimal places). Snapshotting the reward at submission guards against future package changes affecting historical logs.
- **FR-025**: Upon successful task proof submission, the modal MUST close, the task tile in the list MUST immediately update to "مكتملة" state (optimistic or post-submission update), and a transient confirmation message MUST appear in Arabic.
- **FR-026**: The user's `wallet_balance` MUST NOT be modified upon task proof submission. Balance updates are exclusively admin-controlled after approval.

**Admin Payment Settings (Read-Only from User Perspective)**

- **FR-027**: The platform MUST have an `admin_settings` table (or equivalent) where admins can store payment method information. The purchase modal reads this data and displays it to the user — the user cannot modify it.
- **FR-028**: If no payment method is configured, the purchase modal MUST display: "معلومات الدفع غير متوفرة حالياً، يرجى التواصل مع الدعم" instead of empty fields.

**UI & Accessibility**

- **FR-029**: All user-facing text, labels, error messages, status badges, and UI copy in this module MUST be in Arabic.
- **FR-030**: The entire module MUST be RTL-aligned. No directional CSS overrides may be used.
- **FR-031**: All interactive elements (buttons, upload zones, modals) MUST have Arabic ARIA labels.
- **FR-032**: Modals MUST be dismissible via a close button ("✕") and tapping/clicking the overlay backdrop.
- **FR-033**: File upload zones MUST display a dashed border, a centered upload icon, and an Arabic instruction label. On hover, the border color transitions to emerald. On file selection, the filename is shown as confirmation.

---

### Key Entities

- **Package** (`packages`): A subscription tier definition. Key attributes: unique ID, name (Arabic), price (USD), daily task count, daily profit (USD/day), ROI percentage or lock duration label, display order, active/inactive flag, created_at, updated_at.
- **AdminPaymentSetting** (`admin_settings`): Platform-level configuration row for payment instructions. Key attributes: payment method label (e.g., "Vodafone Cash"), payment address/number, active flag, created_at, updated_at.
- **PackageSubscriptionRequest** (`package_subscription_requests`): A user's purchase attempt awaiting admin review. Key attributes: ID, user_id (FK → public.users), package_id (FK → packages), receipt_url (Supabase Storage path), amount_paid (USD snapshot), status (`pending`/`approved`/`rejected`), rejection_reason (nullable), created_at, updated_at. **Constraint**: at most one `pending` or `approved` record per user may exist at any time (enforced via a partial unique index or application-level check). Admin approval of a new request triggers deactivation of any previously approved package on that user's profile.
- **Task** (`tasks`): A single actionable unit (e.g., "Like this YouTube video") drawn from a single shared global pool. Key attributes: ID, title (Arabic), platform label, external URL, display_order (INT — determines selection order when applying per-package quantity limits), active flag, created_at, updated_at. Tasks have **no reward_amount field** — the per-task reward is derived at runtime as `package.daily_profit ÷ package.daily_task_count`.
- **TaskCompletionLog** (`task_completion_logs`): A user's daily task proof submission. Key attributes: ID, user_id (FK → public.users), task_id (FK → tasks), proof_url (Supabase Storage path), reward_amount_snapshot (NUMERIC, USD — calculated as `daily_profit ÷ daily_task_count` at the moment of submission), completion_date (DATE — used for daily reset), status (`pending`/`approved`/`rejected`), rejection_reason (nullable), created_at, updated_at.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can browse all 6 package cards, open the purchase modal, upload a receipt, and submit a purchase request in under 3 minutes under normal network conditions.
- **SC-002**: 100% of submitted purchase requests and task proofs result in a `pending` record — zero automated balance mutations occur during any user-initiated action in this module.
- **SC-003**: A user with an active package can view today's task list, open the task modal, upload a proof, and submit in under 2 minutes per task.
- **SC-004**: Receipt and proof images are stored exclusively in a private storage bucket — zero files are publicly accessible by direct URL without a signed link.
- **SC-005**: Duplicate submission prevention is enforced: 100% of attempts to submit a second purchase request for a package already in `pending` state are rejected before any file upload or database write occurs.
- **SC-006**: File type and size validation errors are returned within 1 second of an invalid upload attempt, with a clear Arabic error message displayed without a page reload.
- **SC-007**: The Packages grid renders all 6 cards in under 3 seconds on a standard mobile connection.
- **SC-008**: All status changes to package subscription requests and task completion logs (by admin) are permanently recorded in the `financial_audit_log` table per the platform constitution.

---

## Assumptions

- The 6 package tiers (A1, A2, A3, B1, B2, B3) and their associated pricing, daily task counts, and daily profit values will be seeded into the `packages` table by the admin before this module is deployed. The frontend displays whatever is in the database — it does not hardcode any values.
- Each package tier has a fixed number of daily tasks. Tasks are pre-configured by the admin per package — the user cannot create or modify tasks.
- The "1-year deposit lock" means a user's principal investment is locked for 12 months and cannot be withdrawn during that period. The lock is communicated visually in the UI but is enforced by admin policy, not an automated system timer in this module.
- Payment is always manual (external transfer). The platform does not integrate with any payment gateway or automated payment processor. The user transfers funds out-of-band and provides a receipt as proof.
- The admin's payment method information (wallet address for Vodafone Cash or USDT) is stored in an `admin_settings` table and configured by the admin before the purchase flow is activated.
- Only one payment method is shown to users at a time (the currently active payment method configured by the admin). Multi-method display is out of scope for this module.
- Task content (title, external URL, platform) is managed entirely by the admin via a future Admin module. This spec covers the user-facing consumption of those tasks only.
- A "task reset" happens at midnight server time. Users who complete tasks on day N cannot re-complete them on day N, but tasks are available again on day N+1.
- The module depends on the `001-auth-profile` module: users must be authenticated, and the `public.users` table must already exist with the `current_package_level` and `wallet_balance` columns.
- Uploaded files (receipts and proofs) are stored in Supabase Storage private buckets. Signed short-lived URLs are used for admin review. Direct public access is forbidden (per the constitution).
- This module does not include the Admin review/approval interface — admin actions are handled in a separate `Admin` feature module. This spec covers only the user-facing submission flows.
- Currency is USD only, formatted as `$X.XX` per the platform standard.
- The platform is Arabic-only for all user-facing content. No i18n or language switcher is required.
