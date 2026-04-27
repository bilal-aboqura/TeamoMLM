# Feature Specification: Apps Offerwall & Tasks System

**Feature Branch**: `012-offerwall-tasks-system`  
**Created**: 2026-04-25  
**Status**: Draft  
**Input**: User description: "Build the 'Apps Offerwall & Tasks System' module. The goal is to allow admins to create tasks (e.g., download an app, leave a review), and users can complete them by uploading a screenshot as proof to earn a USDT reward."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - User Discovers and Completes a Task (Priority: P1)

A registered user visits the Offerwall page and sees a grid of available tasks (e.g., "Download App X and leave a review"). The user taps a task card, reads the step-by-step instructions, uploads a screenshot as proof of completion, and submits. The task card immediately transitions to "Pending Review" so the user knows their submission is awaiting approval.

**Why this priority**: This is the core revenue-generating flow for users. Without the ability to submit tasks, the entire module delivers no value.

**Independent Test**: Can be fully tested by creating a task in the admin panel and then completing it as a regular user — the submission appears in the admin review queue and the task card shows "Pending Review."

**Acceptance Scenarios**:

1. **Given** an active task exists and a user has no prior submission for it, **When** the user opens the task detail and uploads a valid screenshot, **Then** a submission record is created with status "Pending Review" and the task card shows the "Pending Review" badge.
2. **Given** a user already has a pending submission for a task, **When** the user revisits the Offerwall, **Then** the task card shows "Pending Review" and the submit action is disabled/hidden.
3. **Given** a user has an approved submission for a task, **When** the user revisits the Offerwall, **Then** the task card shows "Completed" and no further submission is possible.
4. **Given** no tasks are currently active, **When** a user visits the Offerwall, **Then** an empty state message is displayed (e.g., "لا توجد مهام متاحة حالياً").

---

### User Story 2 - Admin Creates and Manages Tasks (Priority: P2)

An admin navigates to the Task Management page (`/admin/tasks`) and creates a new task by filling in a title, a detailed description of what the user must do, and a USDT reward amount. The admin can also edit existing tasks (to update instructions or reward) or disable a task so it no longer appears on the user Offerwall.

**Why this priority**: Admins must be able to populate the Offerwall before users can earn. This is a prerequisite for P1, but exists as a standalone admin workflow with independent value.

**Independent Test**: Can be fully tested by logging in as an admin, creating a task, verifying it appears in the task list with the correct details, then disabling it and verifying it disappears from the Offerwall.

**Acceptance Scenarios**:

1. **Given** the admin is on the Task Management page, **When** the admin fills in Title, Description, and Reward Amount and saves, **Then** the new task appears in the task list and is immediately visible on the user Offerwall.
2. **Given** an existing active task, **When** the admin edits its reward amount and saves, **Then** the task card on the Offerwall reflects the updated reward.
3. **Given** an active task with no pending submissions, **When** the admin disables the task, **Then** the task no longer appears on the user Offerwall.
4. **Given** a task with pending submissions, **When** the admin disables the task, **Then** existing pending submissions remain reviewable; the task just stops accepting new ones.
5. **Given** the admin submits the creation form with a missing required field (e.g., no reward amount), **Then** a validation error is shown and no task is created.

---

### User Story 3 - Admin Reviews Submissions and Approves/Rejects (Priority: P3)

An admin navigates to the Submissions Review page (`/admin/task-submissions`) and sees a list of all pending user submissions with the screenshot proof. The admin can view the uploaded screenshot, then approve or reject the submission with an optional rejection note. On approval, the USDT reward is credited to the user's wallet balance automatically.

**Why this priority**: Without review, users cannot receive rewards; this closes the earning loop.

**Independent Test**: Can be fully tested by submitting a task as a user, then logging in as an admin, reviewing the submission, approving it, and verifying the user's wallet balance has increased by the task's reward amount.

**Acceptance Scenarios**:

