# Feature Specification: Apps Offerwall & Tasks System

**Feature Branch**: `011-offerwall-tasks-system`  
**Created**: 2026-04-25  
**Status**: Draft  
**Input**: User description: "Build the 'Apps Offerwall & Tasks System' module. The goal is to allow admins to create tasks (e.g., download an app, leave a review), and users can complete them by uploading a screenshot as proof to earn a USDT reward."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - User Completes a Task and Earns a Reward (Priority: P1)

A user browses the Offerwall page and sees a list of active tasks. They click on an available task (e.g., "Download App X and leave a 5-star review"), read the step-by-step instructions, upload a screenshot as proof of completion, and submit. Their submission enters a pending state and—once approved by an admin—the USDT reward is automatically credited to their wallet balance.

**Why this priority**: This is the core revenue-generating loop of the entire module. Without this flow, the feature delivers zero user value.

**Independent Test**: Can be fully tested by creating a dummy active task as an admin, submitting a screenshot as a user, approving the submission as an admin, and verifying the user's wallet balance increased by the reward amount.

**Acceptance Scenarios**:

1. **Given** a user is logged in and there is at least one active task they have not yet submitted for, **When** they navigate to `/dashboard/tasks`, **Then** they see the task displayed as "Available" with the reward amount clearly visible.
2. **Given** a user clicks on an "Available" task, **When** the task detail panel opens, **Then** they see the full title, description/instructions, reward amount, and a screenshot upload area.
3. **Given** a user uploads a valid image file and clicks "Submit", **When** the submission is saved, **Then** the task card updates its status to "Pending Review" and the user cannot submit again for the same task.
4. **Given** an admin approves a submission, **When** approval is saved, **Then** the corresponding user's wallet balance is credited with the task's reward amount, and the task card for that user updates its status to "Completed".
5. **Given** a user has an approved submission for a task, **When** they view the Offerwall, **Then** the task card shows a "Completed" status badge and no submission option is available.

---

### User Story 2 - Admin Creates and Manages Tasks (Priority: P2)

An admin navigates to the task management panel and creates a new task by providing a title, detailed instructions (for the user), and a USDT reward amount. They can also edit existing tasks or disable tasks that are no longer active, which hides them from the user-facing Offerwall immediately.

**Why this priority**: Admins must be able to populate the Offerwall before users can earn anything. Task management is the supply side of the system.

**Independent Test**: Can be fully tested by creating a task in the admin panel and verifying it appears on the user Offerwall, then disabling it and verifying it disappears.

**Acceptance Scenarios**:

1. **Given** an admin is on `/admin/tasks`, **When** they click "Create New Task", **Then** a form is displayed with fields for Title, Description/Instructions, and Reward Amount (USDT).
2. **Given** an admin submits a new task with all required fields, **When** the task is saved, **Then** it appears in the admin task list as "Active" and becomes visible on the user Offerwall.
3. **Given** an admin clicks "Edit" on an existing task, **When** they update any field and save, **Then** the task reflects the updated information both in the admin panel and the user Offerwall.
4. **Given** an admin disables a task, **When** the change is saved, **Then** the task no longer appears on the user-facing Offerwall. Users with existing pending or approved submissions for that task retain their submission status.
5. **Given** an admin views the task list, **When** they look at any task, **Then** they can see a count of total submissions and the count broken down by status (Pending, Approved, Rejected).

---

### User Story 3 - Admin Reviews Task Submissions (Priority: P3)

An admin navigates to the submissions review panel and sees a list of all pending task submissions. For each submission, they can view the uploaded screenshot, the task name, the user's name, the submission timestamp, and choose to either approve or reject it with an optional rejection reason.

**Why this priority**: The review panel is essential for quality control and fraud prevention. Without it, the reward credit flow cannot be completed.

**Independent Test**: Can be fully tested by having a user submit a task, then an admin reviewing and approving/rejecting it from the submissions panel and verifying the outcome.

**Acceptance Scenarios**:

1. **Given** an admin is on `/admin/task-submissions`, **When** they load the page, **Then** they see a paginated list of all submissions, filterable by status (Pending, Approved, Rejected).
2. **Given** a pending submission is listed, **When** the admin clicks on it, **Then** they can view the full-size uploaded screenshot and all submission details.
3. **Given** an admin clicks "Approve" on a pending submission, **When** the approval is saved, **Then** the submission status changes to "Approved" and the user's wallet is credited with the reward amount.
4. **Given** an admin clicks "Reject" on a pending submission, **When** the rejection is saved (optionally with a reason), **Then** the submission status changes to "Rejected" and the user is notified that they may resubmit. The user's wallet is not credited.
5. **Given** an admin has already approved or rejected a submission, **When** they view that submission, **Then** the approve/reject actions are no longer available (decision is final).

---

### User Story 4 - User Resubmits After Rejection (Priority: P4)

When a user's submission is rejected, they are given the opportunity to upload a new screenshot and resubmit for the same task. The task card clearly communicates the "Rejected" status to prompt resubmission.

**Why this priority**: Prevents user frustration from permanent rejections for honest mistakes like wrong screenshots, and improves overall task completion rates.

**Independent Test**: Can be fully tested by submitting a task, having an admin reject it, and verifying the user can re-upload and resubmit.

**Acceptance Scenarios**:

1. **Given** a user's submission has been rejected, **When** they view the Offerwall, **Then** the task card shows a "Rejected — Resubmit" status with a prominent call-to-action.
2. **Given** a user clicks to resubmit a rejected task, **When** they upload a new screenshot and submit, **Then** the previous rejected submission is superseded and a new pending submission is created.
3. **Given** the validation rule of "one pending or approved submission per task", **When** a user has a rejected submission and resubmits, **Then** only one active pending submission exists at any time.

---

### Edge Cases

- What happens if a user tries to submit a task that has been disabled after they opened the task detail panel? The submission should be rejected with a clear message that the task is no longer active.
- What happens if an admin tries to approve a submission for a task that was since disabled? The approval should still succeed—submissions retain their own lifecycle independent of task status.
- What happens if a user uploads a non-image file (e.g., a PDF or video)? The system must reject the upload with a clear error message and only accept common image formats (JPG, PNG, WEBP).
- What happens if the uploaded file exceeds the maximum size limit? The system must display an error before attempting to upload, preventing wasted bandwidth.
- What happens when a user has a pending submission and attempts to submit again? The submit action should be blocked with a message indicating a pending review already exists.
- What happens if an admin approves a submission but the wallet credit operation fails? The operation must be atomic — either both the approval and the credit succeed, or neither does.

---

## Requirements *(mandatory)*

### Functional Requirements

**Task Management (Admin)**

- **FR-001**: Admins MUST be able to create a task with the following fields: Title (required, max 100 characters), Description/Instructions (required, max 1000 characters), and Reward Amount in USDT (required, positive decimal number).
- **FR-002**: Admins MUST be able to edit the Title, Description, and Reward Amount of any existing task at any time.
- **FR-003**: Admins MUST be able to disable or re-enable any task. Disabled tasks MUST immediately become invisible to users on the Offerwall.
- **FR-004**: The admin task list MUST display a per-task summary of submission counts broken down by status (Total, Pending, Approved, Rejected).
- **FR-005**: Reward Amount MUST be a positive number greater than zero. The system MUST prevent saving a task with a zero or negative reward.

**Submission Review (Admin)**

- **FR-006**: Admins MUST be able to view all task submissions on a dedicated page, filterable by status: Pending, Approved, Rejected.
- **FR-007**: Each submission entry MUST display: the task title, the submitting user's display name, the submission date/time, the current status, and a thumbnail of the uploaded screenshot.
- **FR-008**: Admins MUST be able to approve a pending submission, which atomically credits the reward amount to the user's wallet and changes the submission status to "Approved".
- **FR-009**: Admins MUST be able to reject a pending submission with an optional rejection reason. The user's wallet MUST NOT be credited upon rejection.
- **FR-010**: Once a submission is Approved or Rejected, the decision MUST be final — admins cannot change the status afterward.

