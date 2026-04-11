# Feature Specification: Admin Dashboard (لوحة تحكم الإدارة)

**Feature Branch**: `005-admin-dashboard`  
**Created**: 2026-04-06  
**Status**: Draft  
**Input**: User description: "Build the Admin Dashboard (لوحة تحكم الإدارة) module for our manual MLM platform."

---

## Clarifications

### Session 2026-04-06

- Q: How many leadership levels does the platform use, and what are their labels and integer mappings? → A: 6 levels, integers 1–6: L1, L2, L3, L4, L5, L6 — as defined in the client's project images. The dropdown and database column MUST support exactly these 6 values (no 0/unranked level via this field).
- Q: Should the Overview stat counts auto-update while the admin is viewing the page, or only refresh on navigation/page reload? → A: Manual refresh only — counts are fetched fresh on each page load or navigation to the Overview tab. No polling, no real-time push updates.
- Q: Are bulk approve/reject actions (selecting multiple rows at once) in scope for the Pending Deposits and Pending Tasks tables in v1? → A: No — one-at-a-time only. Each row must be individually opened, the image reviewed, and then approved or rejected. No checkboxes or bulk action controls are included in v1.
- Q: How should the Referral Tree be rendered visually — 2D graphical node map or indented collapsible list? → A: Indented collapsible list — each level is indented under its parent with CSS connector lines, with accordion-style expand/collapse per node. No external graphics library required.
- Q: If an admin user navigates to the regular user dashboard (`/dashboard`), should they be redirected to `/admin` or allowed to access both? → A: Always redirected to `/admin` — admin users cannot access the user-facing dashboard. The `/dashboard` route checks the role and redirects admins away.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Secure Admin Access & Layout (Priority: P1)

A user with `role === 'admin'` navigates to any `/admin/*` route and sees a premium RTL sidebar layout. All admin pages share a consistent shell with a sidebar navigation, a top bar, and a main content area. A non-admin user (or an unauthenticated user) who attempts to access any `/admin/*` route is immediately redirected — unauthenticated users go to the login page, and authenticated non-admin users are redirected to their user dashboard with no admin UI visible.

**Why this priority**: Route protection is the foundational security boundary. Without it, every admin capability is accessible to any registered user, compromising the entire platform. All other admin user stories depend on this one being solid.

**Independent Test**: Can be fully tested by logging in as a non-admin user, attempting to navigate to `/admin`, and verifying the redirect — then logging in as an admin user and verifying full access to the admin shell, without any of the inner dashboard content needing to be complete.

**Acceptance Scenarios**:

1. **Given** an authenticated user with `role === 'admin'`, **When** they navigate to `/admin` or any `/admin/*` sub-route, **Then** they see the admin layout shell (sidebar, top bar) and the route's content is rendered.
2. **Given** an unauthenticated visitor, **When** they navigate to `/admin` or any `/admin/*` route, **Then** they are immediately redirected to the login page with no admin content rendered.
3. **Given** an authenticated user with `role === 'user'`, **When** they navigate to any `/admin/*` route, **Then** they are immediately redirected to `/dashboard` and no admin UI or data is visible to them.
4. **Given** an authenticated user with `role === 'admin'`, **When** they navigate to `/dashboard` or any `/dashboard/*` route, **Then** they are immediately redirected to `/admin` — admins cannot access the user-facing dashboard.
5. **Given** an admin user on any admin page, **When** they look at the layout, **Then** they see a sticky right-side RTL sidebar (on desktop) with navigation links to: النظرة العامة (Overview), الإيداعات المعلقة (Pending Deposits), المهام المعلقة (Pending Tasks), المستخدمون (Users), and شجرة الإحالات (Referral Tree).
6. **Given** an admin user on a mobile device, **When** they access any admin page, **Then** the sidebar collapses into a hamburger-triggered drawer and the layout remains fully usable.

---

### User Story 2 — Platform Overview Dashboard (Priority: P1)

An admin logs into the admin panel and lands on the Overview tab (النظرة العامة). They see a real-time summary of the platform's key metrics: Total Registered Users, count of Pending Deposit Requests (الإيداعات المعلقة), and count of Pending Task Submissions (المهام المعلقة). Each metric is displayed as a prominent stat card. Pending counts are visually distinguished (e.g., with a warning amber color accent) to draw attention to items requiring action.

**Why this priority**: The Overview is the admin's "mission control" — the first thing they see on login and the quickest way to gauge whether action is needed. High-pending-count items must be visible at a glance.