1. **Given** a pending submission exists, **When** the admin clicks "Approve," **Then** the submission status changes to "Approved," the user's wallet balance increases by the task reward amount, and the submission is removed from the pending queue.
2. **Given** a pending submission exists, **When** the admin clicks "Reject" (with or without a note), **Then** the submission status changes to "Rejected" and the user's wallet is not credited. The task card for that user reverts to "Available" so they may resubmit.
3. **Given** a submission is already approved, **When** an admin revisits the review page, **Then** the action buttons are disabled/hidden for that submission.
4. **Given** multiple submissions are pending, **When** the admin filters by task name, **Then** only submissions for that task are displayed.

---

### Edge Cases

- What happens when a user uploads a file that is not an image (e.g., a PDF or video)? The system must reject non-image uploads with a clear error message.
- What happens when the uploaded screenshot file exceeds the maximum allowed size? The user sees a file-size error before submission.
- What happens if an admin approves the same submission twice (e.g., race condition via double-click)? The reward must only be credited once; the system must be idempotent on approval.
- What happens when a task is disabled after a user has already submitted but before admin reviews? The submission remains reviewable and the admin can still approve it.
- What happens if the wallet credit operation fails during admin approval? The entire approval is rolled back atomically — the submission remains in Pending status and the admin sees a descriptive error message. No partial state (e.g., Approved without credit) is persisted.
- What if a user's account is suspended at the time of approval? Reward crediting should still proceed (or the admin sees a warning — resolved by assumption below).
- What happens when a user reaches the 3-rejection limit for a task? The task card transitions permanently to "Locked" status for that user. The upload form is hidden and no further submissions are accepted. The admin review page continues to show previously submitted (and rejected) entries for audit purposes.

## Requirements *(mandatory)*

### Functional Requirements

**Task Management (Admin)**

- **FR-001**: Admins MUST be able to create a task with the following required fields: Title (text), Description (rich text or plain text instructions), Reward Amount (positive USDT value), and External Action URL (a valid URL pointing to the app store listing, website, or target action the user must visit).
- **FR-002**: Admins MUST be able to edit any existing task's Title, Description, Reward Amount, and External Action URL.
- **FR-003**: Admins MUST be able to enable or disable a task. Disabled tasks MUST NOT appear on the user Offerwall.
- **FR-004**: The Task Management page MUST list all tasks (both enabled and disabled) with their current status, reward amount, and total submission count.
- **FR-005**: The system MUST validate that Reward Amount is a positive numeric value before saving a task.

**Offerwall (User)**

- **FR-006**: The Offerwall page MUST display all currently enabled tasks as a grid of cards.
- **FR-007**: Each task card MUST clearly display the task title, reward amount, and the user's personal status for that task: Available, Pending Review, Completed, or Locked (maximum attempts reached).
- **FR-008**: Users MUST be able to tap a task card to open a detail view (modal or page) showing full instructions and a clearly labelled, tappable "Go to Task" button that opens the task's External Action URL.
- **FR-009**: In the task detail view, users MUST be able to upload a single screenshot image file as proof of completion.
- **FR-010**: The system MUST prevent a user from submitting a task if they already have a Pending or Approved submission for that same task, or if they have reached the maximum submission attempt limit (3 rejections). The upload form MUST be hidden or disabled in those states.
- **FR-011**: Accepted screenshot formats MUST include JPEG, PNG, and WebP. Maximum file size MUST be 10 MB.

**Submission Review (Admin)**

- **FR-012**: Admins MUST be able to view all task submissions, filterable by status (Pending, Approved, Rejected) and by task.
- **FR-013**: Admins MUST be able to view the uploaded screenshot for each submission directly within the review interface.
- **FR-014**: Admins MUST be able to approve a pending submission. On approval, the system MUST atomically credit the task's reward amount to the user's wallet balance. If the credit operation fails for any reason, the entire approval MUST be rolled back — the submission remains in Pending status and the admin MUST be shown a clear error message indicating the failure so they can retry.
- **FR-015**: Admins MUST be able to reject a pending submission, with an optional free-text rejection reason.
- **FR-016**: When a submission is rejected, the user MAY make a new submission for the same task (the task reverts to "Available" for that user), provided they have not yet reached the 3-submission attempt limit for that task.
- **FR-021**: A user who has had 3 submissions for the same task rejected MUST be permanently locked from resubmitting that task. The task card MUST display a "Locked" status. The total rejected submission count MUST be tracked per user per task to enforce this limit.
- **FR-017**: The reward crediting operation MUST be idempotent — approving an already-approved submission MUST NOT credit the reward a second time.

