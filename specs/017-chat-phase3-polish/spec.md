# Feature Specification: Chat Phase 3 Polish

**Feature Branch**: `017-chat-phase3-polish`  
**Created**: 2026-05-17  
**Status**: Draft  
**Input**: User description: "Implement the final client feedback features (Phase 3 Polish): member search and mute/unmute in group settings, admin-initiated direct messages, unread notification badges, and delete rooms/tickets."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manage Group Participants Quickly (Priority: P1)

An administrator can search within a group members list, find a specific participant, and mute or unmute that participant without leaving the group settings page.

**Why this priority**: Admins need fast moderation controls for active groups and support rooms.

**Independent Test**: Can be tested by opening group settings, filtering members by name or phone, muting one participant, and confirming the muted participant can no longer send messages until unmuted.

**Acceptance Scenarios**:

1. **Given** an admin is viewing a group settings member list, **When** they type a user's name or phone in search, **Then** the list narrows to matching participants.
2. **Given** a participant is unmuted, **When** an admin toggles mute, **Then** the participant becomes unable to send messages in that room.
3. **Given** a participant is muted, **When** an admin toggles unmute, **Then** the participant can send messages again.

---

### User Story 2 - Admin Starts Direct Messages (Priority: P1)

An administrator can start a one-on-one chat with any user from the admin experience. If a direct room already exists, the admin is taken to it; otherwise a new one is created.

**Why this priority**: Support teams need to initiate conversations proactively, not only respond after users create tickets.

**Independent Test**: Can be tested by choosing a user from the admin user list or chat area and verifying a direct room opens with exactly the admin and selected user.

**Acceptance Scenarios**:

1. **Given** no direct room exists with a selected user, **When** an admin starts chat, **Then** a new one-on-one room is created and opened.
2. **Given** a direct room already exists, **When** an admin starts chat with that user, **Then** the existing room opens and no duplicate room is created.

---

### User Story 3 - See Unread Chat Indicators (Priority: P2)

Users and admins can see which chat rooms have unread messages, and the main chat navigation item shows a total unread indicator.

**Why this priority**: Unread indicators reduce missed support messages and make chat navigation more efficient.

**Independent Test**: Can be tested by sending a message to another participant, confirming the receiving user's room/sidebar badge appears, then marking the room read and confirming the badge disappears.

**Acceptance Scenarios**:

1. **Given** a room has messages after the participant's last read position, **When** the sidebar renders, **Then** that room shows an unread dot or count.
2. **Given** one or more rooms have unread messages, **When** the app navigation renders, **Then** the chat navigation item shows a total unread badge.
3. **Given** a participant opens and reads a room, **When** their read position is updated, **Then** the room and navigation unread badges update.

---

### User Story 4 - Delete Rooms Or Tickets (Priority: P2)

An administrator can remove a room or ticket from the chat UI for all participants.

**Why this priority**: Admins need cleanup control for obsolete, mistaken, or abusive rooms.

**Independent Test**: Can be tested by deleting a room as an admin and confirming it no longer appears for the admin or participant.

**Acceptance Scenarios**:

1. **Given** an admin is in a room settings or room view, **When** they delete the room, **Then** the room is removed from chat lists for all participants.
2. **Given** a non-admin attempts to delete a room, **When** the request is processed, **Then** it is denied and the room remains visible.

### Edge Cases

- Searching members returns no matches.
- A muted participant tries to send text, attachment, or voice messages.
- An admin starts a direct chat with a user who already has an active direct room with that admin.
- A room is deleted while a participant currently has it open.
- Unread indicators should ignore rooms removed from the UI.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a member search field in group settings that filters participants by visible identity fields.
- **FR-002**: The system MUST let admins mute and unmute individual room participants.
- **FR-003**: The system MUST prevent muted participants from sending messages in the muted room.
- **FR-004**: The system MUST let admins start a direct chat with a selected user.
- **FR-005**: The system MUST reuse an existing one-on-one room between the admin and selected user when one exists.
- **FR-006**: The system MUST show room-level unread indicators when messages exist after the participant's last read position.
- **FR-007**: The system MUST show an aggregate unread chat indicator in the main app navigation.
- **FR-008**: The system MUST let admins delete or deactivate rooms/tickets so they disappear from all participants' chat lists.
- **FR-009**: The system MUST deny mute, direct-room creation, and delete-room actions for unauthorized callers.
- **FR-010**: The system MUST keep deleted or inactive rooms out of unread counts and room lists.

### Key Entities

- **Room Participant**: A user's membership in a chat room, including read position and whether they may send messages.
- **Direct Room**: A one-on-one conversation between exactly two participants.
- **Unread Indicator**: A per-room or aggregate signal that messages exist after a participant's last read position.
- **Inactive Room**: A room removed from active chat lists by an administrator.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Admins can find and mute a participant in groups of at least 100 members in under 15 seconds.
- **SC-002**: 100% of muted participants are blocked from sending new messages in muted rooms.
- **SC-003**: Admins can start or open a direct chat with a user in under 20 seconds.
- **SC-004**: Unread room and navigation indicators update accurately after reading a room or receiving a new message.
- **SC-005**: Deleted or inactive rooms disappear from room lists for all participants within one page refresh.

## Assumptions

- Existing chat roles remain the source of truth for admin and moderator access.
- Room deletion will use soft deletion so historical records can remain recoverable.
- Existing room read-position fields will be reused where possible.
- The admin user list and chat sidebar are acceptable entry points for admin-initiated direct messages.