**Independent Test**: Can be fully tested by seeding a known count of users, pending deposits, and pending tasks in the database, then loading `/admin` and verifying the three stat cards display the exact seeded counts.

**Acceptance Scenarios**:

1. **Given** an admin user on the Overview page, **When** the page loads, **Then** they see three stat cards labeled: "إجمالي المستخدمين", "الإيداعات المعلقة", and "المهام المعلقة", each displaying the current accurate count from the system.
2. **Given** there are 5 pending deposit requests and 12 pending task submissions, **When** the admin views the Overview, **Then** the "الإيداعات المعلقة" card shows "5" and "المهام المعلقة" card shows "12".
3. **Given** there are zero pending items, **When** the admin views the Overview, **Then** the pending cards display "0" — no items are hidden or omitted.
4. **Given** an admin takes an approval or rejection action in another tab, **When** they navigate back to the Overview tab (or manually reload the page), **Then** the stat counts reflect the updated values — no automatic live update is required while the Overview is in view.

---

### User Story 3 — Review & Approve/Reject Pending Deposits (Priority: P1)

An admin navigates to the Pending Deposits tab (الإيداعات المعلقة). They see a data table listing all package subscription requests with `status = 'pending'`. Each row shows: the requesting user's name and phone number, the requested package name, the amount paid, and the submission date. The admin can click a row (or a dedicated "عرض" button) to open a detail panel showing the Transfer Receipt Screenshot (صورة إيصال التحويل) at full size. They can then click "موافقة" (Approve) to activate the package for the user, or "رفض" (Reject) — which requires entering a rejection reason before confirming. The admin's action is reflected immediately in the table (the row disappears from the pending list) and the user's package status is updated accordingly.

**Why this priority**: Deposit approval is the primary financial control point of the platform. Users cannot earn without admin activation of their package, and unreviewed deposits represent real money transferred by users. This is a core operational flow.

**Independent Test**: Can be fully tested by seeding a `pending` package subscription request, loading the Pending Deposits table, opening the receipt, clicking Approve, and verifying: (a) the row removed from the pending table, (b) the user's active package is updated in the `public.users` table, and (c) the request status is set to `approved`.

**Acceptance Scenarios**:

1. **Given** there are 3 pending deposit requests, **When** the admin visits the Pending Deposits tab, **Then** they see a table with exactly 3 rows, each displaying: user name, user phone number, requested package name, amount paid (USD), and submission date.
2. **Given** an admin views a pending deposit row, **When** they click "عرض" or the row, **Then** a detail panel or modal opens showing the Transfer Receipt Screenshot at readable size, along with the user and package details.
3. **Given** an admin has reviewed the receipt and decides to approve, **When** they click "موافقة", **Then** the request status is set to `approved`, the user's `current_package_level` in `public.users` is updated to the approved package, the row disappears from the pending table, and a success toast confirms the action in Arabic: "تم تفعيل الباقة بنجاح".
4. **Given** an admin has reviewed the receipt and decides to reject, **When** they click "رفض", **Then** a text input prompt appears requiring a rejection reason — the confirm button remains disabled until a reason is entered — upon confirmation, the request status is set to `rejected`, the rejection reason is stored, the row disappears from the pending table, and a toast confirms: "تم رفض الطلب".
5. **Given** an admin approves a deposit for a user who already had an active package, **When** the approval is processed, **Then** the new package replaces the old active package on the user's profile per the platform's one-active-package-at-a-time rule.
6. **Given** the pending deposits table is empty (no pending requests), **When** the admin visits the tab, **Then** they see an empty state message: "لا توجد إيداعات معلقة حالياً".

---

### User Story 4 — Review & Approve/Reject Pending Task Submissions (Priority: P1)

An admin navigates to the Pending Tasks tab (المهام المعلقة). They see a data table listing all task completion logs with `status = 'pending'`. Each row shows: the submitting user's name, the task title, the reward amount snapshot, and the submission date. The admin can view the Screenshot Proof (صورة الإثبات) and approve or reject with a reason. On approval, the user's `wallet_balance` is incremented by the `reward_amount_snapshot`. On rejection, the balance is not changed.

**Why this priority**: Task approval is the primary payout trigger. Every approved task translates to a real balance credit for a user. Prompt, accurate review maintains user trust and platform integrity.

**Independent Test**: Can be fully tested by seeding a `pending` task completion log, loading the Pending Tasks table, viewing the proof image, clicking Approve, and verifying: (a) the row is removed from the pending table, (b) the user's `wallet_balance` is incremented by the `reward_amount_snapshot`, and (c) the log status is set to `approved`.

