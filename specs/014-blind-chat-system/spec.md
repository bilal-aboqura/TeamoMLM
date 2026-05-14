# Feature Specification: نظام المحادثة المغلقة — Ultimate Secure & Blind Chat System (Phase 1)

**Feature Branch**: `014-blind-chat-system`  
**Created**: 2026-05-10  
**Status**: Draft  
**Input**: User description: "Build Phase 1 of the 'Ultimate Secure & Blind Chat System'. Strict blind identity, unified room system (DMs, groups, tickets), real-time messaging (text/image/file), admin media controls per group, role-based access (Admin/Moderator/User)."

---

## Clarifications

### Session 2026-05-10

- Q: Where should blind-filter enforcement live — DB-level RLS or application-layer filtering? → A: Database-level RLS. Policies on messages and participants tables ensure a User's session can structurally never read rows they are not entitled to. Application layer has no privacy-filtering responsibility.
- Q: Who can initiate a Support Ticket room? → A: User-initiated only. Only a regular User can open a new ticket. Admins respond but cannot create a ticket room themselves.
- Q: How should past message history be loaded when opening a conversation? → A: Cursor-based infinite scroll. The most recent 50 messages load on open; scrolling up fetches older batches via a cursor. The Participant's last-read marker serves as the initial scroll anchor.
- Q: Is the media permission a single combined toggle or separate toggles for images and files? → A: Separate granular toggles — client-mandated. Three independent flags (`images_allowed`, `files_allowed`, `audio_allowed`) stored in a `media_settings` structured column on the Room, allowing Admins to control each media type independently. `audio_allowed` is reserved for Phase 2 but the field must exist in Phase 1.
- Q: What is the intended expiry window for presigned media access URLs? → A: 1-hour expiry with server-side re-generation on view. The Attachment record stores the storage path only (never the URL). The server generates a fresh presigned URL valid for 1 hour each time a client requests to view an attachment. This balances security with session usability.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — User Sends a Message to an Admin via Direct Message (Priority: P1)

A regular user opens a direct-message conversation with an Admin or Support account. They type a text message and send it. The message appears immediately in the conversation thread. The user can see only their own messages and Admin replies — they never see any other user's messages or identity in this view.

**Why this priority**: Direct messaging between user and admin is the foundational communication primitive. All other room types depend on the same underlying messaging engine, and this story produces a working, demonstrable MVP for the entire system.

**Independent Test**: A user can log in, open their DM with admin, send "Hello", see their message appear, and receive a reply — fully testable end-to-end without groups or tickets.

**Acceptance Scenarios**:

1. **Given** a logged-in user on the DM screen, **When** they type a message and press send, **Then** the message appears in the conversation within 2 seconds, attributed only to "You" (not showing the user's identity to admin in a way that could be shared).
2. **Given** an Admin replies to a user's DM, **When** the user's screen is open, **Then** the Admin's reply appears in real-time without requiring a page refresh.
3. **Given** a user's DM thread, **When** the user views it, **Then** no other user's messages, names, or profile pictures are visible — only their own messages and the Admin's messages.

---

### User Story 2 — User Participates in a Blind Group (Priority: P2)

A regular user is a member of a group (e.g., "Investment Tips"). They can see messages from Admins and Moderators, and they can see their own messages. They cannot see messages sent by other users. They cannot see the list of other members. The group is effectively a broadcast channel where users can respond but remain invisible to each other.

**Why this priority**: The blind group is the core differentiator of this system. It enforces the privacy model at scale and is required for safe community interaction in the platform context.

**Independent Test**: Two separate user accounts joined to the same group can be tested: User A sends a message, and when logged in as User B, User A's message is invisible. Admin sends a message, and both User A and User B see it.

**Acceptance Scenarios**:

1. **Given** User A and User B are in the same group, **When** User A sends a message, **Then** User B sees no trace of User A's message in the group feed.
2. **Given** an Admin posts a broadcast message in a group, **When** any member views the group, **Then** all members see the Admin's message.
3. **Given** a user is on the group screen, **When** they view the member list or participant list, **Then** the count of members is visible but individual user identities are hidden (names/avatars not shown).
4. **Given** a user sends a message in a group, **When** they view the conversation, **Then** their own message is visible to themselves, labeled "أنت" (You).

---

### User Story 3 — Admin Broadcasts and Moderates a Group (Priority: P2)

An Admin creates a group, adds users as members, and sends broadcast messages. The Admin can see all messages from all members within the group (full visibility). The Admin can delete any message, mute a member, or remove them from the group. The Admin can also toggle whether media uploads (images, files) are allowed in the group.

**Why this priority**: Without admin moderation capabilities, the system cannot be safely operated. Admin controls are required to launch the feature.

**Independent Test**: Admin creates a group, adds 2 test users, sends a broadcast, views messages from both users, toggles off media uploads, and confirms users can no longer attach files — fully testable in isolation.

**Acceptance Scenarios**:

1. **Given** an Admin is in the group management panel, **When** they toggle "Allow Media" off, **Then** users in that group immediately lose the ability to attach images or files to their messages.
2. **Given** an Admin views the group conversation, **When** they view the feed, **Then** they can see all messages from all members (full visibility, no blind restrictions apply to Admin).
3. **Given** an Admin clicks "Delete Message" on a user's message, **When** confirmed, **Then** the message is removed from the conversation for all viewers.
4. **Given** an Admin creates a new group, **When** they search for and select users to add, **Then** those users appear as members and receive access to the group.

---

### User Story 4 — User Sends an Image or File in a Permitted Chat (Priority: P3)

A user in a DM or group where media is permitted can attach an image or a file to their message. They select the file, see a preview, and send it. The media appears in the conversation thread. If media is disabled for the room, the attachment button is hidden or greyed out with a clear explanation.

**Why this priority**: Media messaging is essential for support tickets and group instructions, but the core blind privacy logic must work first.

**Independent Test**: In a DM with media enabled, a user uploads a JPG image and sends it. The image appears in the thread. Admin then disables media for a group — user in that group can no longer attach files.

**Acceptance Scenarios**:

1. **Given** a user in a media-enabled DM, **When** they attach an image (JPG/PNG up to 10 MB) and send, **Then** the image appears as a thumbnail in the conversation within 3 seconds.
2. **Given** a user in a media-enabled room, **When** they attach a file (PDF/DOC up to 25 MB) and send, **Then** the file appears as a downloadable attachment in the thread.
3. **Given** an Admin has disabled media for a specific group, **When** a user opens that group, **Then** the attachment button is hidden and a tooltip reads "رفع الوسائط معطل في هذه المجموعة".
4. **Given** a user tries to send an unsupported file type (e.g., .exe), **When** they select it, **Then** the system rejects the file and shows a clear error before sending.

---

### User Story 5 — User Selects a Predefined Avatar (Priority: P3)

During registration or from their profile settings, a user selects their avatar from a curated set of predefined images. They cannot upload a custom profile picture. The avatar they select is displayed in their own view of their profile but is never shown to other users in shared spaces.

**Why this priority**: Avatar selection supports identity customization without breaking the blind-identity privacy model. It is a UX polish feature that depends on the core system being operational first.

**Independent Test**: A user visits their profile settings, sees a grid of avatar options, selects one, saves, and sees their chosen avatar reflected in their own profile header. Another user or Admin logged in simultaneously does not see this user's avatar in any shared chat context.

**Acceptance Scenarios**:

1. **Given** a user on their profile settings screen, **When** they open the avatar picker, **Then** a grid of at least 12 predefined avatar images is displayed.
2. **Given** a user selects an avatar and saves, **When** they return to their profile, **Then** the newly chosen avatar is shown.
3. **Given** User A has selected a custom avatar, **When** User B views a shared group, **Then** User A's avatar is never displayed to User B (User B sees no representation of User A).
4. **Given** a user tries to upload a custom image as their avatar, **When** they interact with the avatar settings, **Then** no file upload control is present — only the predefined grid is available.

---

### User Story 6 — Moderator Reviews Group Activity (Priority: P3)

A Moderator assigned to a group can view all messages in the group (full read access, same as Admin). They can delete messages but cannot change group settings, toggle media permissions, add/remove members, or create/delete groups.

**Why this priority**: Moderator role separates operational oversight from full admin control, enabling scalable moderation without security risk.

**Independent Test**: A user account granted Moderator role on a group can see all messages (including those invisible to regular users), delete a message, but the "Group Settings" and "Media Toggle" controls are not accessible or visible to them.

**Acceptance Scenarios**:

1. **Given** a Moderator assigned to a group, **When** they open the group feed, **Then** they see all member messages (not blind-filtered).
2. **Given** a Moderator, **When** they attempt to access group settings or toggle media, **Then** those controls are hidden or return an "access denied" response.
3. **Given** a Moderator deletes a message, **When** confirmed, **Then** the message is removed from view for all participants.

---

### Edge Cases

- What happens when a user is removed from a group while they have the group conversation open? The UI should gracefully notify them they no longer have access and redirect to the room list.
- What happens when a message send fails due to a connection drop? The system must show a "failed to send" indicator with a retry option; the message must not be duplicated on retry.
- What happens when two users send a message simultaneously in the same group? Both messages are stored independently with correct ordering by server timestamp.
- What happens when a file upload exceeds the allowed size? The system must reject it client-side with a clear error before attempting the upload.
- What happens when a Moderator is granted full Admin access? Their elevated permissions must take effect within one session refresh without requiring logout.
- What happens when a group's `images_allowed` is toggled off but `files_allowed` remains on while a user is mid-upload of an image? The image upload in progress is allowed to complete, but subsequent image attach attempts are blocked immediately while file attachments remain available.
- What happens when an Admin enables `files_allowed` but not `images_allowed`? The file picker is shown and functional; the image picker is hidden with a tooltip. Both controls are independent in the UI.
- What happens when a user with no groups or DMs opens the chat section? An empty state with a clear prompt ("لا توجد محادثات بعد") is displayed.
- What happens if the predefined avatar set is updated (new avatars added)? Existing users retain their previously chosen avatar; new avatars appear in the picker for future selection.

---

## Requirements *(mandatory)*

### Functional Requirements

**Room & Identity System**

- **FR-001**: The system MUST support three room types: Direct Message (one User ↔ one Admin), Blind Group (one-to-many broadcast with hidden membership), and Support Ticket — all using a unified underlying room model. Support Tickets MUST be user-initiated only: a User opens a ticket and an Admin responds. Admins MUST NOT be able to create a ticket room on behalf of or directed at a User.
- **FR-002**: The system MUST enforce blind identity rules at the database access-control layer (Row-Level Security). In all shared spaces, a User's database session MUST be structurally incapable of reading another User's messages, identity, or participant records — the privacy guarantee must not rely solely on application-layer filtering.
- **FR-003**: The system MUST allow Admins and Moderators to have full read visibility into all messages in any room they manage, bypassing the blind-identity filter.
- **FR-004**: User avatars MUST be selected exclusively from a predefined, platform-managed set of avatar images. No custom image uploads for profile pictures are permitted.
- **FR-005**: The system MUST support future extensibility: the room schema MUST include fields to accommodate threading (parent message references), message statuses (delivered, read), and soft-deletion, even if these are not surfaced in Phase 1 UI.

**Messaging Engine**

- **FR-006**: The system MUST deliver new messages to all relevant participants in real-time (within 2 seconds of sending under normal conditions) without requiring a page refresh.
- **FR-006b**: When a user opens a conversation, the system MUST load the most recent 50 messages by default. Scrolling up MUST trigger a cursor-based fetch of the next older batch (50 messages per batch). The Participant's `last_read_position` cursor MUST be used as the initial scroll anchor so the user lands at their last unread message. Fetching each older batch MUST complete in under 1 second.
- **FR-007**: Users MUST be able to send plain text messages of up to 4,000 characters in any room they have access to.
- **FR-008**: Users MUST be able to attach and send images (JPG, PNG, GIF, WebP) up to 10 MB per file in rooms where `images_allowed` is true.
- **FR-009**: Users MUST be able to attach and send files (PDF, DOC, DOCX, XLS, XLSX, ZIP) up to 25 MB per file in rooms where `files_allowed` is true.
- **FR-010**: The system MUST display image attachments as in-line thumbnails within the message thread. Non-image files MUST be displayed as downloadable attachment cards showing filename and file size.
- **FR-011**: Each message MUST persist a server-assigned timestamp, sender role (Admin/Moderator/User), and a unique message identifier, regardless of room type.
- **FR-012**: The system MUST support soft-deletion of messages (mark as deleted without physical removal) to preserve audit trail integrity. Deleted messages MUST display a placeholder ("تم حذف هذه الرسالة") visible to Admins and Moderators but hidden from regular Users.

**Media & Room Controls**

- **FR-013**: Admins MUST be able to independently toggle three media permission flags per group via a `media_settings` structured column on the Room: `images_allowed` (controls image uploads), `files_allowed` (controls document/archive uploads), and `audio_allowed` (reserved for Phase 2, must default to `false` and be schema-present but no UI is required in Phase 1). Each toggle change MUST be reflected for all active members of that group within 5 seconds.
- **FR-013b**: The `media_settings` column MUST be structured to support future addition of new media type flags without requiring a schema migration (e.g., using an extensible key-value structure rather than fixed boolean columns).
- **FR-014**: When a specific media type is disabled for a room, the corresponding attachment control (image picker, file picker) MUST be hidden from regular Users with a tooltip explaining the restriction. Controls for still-enabled media types MUST remain visible and functional.
- **FR-015**: The system MUST enforce file type allowlists server-side; client-side filtering is for UX only and MUST NOT be the sole enforcement mechanism.
- **FR-015b**: Media attachments MUST be stored in a private bucket accessible only via time-limited presigned URLs. Presigned URLs MUST expire after 1 hour. The system MUST generate a fresh presigned URL server-side each time a client requests to render or download an attachment. The Attachment record MUST store only the storage path — never a URL — to ensure expiry is always enforced.

**Role-Based Access**

- **FR-016**: The system MUST enforce three roles: Admin (full access: create/delete rooms, manage members, toggle controls, read all messages, delete any message), Moderator (read all messages in assigned rooms, delete messages; no room settings access), User (send/receive in their rooms only; blind-filtered view).
- **FR-017**: Role permissions MUST be enforced at the database access-control layer (Row-Level Security) as the primary mechanism, not solely at the application layer. A User MUST NOT be able to access Admin or Moderator data by manipulating client requests, and RLS policies MUST ensure this is true even if an application-layer bug exists.
- **FR-018**: An Admin MUST be able to create a new group, set its name and description, and add Users as members from the user directory.
- **FR-019**: An Admin MUST be able to assign or revoke the Moderator role for a specific group without affecting the user's role in other groups.

**Schema Forward-Compatibility**

- **FR-020**: The database schema for messages MUST include a `parent_message_id` field (nullable) to support message threading in Phase 2.
- **FR-021**: The database schema for messages MUST include a `delivery_status` field (nullable enum: sent, delivered, read) to support read receipts in Phase 2.
- **FR-022**: The database schema for rooms MUST include a `room_type` discriminator field supporting at minimum: `direct_message`, `blind_group`, `ticket`, and a reserved `other` value for future use.
- **FR-023**: The system architecture MUST be designed so that adding new room types or message metadata fields does not require breaking changes to existing data structures or active queries.

### Key Entities

- **Room**: Represents any conversation container. Has a type (DM, blind group, ticket), a name (optional for DMs), a `media_settings` structured column holding independent boolean flags (`images_allowed`, `files_allowed`, `audio_allowed`), creation metadata, and soft-delete support. Linked to a set of Participants. Direct Message rooms default to all media flags enabled; Groups default to all flags disabled until Admin explicitly enables each.
- **Participant**: The junction between a User and a Room. Tracks the user's role within that room (Admin, Moderator, Member), join date, and mute status (for future use). Holds a `last_read_position` cursor (reference to the last Message the participant has seen) used both as the initial scroll anchor on conversation open and as the foundation for Phase 2 read-receipt support.
- **Message**: A single communication unit within a Room. Has sender reference, room reference, content (text and/or media attachment), server timestamp, delivery status (nullable, for Phase 2), parent message reference (nullable, for threading), and soft-delete flag.
- **Attachment**: Represents a file or image sent with a message. Stores the original filename, MIME type, storage path (never a URL), and file size. Linked one-to-many to a Message. Access URLs are generated on-demand by the server as 1-hour presigned tokens and are never persisted.
- **Avatar**: A predefined platform-managed avatar. Has an identifier, display name, and storage URL. Users select one; it is stored as a reference on the User profile.
- **UserProfile**: Extends the base authentication identity. Stores display name (shown only to the user themselves and Admins), selected avatar reference, and system role (Admin, Moderator, User at the platform level).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can open their DM with an Admin, send a text message, and see it appear in the conversation in under 2 seconds under normal network conditions.
- **SC-002**: An Admin's broadcast message in a group reaches all active members' screens in under 3 seconds.
- **SC-003**: 100% of role permission rules (blind filtering, media toggle enforcement, moderator restrictions) are enforced correctly across all test scenarios — zero bypasses.
- **SC-004**: A user uploading a 10 MB image in a media-enabled room sees the upload complete and the image appear in the thread in under 10 seconds on a standard broadband connection.
- **SC-005**: The system correctly handles 100 concurrent users active in different rooms without message loss or out-of-order delivery.
- **SC-006**: An Admin toggling media off for a group results in the control being hidden for all active members of that group within 5 seconds.
- **SC-007**: Zero instances of one User's identity (name, avatar, message) being visible to another User in any shared group view, validated through systematic cross-account testing.
- **SC-008**: All Phase 2 schema fields (`parent_message_id`, `delivery_status`, `room_type` enum) are present in the data model and accept valid values without requiring a schema migration in Phase 2.
- **SC-009**: Opening a conversation loads the initial 50 messages in under 1.5 seconds. Each subsequent "load older" cursor-fetch completes in under 1 second under normal network conditions.

---

## Assumptions

- Users are already authenticated via the platform's existing authentication system; this feature does not implement login or registration beyond avatar selection.
- The platform already has a concept of Admin and regular User accounts; the Moderator role is new and will be addable per-room by Admins.
- "Blind group" membership (users cannot see each other) is the default and non-negotiable for all groups — there is no "open group" type in Phase 1.
- Support Ticket rooms (User ↔ Admin, similar to DM but categorized) are user-initiated: a User opens a ticket and Admins respond. Tickets are part of the unified room model and share the DM interface in Phase 1. Admins cannot initiate ticket rooms.
- The predefined avatar set will be curated and uploaded by the platform team before launch; this spec assumes at least 12 avatars will be available at launch.
- Media storage is available as a managed service (private bucket). Direct public access to uploaded files is not permitted. Presigned access URLs are generated server-side with a 1-hour expiry and are never stored in the database — only the storage path is persisted. Clients must request a fresh URL from the server to render any attachment.
- File type validation (allowlist) applies to both images and documents; executable files, scripts, and archives other than ZIP are always blocked.
- Real-time delivery is assumed to operate over a persistent connection mechanism already available in the platform's infrastructure.
- Moderation actions (delete message, mute) take effect immediately for all participants currently viewing the conversation.
- The platform is Arabic-first (RTL); all system messages and UI strings in this feature must be in Arabic.
- Phase 2 will build on Phase 1's schema without destructive migrations; the schema must be treated as a public contract from day one.