**Balance Integration**

- **FR-018**: Approved task rewards MUST be credited to the user's existing general wallet balance (the same balance used across the platform for withdrawals and other operations).
- **FR-019**: A record of each reward credit MUST be created in the transaction/history log so users can view it in their transaction history. Each entry MUST display: the credited USDT amount, the title of the completed task as the source label, and a "Credited" status indicator — e.g., "+0.50 USDT · Download App X · Credited".

**Security & Storage**

- **FR-020**: Uploaded screenshot files MUST be stored privately (not publicly accessible). When an admin needs to view a screenshot during review, the system MUST generate a short-lived, signed URL valid for a limited time window (e.g., 15 minutes). The file itself MUST NOT be retrievable without a valid signed token.

### Key Entities

- **Task**: Represents a single completable action (e.g., "Download App X"). Attributes: title, description, external action URL (required; the link users must visit to complete the task), reward amount (USDT), enabled/disabled status, creation date, last-updated date.
- **Task Submission**: Represents a user's attempt to complete a task. Attributes: reference to task, reference to user, screenshot proof (file reference), status (Pending / Approved / Rejected), rejection reason (optional), submission date, review date.
- **Wallet Transaction**: A record of a balance change. When a submission is approved, a transaction of type "task_reward" is created, linking to the submission and crediting the reward to the user's balance. The transaction record MUST store: credited amount (USDT), source task title, transaction type ("task_reward"), status ("Credited"), and timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can discover, submit, and receive confirmation of a completed task submission in under 2 minutes from landing on the Offerwall page.
- **SC-002**: Admins can review and action (approve or reject) a pending submission in under 30 seconds from opening the submission review page.
- **SC-003**: A user's wallet balance is updated within 5 seconds of an admin approving a submission, with no manual intervention required.
- **SC-004**: 100% of approved submissions result in exactly one reward credit — double-crediting must never occur.
- **SC-005**: Task cards correctly reflect each user's personal submission status (Available / Pending / Completed) with no incorrect state shown.
- **SC-006**: The system correctly prevents re-submission for tasks with Pending or Approved status 100% of the time.

## Assumptions

- Users are already authenticated; no new authentication flow is required for this feature.
- A general user wallet balance already exists on the platform and supports programmatic credits; this feature will integrate with that existing balance system.
- Wallet transaction history already has a record structure that can accept a new "task_reward" transaction type.
- Screenshot files are stored privately in the platform's existing cloud storage (not on a local server). Files are never publicly accessible; admin review access is granted via short-lived signed URLs generated on demand.
- Mobile-first design is required; the Offerwall grid collapses to a single column on small screens and expands to multi-column on larger screens.
- Admins are a distinct user role already established in the platform; no new role/permission system needs to be built.
- Suspension of a user account does not block reward crediting on approval (admin is responsible for not approving submissions from suspended users).
- A rejected submission allows the user to resubmit, up to a maximum of 3 total submission attempts per task per user. After 3 rejections, the task is permanently locked for that user and no further submissions are accepted.
- Tasks do not expire; they remain available indefinitely until an admin disables them.
- Pagination or infinite scroll will be used on both the admin submissions list and the user Offerwall if the item count exceeds 20.

## Clarifications

### Session 2026-04-25

- Q: Should a Task have an external action URL field? → A: Yes, required — every task must include an external URL (e.g., Play Store link) that users tap to navigate to the target action.
- Q: How should uploaded screenshot files be accessed in the admin review interface? → A: Signed/time-limited private URLs — files stored privately, short-lived signed URL generated on demand for admin viewing.
- Q: What is the expected behaviour when the wallet credit operation fails during an admin approval? → A: Rollback, stays Pending — the entire approval is rolled back; submission remains Pending; admin sees an error message and can retry.
- Q: Should there be a cap on how many times a user can resubmit a rejected task? → A: Cap at 3 attempts — after 3 rejected submissions for the same task, the task is permanently locked for that user; card shows "Locked" status.
- Q: What information should a task reward transaction entry show in the user's transaction history? → A: Amount + Task Title + Status — e.g., "+0.50 USDT · Download App X · Credited".