**Acceptance Scenarios**:

1. **Given** there are pending task completion logs, **When** the admin visits the Pending Tasks tab, **Then** they see a table listing each entry with: user name, task title, reward amount (formatted as `+$X.XX`), and submission date.
2. **Given** an admin views a pending task row, **When** they click "عرض" or the row, **Then** a detail panel opens showing the Screenshot Proof at readable size, alongside the task title and user details.
3. **Given** an admin has reviewed the proof and decides to approve, **When** they click "موافقة", **Then** the log status is set to `approved`, the `reward_amount_snapshot` is added to the user's `wallet_balance` in `public.users`, and the row disappears from the pending table with a success toast: "تم قبول المهمة وإضافة المكافأة للمحفظة".
4. **Given** an admin has reviewed the proof and decides to reject, **When** they click "رفض", **Then** a text input requires a rejection reason before confirmation, the log status is set to `rejected`, the user's `wallet_balance` is NOT changed, the row disappears from the pending table, and the rejection reason is stored and visible to the user in their task history.
5. **Given** the pending tasks table is empty, **When** the admin visits the tab, **Then** they see an empty state: "لا توجد مهام معلقة حالياً".

---

### User Story 5 — User Management & Leadership Level Assignment (Priority: P2)

An admin navigates to the Users tab (المستخدمون). They see a searchable, paginated table listing all registered users with: their name, phone number, current package level, current wallet balance, leadership level (مستوى القيادة), account status, and registration date. The admin can click any user row to open an edit panel where they can manually change the user's Leadership Level (مستوى القيادة). This is the only admin-editable field in this panel.

**Why this priority**: Leadership level is the primary MLM rank indicator. Manual assignment by the admin is the mechanism by which the admin rewards top performers and unlocks new privileges. Without this, there is no rank progression in the platform.

**Independent Test**: Can be fully tested by loading the Users table, clicking any user, changing their leadership level, saving, and verifying the updated level appears in the table row and in the user's own profile data.

**Acceptance Scenarios**:

1. **Given** the admin is on the Users tab, **When** the page loads, **Then** they see a paginated table with all registered users, each row showing: full name, phone number, active package name (or "غير مفعّل"), wallet balance (USD), leadership level, and registration date.
2. **Given** the admin enters a name or phone number in the search field, **When** they type, **Then** the table filters in real time (or on submit) to show only matching users.
3. **Given** the admin clicks a user row or "تعديل" button, **When** the edit panel opens, **Then** they can see all the user's details and a dropdown to change the Leadership Level.
4. **Given** an admin selects a new Leadership Level from the dropdown and saves, **When** the save action completes, **Then** the user's leadership level is updated in `public.users`, the change is reflected in the table row immediately, and a toast confirms: "تم تحديث مستوى القيادة بنجاح".
5. **Given** the admin wants to find a specific user, **When** they search by partial phone number or name, **Then** the system returns all matching users within the platform.

---

### User Story 6 — Visual Referral Tree for a User (Priority: P2)

An admin selects a specific user from the Users tab and clicks "عرض الشجرة" (View Tree). A Referral Tree (شجرة الإحالات) is rendered as an **indented collapsible list** — the selected user appears at the top level, their direct referrals are indented one level below connected by CSS lines, and each subsequent generation is indented further. Clicking any node with children collapses or expands its subtree (accordion-style). Each node displays: the user’s name, referral code, and leadership level badge.

**Why this priority**: The referral tree is the visual representation of the MLM structure. It is an essential admin tool for auditing the network, verifying commissions, and resolving disputes. It is lower priority than the financial approval flows but critical for network management.

**Independent Test**: Can be fully tested by seeding a 3-generation hierarchy (root → 2 children → 1 grandchild each), clicking "عرض الشجرة" for the root user, and verifying all seeded nodes and connecting lines are rendered at the correct hierarchy depth.

**Acceptance Scenarios**:

1. **Given** an admin clicks "عرض الشجرة" for a user with a known downline, **When** the tree renders, **Then** the selected user is shown as the root/top node and all direct referrals appear as immediate children with connecting lines.
2. **Given** a user has 3 levels of downline, **When** the admin views their tree, **Then** all 3 levels are visible, each node showing the user's full name, referral code, and leadership level badge.
3. **Given** a user has no downline (leaf node), **When** the admin views their tree, **Then** a single root node is shown with a message indicating no referrals have been made yet: "لا يوجد مستخدمون تحت هذا الحساب".
4. **Given** a tree with many nodes, **When** the admin views it, **Then** they can collapse/expand branches or scroll/pan without the UI breaking or becoming unusable.

