# Feature Specification: User Team & Referrals (فريق العمل والإحالات)

**Feature Branch**: `007-user-referrals-tree`  
**Created**: 2026-04-07  
**Status**: Draft  
**Input**: User description: "Build the User Team & Referrals (فريق العمل والإحالات) module for the User Dashboard. Features: Referral Overview stats cards, Invite Link Section with copy-to-clipboard, and My Downline Tree — a collapsible indented list scoped to 6 levels deep with the current user as root."

---

## Clarifications

### Session 2026-04-07

- Q: Is a user strictly limited to viewing only their own downline tree, with server-side enforcement rejecting cross-user tree access? → A: Yes, strictly own tree only — server returns 403 for any request for another user's tree.
- Q: What action by a referred user triggers a referral commission for the referrer? → A: First deposit — commission fires when the referred user makes their first confirmed deposit.
- Q: What value serves as the referral identifier in the invite link — the user's UUID or a separate short code? → A: Separate short alphanumeric code — a distinct 6–10 character auto-generated code stored on the user profile.
- Q: Are stats cards populated from a live query on every page load, or from a pre-computed snapshot? → A: Pre-computed snapshot — cached aggregates refreshed when a new member joins or a deposit is confirmed.
- Q: How is the commission amount determined for a referral? → A: Multi-level percentage — when a deposit is approved, commissions are distributed simultaneously up all 6 upline levels at admin-configurable rates per level (L1 rate, L2 rate, …, L6 rate).

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 - View Referral Overview at a Glance (Priority: P1)

As a registered user, I want to see a summary of my referral activity on my dashboard so that I can quickly understand how my team is growing and how much I am earning from referrals.

**Why this priority**: This is the entry point to the entire referrals module. A user cannot engage with deeper features (invite link, downline tree) without first understanding their current standing. It directly drives motivation to refer more users.

**Independent Test**: Navigating to the Team & Referrals page and verifying that three stats cards display correct counts and earnings data constitutes a complete, shippable slice of value.

**Acceptance Scenarios**:

1. **Given** a logged-in user with at least one direct referral, **When** they open the Team & Referrals page, **Then** they see a "Total Direct Referrals" card showing the correct count of users they directly recruited.
2. **Given** a logged-in user with a multi-level downline, **When** they view the page, **Then** a "Total Team Size" card shows the aggregate count of all members across all 6 levels below them.
3. **Given** a logged-in user who has never referred anyone, **When** they view the page, **Then** all stats cards display zero values with an empty-state prompt encouraging them to invite others.
4. **Given** a logged-in user, **When** they view the "Referral Earnings" card, **Then** it shows the cumulative earnings attributed to referral commissions from their downline's activity.

---

### User Story 2 - Copy and Share Personal Invite Link (Priority: P2)

As a registered user, I want a dedicated area displaying my unique referral link so that I can easily copy and share it to recruit new members.

**Why this priority**: The invite link is the primary growth mechanism of the MLM platform. Without easy access to a shareable link, user acquisition via referrals is effectively blocked. This is the single most actionable item on the page.

**Independent Test**: Rendering the Invite Link section and triggering the copy action — then verifying a success toast appears and the clipboard contains the correct URL — fully validates this story.

**Acceptance Scenarios**:

1. **Given** a logged-in user, **When** they view the Team & Referrals page, **Then** their unique referral link (e.g., `https://teamoads.com/register?ref=[user_id]`) is displayed in a visually distinct card.
2. **Given** a user views their invite link card, **When** they press the "Copy" button, **Then** the full referral URL is copied to their clipboard AND a success toast notification confirms the action (e.g., "تم نسخ الرابط!").
3. **Given** the copy action is triggered on a browser or device that lacks clipboard access, **When** the operation fails, **Then** the link text is selected/highlighted so the user can copy it manually, and a fallback message is displayed.
4. **Given** a user views their invite link, **When** they inspect the URL, **Then** it always contains their unique short referral code (e.g., `TEMO-A3K9`) as the `ref` query parameter — never their internal UUID.

---

### User Story 3 - Explore My Downline Tree (Priority: P3)

As a registered user, I want to see an interactive, hierarchical view of my downline team so that I can understand who is under me, how deep my network extends, and identify which levels are active.

**Why this priority**: The downline tree provides transparency and motivates users to grow deeper networks. It is the most complex feature of the three but only meaningful after the simpler overview and invite sections are in place.