**Offerwall (User)**

- **FR-011**: Users MUST be able to view a grid of all currently active tasks on `/dashboard/tasks`.
- **FR-012**: Each task card MUST clearly display: the task title, the reward amount in USDT, and the user's current submission status for that task (Available, Pending Review, Completed, or Rejected — Resubmit).
- **FR-013**: Users MUST be able to click any task card to open a detail panel showing the full description/instructions, reward amount, and the screenshot submission interface.
- **FR-014**: The submission interface MUST accept image files only (JPG, PNG, WEBP). The maximum accepted file size MUST be 10MB. Files exceeding this limit or in unsupported formats MUST be rejected with a clear error message before upload begins.
- **FR-015**: Users MUST only be able to have one active (Pending or Approved) submission per task at any given time. The system MUST prevent duplicate active submissions at the data level.
- **FR-016**: Users with a "Rejected" submission for a task MUST be able to resubmit by uploading a new screenshot, which creates a new Pending submission and invalidates the rejected one.
- **FR-017**: Users MUST NOT be able to submit for a disabled task, even if they navigated to the detail panel before the task was disabled.

**Wallet Integration**

- **FR-018**: Upon approval of a task submission, the approved reward amount MUST be credited to the submitting user's general wallet balance.
- **FR-019**: The wallet credit operation MUST be atomic with the approval action — if the credit fails, the submission status MUST NOT change to "Approved".
- **FR-020**: The credited reward MUST appear in the user's transaction history with a description identifying it as a task reward (e.g., "مكافأة مهمة: [Task Title]").

### Key Entities

- **Task**: Represents a unit of work an admin creates. Attributes: title, description/instructions, reward amount (USDT), active/disabled status, creation date, submission counts (derived).
- **TaskSubmission**: Represents a user's attempt to complete a task. Attributes: reference to Task, reference to User, uploaded screenshot (stored file reference), status (Pending / Approved / Rejected), rejection reason (optional), submission timestamp, review timestamp.
- **WalletTransaction**: An existing or extended entity that records balance changes. A new transaction type "task_reward" must be supported, linking back to the TaskSubmission that triggered it.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can find, submit, and receive credit for a task completion in under 5 minutes from initial page load.
- **SC-002**: Admins can review and action a pending submission (approve or reject) in under 60 seconds from opening the submissions page.
- **SC-003**: 100% of approved submissions result in the correct reward amount being credited to the user's wallet — zero instances of a credit mismatch or a credit without an approved submission.
- **SC-004**: The system enforces the one-active-submission-per-task constraint in 100% of cases, even under concurrent submission attempts by the same user.
- **SC-005**: Task status on the Offerwall (Available, Pending, Completed, Rejected) reflects the true system state within the same page session — users never see a stale status without refreshing.
- **SC-006**: Screenshot uploads complete successfully for files up to 10MB in size. Files exceeding the limit are rejected before any upload data is transmitted.

---

## Assumptions

- Users are authenticated before accessing the Offerwall. Unauthenticated users are redirected to the login page.
- The platform already has a general-purpose user wallet with a balance field that can be incremented. This feature extends (not replaces) that existing wallet system.
- The platform already has a transaction history mechanism that this feature will add a new record type to ("task_reward").
- Admin authentication and role-based access control are already in place; this feature adds new admin-only pages under the existing `/admin` route structure.
- A file storage service (e.g., cloud object storage) is already provisioned for the platform; screenshot uploads will use the same infrastructure used for other proof uploads (e.g., deposit receipts).
- There is no limit on the total number of tasks an admin can create in this version.
- Notifications to users upon submission rejection are in-platform only (e.g., the status badge on the task card changes) — push/email notifications are out of scope for v1.
- Task reward amounts are fixed at the time of task creation. If an admin edits the reward amount after submissions exist, the new amount applies only to future approvals. Existing pending submissions are approved at the amount set when they were submitted.
- The Offerwall displays tasks sorted by most recently created (newest first) by default.
- Admins cannot delete tasks; they can only disable them. This preserves the historical record of submissions.