---

### Edge Cases

- What happens if an admin tries to approve a deposit request that has already been approved or rejected (e.g., two admins acting simultaneously)? The system must check the current status before persisting the change and return an Arabic error: "تمت معالجة هذا الطلب بالفعل".
- What happens if an admin tries to approve a task log whose parent request is in an unexpected state? The system must validate and reject inconsistent states with an appropriate Arabic error message.
- What happens if the receipt or proof image URL is broken or the file has been deleted from storage? The detail panel must show a fallback placeholder with the Arabic message: "الصورة غير متاحة".
- What happens if a rejection reason is submitted as only whitespace? The system must validate the reason field and reject empty or whitespace-only input with: "يرجى إدخال سبب الرفض".
- What happens if the referral tree has a very large number of nodes (e.g., 500+)? The tree must lazily load or paginate child nodes to prevent browser performance issues.
- What happens to the leadership level if the admin triggers a package approval? Leadership level is a separate admin-controlled field — package approval does not auto-change the leadership level.
- What happens when an admin navigates to `/admin` but the admin account's role is changed to `user` mid-session? The system must re-validate the admin role on each protected route access, not only at login time.

---

## Requirements *(mandatory)*

### Functional Requirements

**Admin Route Protection**

- **FR-001**: All routes under the `/admin` path prefix MUST be protected such that only authenticated users with `role === 'admin'` can access them. Any unauthenticated request MUST redirect to `/login`. Any authenticated non-admin request MUST redirect to `/dashboard`. Conversely, all routes under the `/dashboard` path prefix MUST redirect authenticated admin users (`role === 'admin'`) to `/admin` — admins cannot access the user-facing dashboard.
- **FR-002**: The admin role MUST be read from the authenticated user's server-side session/profile on every protected admin route render — it MUST NOT rely solely on client-side state or local storage.
- **FR-003**: The admin layout shell MUST include an RTL sticky sidebar (desktop) with navigation links to all five admin sections: Overview (النظرة العامة), Pending Deposits (الإيداعات المعلقة), Pending Tasks (المهام المعلقة), Users (المستخدمون), and Referral Tree (شجرة الإحالات).
- **FR-004**: On mobile viewports, the sidebar MUST collapse and be accessible via a hamburger/drawer trigger.

**Overview Tab**

- **FR-005**: The Overview tab MUST display three stat cards with the following live data: (1) Total Registered Users (`COUNT` of `public.users`), (2) Pending Deposits (`COUNT` of `package_subscription_requests WHERE status = 'pending'`), (3) Pending Task Submissions (`COUNT` of `task_completion_logs WHERE status = 'pending'`).
- **FR-006**: Pending count stat cards MUST use a visually distinct color accent (amber/warning) to differentiate them from neutral stats and signal that action is required.

**Pending Deposits Tab**

- **FR-007**: The Pending Deposits table MUST query and display all `package_subscription_requests` records with `status = 'pending'`, ordered by `created_at ASC` (oldest first — FIFO review order).
- **FR-008**: Each table row MUST display: User Full Name, User Phone Number, Package Name (from joined `packages` table), Amount Paid (USD formatted as `$X.XX`), and Submission Date.
- **FR-009**: Each row MUST include an "عرض" action that opens a detail view (modal or slide-over panel) showing the Transfer Receipt Screenshot at readable size, using a signed private storage URL.
- **FR-010**: The detail view MUST include two action buttons: "موافقة" (Approve) and "رفض" (Reject).
- **FR-011**: Clicking "موافقة" MUST: set `package_subscription_requests.status = 'approved'`, update `public.users.current_package_level` to the approved package ID, deactivate any previously active package subscription record for that user, and record the action in the financial audit log.
- **FR-012**: Clicking "رفض" MUST: display a text input for rejection reason (mandatory — submit disabled until non-empty non-whitespace text is entered), then set `package_subscription_requests.status = 'rejected'`, store the rejection reason, and record the action in the audit log. The user's `wallet_balance` and `current_package_level` MUST NOT be modified.
- **FR-013**: If an action is attempted on a request that has already been processed (race condition), the system MUST display in Arabic: "تمت معالجة هذا الطلب بالفعل" and refresh the table.
- **FR-014**: An empty pending deposits table MUST display: "لا توجد إيداعات معلقة حالياً".
- **FR-014a**: The Pending Deposits table MUST NOT include row checkboxes or bulk action controls. Every approval or rejection requires individual row review — bulk operations are out of scope for v1.