**Independent Test**: Rendering the downline tree with a seeded user hierarchy and verifying that nodes expand/collapse correctly up to 6 levels deep is a self-contained deliverable.

**Acceptance Scenarios**:

1. **Given** a logged-in user with a multi-level downline, **When** they view the "My Team Tree" section, **Then** the current user appears as the root node at the top of the tree.
2. **Given** the tree is rendered, **When** the user taps/clicks on a node (level 1 member), **Then** that node expands to reveal its direct children (level 2 members).
3. **Given** an expanded node, **When** the user taps/clicks it again, **Then** it collapses and hides all its descendants.
4. **Given** the full tree is displayed, **When** a member has children nested deeper than 6 levels below the root, **Then** those members are NOT shown — the tree is strictly capped at depth 6.
5. **Given** a leaf node (a member with no recruits), **When** the user views that node, **Then** there is no expand affordance (e.g., no chevron icon), clearly indicating it has no children.
6. **Given** a user with no downline members, **When** they view the tree section, **Then** an empty state is displayed prompting them to start inviting using their referral link.
7. **Given** the tree is rendered, **When** the user inspects each node, **Then** each node displays: the member's name, their level relative to the root (L1 through L6), and their join date or status badge.

---

### Edge Cases

- What happens when a user's referral code is invalid or missing from the URL? → System must still allow registration but treat the user as having no referrer.
- How does the system handle a downline member who has been suspended or deleted? → Suspended members remain visible in the tree with a "معلق" (suspended) badge but do not contribute to earnings counts.
- What if the tree data takes too long to load? → A skeleton loading state is shown for each section independently; the tree section shows an animated placeholder tree structure.
- What if a user's team size is in the thousands? → The tree must lazy-load children nodes on expand (pagination per level) to avoid rendering the entire tree at once.
- What happens to referral earnings if a referred user's transaction is reversed/refunded? → Earnings displayed reflect only confirmed, non-reversed commissions.
- What if the clipboard API is unavailable (e.g., non-HTTPS context)? → The link input field becomes selected for manual copy, and a tooltip or fallback message is shown.
- What if an upline level is vacant (the depositing user has fewer than 6 ancestors)? → The commission for that level is silently skipped and not redistributed; only existing upline members receive their respective level's commission.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST display three stats cards on the Team & Referrals page: "Total Direct Referrals" (الإحالات المباشرة), "Total Team Size" (إجمالي الفريق), and "Referral Earnings" (أرباح الإحالات).
- **FR-002**: Each stats card MUST display values sourced from a pre-computed snapshot of the current user's referral aggregates. The snapshot MUST be automatically refreshed whenever a new member joins using the user's referral code, or whenever a referred member's first deposit is confirmed.
- **FR-002a**: When a referred user's first deposit is approved, the system MUST distribute referral commissions simultaneously to ALL upline members within 6 levels above the depositing user. Each level receives a distinct percentage of the deposit amount, as configured by the admin (L1 rate, L2 rate, L3 rate, L4 rate, L5 rate, L6 rate).
- **FR-002b**: If an upline slot at a given level does not exist (e.g., the depositing user is only 2 levels deep in the network), the commission for that missing level MUST be skipped — it is NOT redistributed to other levels.
- **FR-003**: The system MUST display the current user's unique referral link in the format `https://teamoads.com/register?ref=[short_code]` within a dedicated, visually distinct invite card. The `short_code` is a 6–10 character alphanumeric identifier auto-generated and stored on the user profile — it MUST NOT be the user's internal UUID.
- **FR-004**: Users MUST be able to copy their referral link to the clipboard with a single button press; the action MUST trigger a visible success toast notification in Arabic.
- **FR-005**: The system MUST provide a fallback for clipboard copy failures that allows the user to manually select and copy the link.
- **FR-006**: The system MUST render a collapsible, indented tree visualization of the current user's downline, with the current user as the immovable root node. Access is strictly scoped to the authenticated user's own tree; any attempt to fetch another user's tree MUST be rejected with an authorization error (403).
- **FR-007**: The tree MUST be strictly limited to 6 levels of depth below the root (L1 through L6); members beyond level 6 MUST NOT be displayed or fetched.
- **FR-008**: Each node in the tree MUST display: the member's display name, their level badge (L1–L6), and their account status (active/suspended).
- **FR-009**: Any node with children MUST be expandable/collapsible via a single tap/click; the default state is collapsed for levels 2 and below.
- **FR-010**: Leaf nodes (members with no downline) MUST NOT display an expand affordance.
- **FR-011**: Suspended or deactivated members MUST still appear in the tree but rendered with a visual distinction (e.g., muted color, "معلق" badge) and MUST NOT be counted in active team metrics.
- **FR-012**: When total downline members at a given level exceed a reasonable threshold (20+), the tree MUST support paginated loading of children to prevent page overload.
- **FR-013**: All three sections of the page MUST have independent loading skeleton states; the failure of one section MUST NOT block the rendering of others.
- **FR-014**: The entire module MUST be rendered in RTL (`dir="rtl"`) with Arabic text labels for all UI strings.
- **FR-015**: The page layout MUST follow the established design system: soft shadows, no heavy borders, logical CSS properties (start/end instead of left/right), and the defined color palette (slate-900 headings, emerald-500/600 accents, slate-50 background).