**Pending Tasks Tab**

- **FR-015**: The Pending Tasks table MUST query and display all `task_completion_logs` records with `status = 'pending'`, ordered by `created_at ASC`.
- **FR-016**: Each table row MUST display: User Full Name, Task Title (from joined `tasks` table), Reward Amount Snapshot (formatted as `+$X.XX`), and Submission Date.
- **FR-017**: Each row MUST include an "عرض" action opening a detail view with the Screenshot Proof at readable size via a signed private storage URL.
- **FR-018**: Clicking "موافقة" MUST: set `task_completion_logs.status = 'approved'`, increment `public.users.wallet_balance` by `reward_amount_snapshot`, and record the action in the financial audit log.
- **FR-019**: Clicking "رفض" MUST: require a non-empty rejection reason, set `task_completion_logs.status = 'rejected'`, store the rejection reason, and NOT modify `public.users.wallet_balance`. The action MUST be recorded in the audit log.
- **FR-020**: If the proof image URL is unreachable or the file is missing, the detail view MUST show a fallback placeholder and the Arabic message: "الصورة غير متاحة".
- **FR-021**: All wallet balance mutations triggered by task approval MUST be performed server-side as an atomic operation — the balance increment and status update MUST succeed or fail together.
- **FR-022**: An empty pending tasks table MUST display: "لا توجد مهام معلقة حالياً".
- **FR-022a**: The Pending Tasks table MUST NOT include row checkboxes or bulk action controls. Every approval or rejection requires individual row review — bulk operations are out of scope for v1.

**Users Tab**

- **FR-023**: The Users tab MUST display a paginated table (minimum 20 rows per page) of all records in `public.users`, ordered by `created_at DESC` by default.
- **FR-024**: Each table row MUST display: Full Name, Phone Number, Active Package Name (or "غير مفعّل"), Wallet Balance (USD), Leadership Level, and Registration Date.
- **FR-025**: The Users table MUST include a search input that filters rows by Full Name or Phone Number. Filtering MUST be performed server-side to handle large user bases.
- **FR-026**: The admin MUST be able to open an edit panel for any user by clicking the row or a "تعديل" button in the row.
- **FR-027**: The edit panel MUST allow the admin to change the user's Leadership Level via a dropdown. This is the only editable field exposed in this panel — no direct editing of balances, phone numbers, or passwords via this UI.
- **FR-028**: Saving the Leadership Level change MUST update `public.users.leadership_level` and display a success toast: "تم تحديث مستوى القيادة بنجاح". The updated value MUST be immediately reflected in the Users table row.
- **FR-029**: The Leadership Level dropdown MUST include exactly 6 options mapped to integer values 1–6: L1, L2, L3, L4, L5, L6 — as defined in the client's project specification. No 0 or unranked value is exposed via the dropdown (a null/unset state may exist in the database for users who have not yet been assigned a level, but the dropdown always selects from 1–6).

**Referral Tree**

- **FR-030**: From the Users tab, each user row MUST include a "عرض الشجرة" button that navigates to or opens the Referral Tree view scoped to that user as the root.
- **FR-031**: The Referral Tree MUST fetch the target user and all of their downline (direct and indirect referrals, via the `referrer_id` foreign key chain in `public.users`), up to a configurable depth limit (default: 5 levels) to prevent performance issues on very large trees.
- **FR-032**: Each tree node MUST display: User Full Name, Referral Code, and Leadership Level badge.
- **FR-033**: Each child node MUST be visually connected to its parent using CSS vertical and horizontal connector lines (e.g., a left border + a horizontal pseudo-element line), giving a clear tree branch appearance. No SVG, canvas, or external graphics library is used.
- **FR-034**: If a user has no downline, the tree MUST show only the root node with the Arabic message: "لا يوجد مستخدمون تحت هذا الحساب".
- **FR-035**: Nodes that have children MUST display an expand/collapse toggle (e.g., a chevron icon). Clicking the toggle shows or hides all direct children of that node (accordion-style). The root node is always expanded by default.

**UI & Accessibility**