### Key Entities

- **User (المستخدم)**: A registered platform member. Key attributes: ID (internal UUID), display name, referral_code (short alphanumeric, 6–10 chars, unique, auto-generated at registration), referrer_id, account status (active/suspended), join date.
- **Referral Relationship (علاقة الإحالة)**: Links a referrer to a referee. A user can have many direct referees; a user has at most one referrer.
- **Downline Tree Node (عقدة الشجرة)**: A derived view of a User as positioned in the tree. Attributes: user ID, display name, level (1–6), status, child count, children (lazy-loaded).
- **Referral Earnings Record (سجل أرباح الإحالة)**: A financial record crediting a commission to one upline member for one deposit event. A single approved deposit creates up to 6 separate records — one per upline level. Each record stores: beneficiary user ID, depositing user ID, upline level (1–6), deposit amount, commission rate applied, commission amount credited, and timestamp.
- **Team Stats Snapshot (ملخص الفريق)**: Pre-computed aggregated counters stored per user: direct referral count, total team size across 6 levels, total referral earnings. The snapshot is invalidated and recalculated when: (1) a new user registers using this user's referral code, or (2) a referred user's first deposit is confirmed.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can view their referral overview stats (all three cards populated from the latest snapshot) within 1 second of navigating to the Team & Referrals page under normal network conditions. Snapshot data MUST be no more than one referral event stale (i.e., reflects the state after the most recently processed join or deposit event).
- **SC-002**: The referral link copy action completes and the success toast appears within 300 milliseconds of the user pressing the copy button.
- **SC-003**: The downline tree renders the root node and its direct children (L1) within 1.5 seconds of page load; deeper levels load within 1 second of each expand action.
- **SC-004**: 95% of users with an existing downline can successfully expand and navigate at least 3 levels of their tree without errors on their first attempt.
- **SC-005**: The module is fully accessible on mobile viewports (320px–768px width) with no horizontal overflow or truncated interactive elements.
- **SC-006**: All UI text, labels, and toast messages are correctly displayed in Arabic, and the layout is visually correct in RTL orientation across all three sections.
- **SC-007**: Users with zero referrals see a clear, motivating empty state on all three sections — no broken layouts, no raw zero values without context.
- **SC-008**: The tree strictly enforces the 6-level depth limit — automated verification confirms no L7+ nodes are ever rendered regardless of the actual network depth in the database.

---

## Assumptions

- The platform already has an authentication system that provides the current user's ID and referral code at page load; the Team & Referrals module consumes this from the existing session context.
- Referral earnings are tracked as separate financial records (one per upline beneficiary per deposit event); the "Referral Earnings" stat aggregates all records where the current user is the beneficiary.
- Commission rates per upline level (L1–L6) are set by the platform admin and stored in a system configuration table; this module reads but does not modify those rates.
- The referral link base URL is `https://teamoads.com/register` and the referral parameter is `ref`. The identifier used is a short alphanumeric `referral_code` (6–10 characters) stored on the user profile — not the internal UUID.
- The "downline tree" shares the same collapsible-list design pattern already established in the Admin module (as mentioned in the feature request), so the visual component design is already proven and will be adapted for user-scope constraints.
- Mobile-first layout is assumed for all three sections; desktop will receive comfortable spacing and wider cards but the same structural layout.
- The tree data is fetched from the server; the client does not compute tree depth — the server enforces the 6-level cap before returning data.
- Users who are deleted/removed from the platform are not shown in the tree at all (as opposed to suspended users, who remain visible with a badge).
- The toast notification system is already implemented platform-wide (consistent with existing modules like the wallet) and will be reused here.