- **FR-036**: All admin-facing text, labels, table headers, action buttons, status badges, error messages, and empty states MUST be in Arabic.
- **FR-037**: The entire admin interface MUST be RTL-aligned (`dir="rtl"`).
- **FR-038**: Status badges in tables MUST use the standardized soft color palette: `pending` → amber (bg-amber-50 text-amber-700), `approved` → emerald (bg-emerald-50 text-emerald-700), `rejected` → red (bg-red-50 text-red-700).
- **FR-039**: All approval/rejection actions MUST require a confirmation step (either a modal confirm or an inline two-step interaction) to prevent accidental irreversible actions.
- **FR-040**: Table rows MUST have a subtle hover state (`hover:bg-slate-50`) to indicate interactivity.

### Key Entities

- **User** (`public.users`): Existing entity. Admin-relevant fields: `id`, `full_name`, `phone`, `role`, `current_package_level`, `wallet_balance`, `leadership_level`, `referrer_id`, `referral_code`, `created_at`.
- **PackageSubscriptionRequest** (`package_subscription_requests`): Existing entity. Admin actions: `status` → `approved`/`rejected`, `rejection_reason`, `reviewed_at`, `reviewed_by` (admin user ID).
- **TaskCompletionLog** (`task_completion_logs`): Existing entity. Admin actions: `status` → `approved`/`rejected`, `rejection_reason`, `reward_amount_snapshot` credited to user wallet on approval.
- **FinancialAuditLog** (`financial_audit_log`): Required for every wallet mutation. Must log: action type, amount, target user ID, admin user ID (actor), and timestamp.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin user can log in, navigate to `/admin`, and see the Overview stats rendered in under 3 seconds on a standard connection. Stats reflect the state at page-load time; no real-time or polling updates are required.
- **SC-002**: 100% of unauthenticated or non-admin access attempts to any `/admin/*` route result in an immediate redirect — zero protected admin data is served to unauthorized users.
- **SC-003**: An admin can open a pending deposit or task row, view the receipt/proof image, and complete an approve or reject action in under 60 seconds from landing on the tab.
- **SC-004**: 100% of approved task submissions result in an atomic balance credit — zero partial updates (status approved but balance unchanged, or vice versa) are possible.
- **SC-005**: 100% of rejected requests have a non-empty rejection reason stored in the database — zero rejections are possible without a reason.
- **SC-006**: Leadership level updates are reflected in the Users table within 2 seconds of saving, without a full page reload.
- **SC-007**: The Referral Tree renders correctly for hierarchies up to 5 levels deep with up to 50 nodes visible simultaneously, without browser performance degradation.
- **SC-008**: All admin actions that mutate financial data (approve deposit, approve task, reject task) are recorded in the `financial_audit_log` — 0% of such actions may be unlogged.
- **SC-009**: The admin search on the Users tab returns results within 2 seconds for a user base of up to 10,000 registered users.

---

## Assumptions

- The `public.users` table already includes a `role` column with possible values `'user'` and `'admin'`. Admin accounts are seeded directly in the database — there is no self-registration flow for admins.
- The `public.users` table includes a `leadership_level` column storing an integer in the range 1–6 (nullable for users not yet assigned a level). The six levels are: L1 (1), L2 (2), L3 (3), L4 (4), L5 (5), L6 (6), as defined in the client's project images. The admin dropdown exposes all six options.
- The `financial_audit_log` table already exists per the platform constitution and is used for all wallet mutations. Admin approval actions MUST write to it.
- Receipt images (صور إيصالات التحويل) and task proof images (صور الإثبات) are stored in a private Supabase Storage bucket (`proofs`). The admin detail view uses short-lived signed URLs to display them safely.
- All admin actions (approvals, rejections, leadership level changes) are irreversible via the UI — admins must contact a super-admin or perform a direct database correction for any mistakes. Version 1 does not include an "undo" feature.
- The referral tree depth limit of 5 levels is a performance safeguard. If the platform grows to require deeper tree visibility, this limit will be revisited in a future iteration.
- The admin panel is desktop-first (while remaining usable on mobile). The RTL sidebar layout targets tablet/desktop screens primarily, with a collapsible drawer fallback for mobile.
- Only one admin role exists in v1 — there is no super-admin vs. admin distinction. All admin users have identical permissions.
- The admin panel will be accessed by a small number of trusted internal users (1–5 admins). Heavy concurrent admin access is not an expected load pattern for v1.
- This spec does not cover admin-facing task management (creating/editing/deleting tasks in the global pool) or package management (CRUD on package tiers) — those are out of scope for this module and will be addressed in a separate admin configuration module.
- Currency is USD only, formatted as `$X.XX` per the platform standard established in `001-auth-profile`.
