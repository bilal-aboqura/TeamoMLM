# Feature Specification: نظام المحادثة المغلقة — Phase 2 (Advanced Moderation, Voice, Statuses & Activity Log)

**Feature Branch**: `015-chat-phase2-enhanced`  
**Created**: 2026-05-10  
**Status**: Draft  
**Depends On**: `014-blind-chat-system` (Phase 1 — must be fully deployed)  
**Input**: User description: "Build Phase 2 of the Blind Chat System: Blacklist/Word Filter, Voice Messages, Message Statuses (read receipts), Forwarding & Replying (threading), Admin Activity Log."

---

## Clarifications

### Session 2026-05-10

- Q: Which voice recording trigger model should be used — press-and-hold or tap-to-toggle? → A: Tap-to-toggle. User taps the microphone icon once to start recording (timer displayed), taps again to stop and enter preview mode. Separate "إرسال" and "حذف" buttons appear after stopping. No press-and-hold interaction is required.
- Q: Should the blocked message content excerpt be stored in the Activity Log? → A: No — metadata only. The Activity Log entry for a blocked message records only: event type, timestamp, room name, sender display name (admin-visible), and the matched forbidden word. No message content — even partial — is persisted, eliminating storage of harmful content and reducing regulatory surface.
- Q: What is the retention policy for Activity Log events? → A: Tiered retention. `message_sent` events older than 90 days are moved to a cold archive (still queryable, paginated separately). `message_blocked` and `session_event` events are retained indefinitely. This preserves the append-only guarantee while keeping the primary log table performant.
- Q: Should the forward action be available on soft-deleted messages, and can replies to deleted parents be forwarded? → A: Forward button is hidden on soft-deleted messages (no content to forward). Replies whose parent message was deleted remain forwardable — the forwarded copy carries the "الرسالة الأصلية محذوفة" placeholder in the quote block, accurately representing the state of the reference.
- Q: What form of the word is stored and displayed in the Admin blacklist UI? → A: Store both. `word_original` stores the Admin's exact input and is displayed in the UI. `word_normalized` stores the pre-computed normalized form (Arabic diacritic/letter variations resolved, case-folded) used exclusively for matching at send time. No runtime normalization cost is incurred per message.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Admin Defines a Word Filter and a Message Is Blocked (Priority: P1)

An Admin opens the platform's chat moderation settings and adds one or more forbidden words or phrases to the blacklist. When any user attempts to send a message containing a forbidden word, the message is silently blocked before it is stored — the user sees a clear Arabic explanation that their message was not sent due to content policy. The Admin sees a timestamped entry in the Activity Log recording what was blocked, which room it occurred in, and which user attempted to send it (by their admin-visible display name, not exposed to peers).

**Why this priority**: Content safety is the most operationally critical feature. Without it, the platform has no protection against policy violations in the blind group setting, which is legally and reputationally high-risk.

**Independent Test**: Admin adds "كلمة محظورة" to the blacklist. User attempts to send a message containing that phrase. Message does not appear in any conversation. User sees error. Admin Activity Log shows one new blocked-message entry with correct room, user, and timestamp.

**Acceptance Scenarios**:

1. **Given** an Admin has added the word "إهانة" to the blacklist, **When** a user sends a message containing "إهانة", **Then** the message is rejected before storage and the user sees "تم رفض رسالتك بسبب انتهاك سياسة المحتوى".
2. **Given** the blacklist contains "bad" (case-insensitive), **When** a user sends "هذا BAD جداً", **Then** the message is rejected (blacklist matching is case-insensitive).
3. **Given** a message is blocked, **When** the Admin views the Activity Log, **Then** a new entry appears showing: event type "رسالة محظورة", room name, user display name, timestamp, and the matched forbidden word. No message content is shown.
4. **Given** an Admin removes a word from the blacklist, **When** a user sends a message containing that word, **Then** the message is accepted normally.
5. **Given** a message contains no blacklisted words, **When** a user sends it, **Then** it is delivered normally with no delay attributable to the filter check.

---

### User Story 2 — User Records and Sends a Voice Note (Priority: P2)

In any room where `audio_allowed` is true (enabled by Admin per group), a user sees a microphone icon in the message input area. They tap the icon once to begin recording — a running timer and waveform indicator are shown. They tap again to stop recording and enter preview mode, where they can play back the recording, then choose to send or discard it. The voice note is sent as a message and appears as an audio player in the conversation thread.

**Why this priority**: Voice messaging is a high-demand feature for Arabic-speaking users on mobile and significantly improves communication quality in support and group contexts.

**Independent Test**: In a group with `audio_allowed = true`, a user records a 10-second voice note, previews it, sends it. The audio player appears in the thread. Another user (Admin) plays it back. The Admin then sets `audio_allowed = false` — the microphone icon disappears for regular users in that group within 5 seconds.

**Acceptance Scenarios**:

1. **Given** `audio_allowed` is true for a room, **When** a user opens that room, **Then** a microphone icon is visible in the message input area.
2. **Given** a user starts recording, **When** they exceed 2 minutes, **Then** recording stops automatically and the user is prompted to send or discard the clip.
3. **Given** a recorded voice note, **When** the user sends it, **Then** it appears in the conversation as an inline audio player with a duration indicator (e.g., "0:10").
4. **Given** an Admin sets `audio_allowed = false` for a group, **When** a member views that group, **Then** the microphone icon disappears within 5 seconds and recording is blocked server-side.
5. **Given** a voice note exists in a conversation, **When** any participant plays it, **Then** it plays without downloading the full file first (streaming playback).
6. **Given** a user attempts to send a voice note in a room where `audio_allowed` is false, **When** the server receives the request, **Then** the upload is rejected with a clear error regardless of client-side state.

---

### User Story 3 — Message Delivery and Read Statuses Are Visible (Priority: P2)

For messages a user sends in a Direct Message conversation with an Admin, the sender sees a small status indicator beneath their message: a single checkmark ("أُرسلت") when the message has been saved to the system, double checkmark ("وصلت") when the recipient's client has received it, and blue double checkmark ("قُرئت") when the recipient has opened the conversation and scrolled past that message.

**Why this priority**: Delivery confirmation is a fundamental trust signal in any messaging system. It directly leverages the `delivery_status` and `last_read_position` fields already present in the Phase 1 schema, making this a low-migration-cost, high-value feature.

**Independent Test**: User sends a DM to Admin. Status shows single checkmark. Admin's client connects — status updates to double checkmark within 3 seconds. Admin opens the conversation and scrolls to the message — status updates to blue double checkmark within 3 seconds.

**Acceptance Scenarios**:

1. **Given** a user sends a DM, **When** the message is stored in the system, **Then** a single checkmark indicator appears beneath the sent message within 2 seconds.
2. **Given** the recipient's client is active and receives the real-time push, **When** this occurs, **Then** the status updates from "أُرسلت" to "وصلت" (double checkmark) within 3 seconds.
3. **Given** the recipient opens the DM conversation and the message enters their viewport, **When** this occurs, **Then** the status updates to "قُرئت" (blue double checkmark) within 3 seconds.
4. **Given** a message is in a blind group (not a DM), **When** a user views it, **Then** no delivery/read status indicators are shown on group messages — status is DM-only in Phase 2.
5. **Given** a DM conversation has 10 messages, **When** the recipient reads the thread, **Then** all messages that entered their viewport are marked "قُرئت" in a single batch update, not one request per message.

---

### User Story 4 — User Replies to a Specific Message (Priority: P2)

Within any conversation, a user (or Admin/Moderator) can tap a reply icon on a specific message. A quoted preview of the original message appears above the input field. The reply is sent as a new message visually linked to the original by a reference quote. In blind groups, the quoted preview follows the same blind-identity rules — peer user quotes show `"عضو"` as the sender label, not the actual name.

**Why this priority**: Threaded replies are essential for contextual communication in group broadcasts and support tickets, and they surface the already-present `parent_message_id` field from Phase 1 schema.

**Independent Test**: Admin sends a broadcast "هل لديكم أسئلة؟". User taps Reply on that message, types "نعم، لدي سؤال", sends. The new message appears with a quoted block showing the Admin's original text above the user's reply. Another user in the group sees no indication of who sent the reply.

**Acceptance Scenarios**:

1. **Given** a user taps the reply icon on a message, **When** the action is taken, **Then** a quoted preview of the original message appears in the input area showing the sender label and first 100 characters of content.
2. **Given** a user sends a reply, **When** it appears in the thread, **Then** a visual quote block above the reply shows the referenced message (label + excerpt).
3. **Given** User A replies to User B's message in a blind group, **When** User C views the thread, **Then** the quote block shows `"عضو"` as the sender label — not User B's identity.
4. **Given** the original message was deleted (soft-deleted), **When** a reply referencing it is viewed, **Then** the quote block shows `"الرسالة الأصلية محذوفة"` instead of the content.
5. **Given** a user has a reply queued in the input, **When** they press the X to cancel, **Then** the quote preview is cleared and the input returns to normal message mode.

---

### User Story 5 — User or Admin Forwards a Message (Priority: P3)

A user or Admin can forward a message from one conversation to another room they have access to. The forwarded message appears in the destination conversation with a "تم إعادة التوجيه" label. The original sender's identity in the forwarded message follows the same blind-identity rules of the destination room.

**Why this priority**: Forwarding is a usability feature that enables efficient content sharing between Admin and users, and between different rooms, with minimal implementation complexity given the threading infrastructure already built for US4.

**Independent Test**: Admin receives a useful message in one DM. Selects Forward → picks another room → message appears there with "تم إعادة التوجيه" label. Original sender identity respects destination room's blind rules.

**Acceptance Scenarios**:

1. **Given** a user taps the forward icon on a message, **When** the action is taken, **Then** a room picker appears listing only rooms the user has access to.
2. **Given** a user selects a destination room and confirms, **When** the forward is sent, **Then** the message appears in the destination room with a "تم إعادة التوجيه" label above the content.
3. **Given** a forwarded message contains an attachment (image/file/voice note), **When** it appears in the destination, **Then** the attachment is accessible in the destination (re-using the same storage path, not copied).
4. **Given** the forwarder selects a blind group as the destination, **When** the forwarded message arrives, **Then** the original sender label is anonymized according to the destination group's blind-identity rules.
5. **Given** a user has no other accessible rooms, **When** they tap forward, **Then** the room picker shows an empty state with "لا توجد محادثات أخرى متاحة".

---

### User Story 6 — Admin Views the Activity Log (Priority: P2)

A dedicated admin-only view shows a chronological feed of platform chat events: messages sent (by room), messages blocked by the word filter (with matched word and user display name), and user session events (login and logout timestamps with user display name). The Admin can filter the log by event type and date range. The log is append-only and cannot be modified or cleared from the UI.

**Why this priority**: The Activity Log is the audit and moderation backbone of the platform. Without it, Admins cannot monitor for policy violations, investigate complaints, or demonstrate compliance.

**Independent Test**: Admin opens `/admin/chat/activity`. Sees at least: (1) a list of recent messages sent across all rooms, (2) any blocked-message events triggered in US1. Applies filter "رسائل محظورة" — list narrows to blocked events only. Applies date filter — only events in that range are shown. No "clear log" or "delete" control is present anywhere on the page.

**Acceptance Scenarios**:

1. **Given** the Activity Log page is open, **When** a new event occurs (message sent, message blocked, user login), **Then** the event appears in the log within 10 seconds without page refresh.
2. **Given** the Admin applies the "رسائل محظورة" filter, **When** applied, **Then** only blocked-message events are shown.
3. **Given** the Admin sets a date range filter, **When** applied, **Then** only events within that range are shown.
4. **Given** a blocked-message event is in the log, **When** the Admin views it, **Then** it shows: event type, timestamp, room name, user display name, and the matched forbidden word.
5. **Given** the Activity Log page, **When** the Admin looks for a delete or clear button, **Then** no such control exists — the log is read-only.
6. **Given** a user logs in or out of the platform, **When** this occurs, **Then** a session event entry is added to the Activity Log with the user's display name, event type ("تسجيل دخول" / "تسجيل خروج"), and timestamp.

---

### Edge Cases

- What happens when a user sends a message containing a blacklisted word that is also part of a longer legitimate word (e.g., the root of a name)? The system applies whole-word matching by default; Admin can switch a word to substring matching when adding it to the list.
- What happens when a voice note recording fails mid-way due to microphone permission being revoked? The system discards the incomplete recording and shows an Arabic error: "فشل التسجيل، يرجى التحقق من أذونات الميكروفون".
- What happens when a user attempts to forward a message to a room they were removed from between selecting it and confirming? The server rejects the forward with "ليس لديك صلاحية الوصول إلى هذه المحادثة".
- What happens when the recipient of a DM has never opened the conversation (delivery status stuck at "أُرسلت")? The status remains "أُرسلت" indefinitely until the recipient's client connects and receives the message.
- What happens if an audio recording is longer than 2 minutes due to a client-side bypass? The server rejects uploads exceeding 2 minutes (validated by file duration metadata) with a clear error.
- What happens when a reply references a message in a different room? The system must reject cross-room reply references — `parent_message_id` must belong to the same `room_id`.
- What happens when the Activity Log grows very large? Pagination is applied (50 events per page). `message_sent` events older than 90 days are moved to a cold archive table accessible via an "عرض الأرشيف" toggle. `message_blocked` and `session_event` events are never archived or deleted.
- What happens when a blacklisted word is added while a message is in-flight? The check occurs at server receipt; messages already stored before the word was added are not retroactively removed in Phase 2.
- What happens when a user tries to forward a reply whose parent message was deleted? The reply is still forwardable (its own content is intact). The forwarded copy renders the quote block as "الرسالة الأصلية محذوفة", accurately reflecting the state of the deleted parent in the destination room.

---

## Requirements *(mandatory)*

### Functional Requirements

**Word Filter & Moderation**

- **FR-P2-001**: Admins MUST be able to add, edit, and remove forbidden words or phrases from a platform-wide blacklist through a dedicated moderation settings interface.
- **FR-P2-002**: Each blacklist entry MUST support two matching modes: "whole word" (default) and "substring". Admins set the mode per entry when adding it.
- **FR-P2-003**: The system MUST check every outgoing message against the active blacklist at the server level before storing the message. Client-side checks are UX-only.
- **FR-P2-004**: If a message matches the blacklist, it MUST be rejected before storage. The sending user MUST receive the error "تم رفض رسالتك بسبب انتهاك سياسة المحتوى". No other user sees any indication the message was attempted.
- **FR-P2-005**: Blacklist matching MUST be case-insensitive. Normalization of common Arabic letter variations (e.g., أ/ا, ه/ة) MUST be applied at the time the Admin creates or edits a blacklist entry (write-time normalization), producing a pre-computed `word_normalized` value. Matching at message-send time compares the normalized message text against `word_normalized` — no runtime normalization computation per message is required.
- **FR-P2-006**: Every blocked message event MUST create an immutable entry in the Activity Log recording: event type, timestamp, room ID and name, sender display name (admin-visible only), and the matched forbidden word. No message content — including any excerpt or hash — is stored in the log.

**Voice Messages**

- **FR-P2-007**: In rooms where `audio_allowed` is true, users MUST be able to record voice notes up to 2 minutes in duration using a tap-to-toggle interaction: one tap starts recording (timer visible), a second tap stops recording and enters preview mode. No press-and-hold interaction is used.
- **FR-P2-008**: After stopping, the user MUST see a preview player and two controls: "إرسال" (send) and "حذف" (discard). Recording MUST stop automatically at the 2-minute limit and enter preview mode without user action.
- **FR-P2-009**: Voice notes MUST be stored in the same private media storage as other attachments and accessed via the same 1-hour presigned URL mechanism established in Phase 1.
- **FR-P2-010**: Voice notes MUST be rendered as inline audio players in the conversation thread showing duration. Playback MUST begin promptly without requiring full file download (streaming).
- **FR-P2-011**: The server MUST reject voice note uploads where the audio duration exceeds 2 minutes, regardless of client-side enforcement.
- **FR-P2-012**: When `audio_allowed` is toggled to false for a room, the microphone control MUST disappear for users within 5 seconds (same Realtime propagation as other media flags in Phase 1).

**Message Statuses (Read Receipts)**

- **FR-P2-013**: For Direct Message conversations only, sent messages MUST display a delivery status indicator to the sender: single checkmark ("أُرسلت") on storage, double checkmark ("وصلت") on recipient client receipt, blue double checkmark ("قُرئت") on recipient read.
- **FR-P2-014**: The system MUST update `delivery_status` to "delivered" when the recipient's active client subscription receives the real-time message event.
- **FR-P2-015**: The system MUST update `delivery_status` to "read" when the recipient's `last_read_position` cursor advances past the message (i.e., the message has entered the recipient's viewport in an open conversation).
- **FR-P2-016**: Status updates from "delivered" to "read" MUST be batched: all messages visible in the recipient's viewport MUST be marked "read" in a single operation, not one request per message.
- **FR-P2-017**: Delivery status indicators MUST NOT appear on blind group messages — only on DM conversations.

**Replying & Threading**

- **FR-P2-018**: Users MUST be able to reply to any visible message in a conversation by selecting a reply action on that message. The reply MUST reference the original message via the `parent_message_id` field.
- **FR-P2-019**: The reply MUST be displayed in the conversation thread with a visual quoted block above the reply content showing the original sender label and up to 100 characters of the original message.
- **FR-P2-020**: In blind groups, the quoted block MUST apply the same identity rules as the main conversation: peer user senders shown as `"عضو"`, Admin/Moderator senders shown by `display_name`.
- **FR-P2-021**: If the original (parent) message has been soft-deleted, the quoted block MUST display `"الرسالة الأصلية محذوفة"` instead of content.
- **FR-P2-022**: The `parent_message_id` of a reply MUST belong to the same `room_id` — cross-room reply references MUST be rejected server-side.

**Forwarding**

- **FR-P2-023**: Users MUST be able to forward any non-deleted message to any room they are a participant of (excluding the source room). The forward action MUST be hidden (not merely disabled) on soft-deleted messages — no forward button appears when `is_deleted = true`. Replies to soft-deleted parent messages are forwardable; the forwarded copy shows the "الرسالة الأصلية محذوفة" placeholder in the quote block.
- **FR-P2-024**: Forwarded messages MUST appear in the destination room with a "تم إعادة التوجيه" prefix label and the original message content (text and/or attachment reference).
- **FR-P2-025**: Forwarded messages containing attachments MUST reference the original storage path — no file duplication occurs. The 1-hour presigned URL is generated on demand in the destination room context.
- **FR-P2-026**: The identity of the original sender in a forwarded message MUST follow the blind-identity rules of the destination room (peer user senders rendered as `"عضو"` in blind groups).

**Activity Log**

- **FR-P2-027**: A dedicated admin-only Activity Log view MUST display a chronological, paginated (50 events per page) feed of platform-wide chat events. `message_sent` events are retained in the primary log for 90 days, then moved to a cold archive. `message_blocked` and `session_event` events are retained indefinitely.
- **FR-P2-027b**: The Activity Log UI MUST provide a toggle to include or exclude archived (>90 day) `message_sent` events from the view. Archived events are accessible but paginated separately from the active log.
- **FR-P2-028**: The Activity Log MUST capture at minimum three event types: `message_sent` (room, sender display name, timestamp), `message_blocked` (room, sender display name, matched word, message excerpt, timestamp), and `session_event` (user display name, login/logout, timestamp).
- **FR-P2-029**: The Activity Log MUST support filtering by event type and by date range. Filters are applied independently and combinably.
- **FR-P2-030**: The Activity Log MUST be append-only. No delete, clear, or edit controls may exist in the UI or as accessible server actions for any role including Admin.
- **FR-P2-031**: New events MUST appear in the Activity Log without requiring a page refresh (real-time or near-real-time, within 10 seconds of occurrence).

### Key Entities

- **WordFilter**: A single blacklist entry. Has an identifier, `word_original` (the Admin's exact input — displayed in the UI), `word_normalized` (pre-computed normalized form used for matching — never displayed), matching mode (`whole_word` or `substring`), the Admin who created it, and creation timestamp. Immutable after creation except for deletion. On creation, the system auto-populates `word_normalized` from `word_original`.
- **ActivityLogEvent**: An immutable audit record. Has an event type enum (`message_sent`, `message_blocked`, `session_event`), room reference (nullable for session events), actor display name (the user involved), structured payload (JSONB — event-specific fields excluding any message content), and a server-assigned timestamp. For `message_blocked` events, the payload contains only the matched forbidden word — no message content is stored. `message_sent` rows are archived after 90 days; `message_blocked` and `session_event` rows are never archived. Rows are never updated or deleted.
- **VoiceAttachment**: Extends the Phase 1 Attachment concept. Same storage path model but adds audio-specific metadata: duration in seconds, waveform data (optional, for display), MIME type constrained to audio formats.
- **MessageThread**: The logical grouping of a parent message and its direct replies, rendered in the UI. Not a stored entity — derived from `parent_message_id` relationships on `chat_messages`.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-P2-001**: A message containing a blacklisted word is rejected and logged within 500 milliseconds of the send attempt, with no storage of the rejected content.
- **SC-P2-002**: 100% of blacklisted-word-blocked events appear in the Activity Log — zero silent failures.
- **SC-P2-003**: A user can record, preview, and send a voice note within 30 seconds of tapping the microphone icon under normal conditions.
- **SC-P2-004**: Voice note playback begins within 2 seconds of tapping play on a standard broadband connection.
- **SC-P2-005**: Message delivery status transitions from "أُرسلت" → "وصلت" within 3 seconds of the recipient's client connecting and receiving the Realtime event.
- **SC-P2-006**: Message delivery status transitions from "وصلت" → "قُرئت" within 3 seconds of the recipient's viewport scrolling to the message.
- **SC-P2-007**: All messages visible in the recipient's viewport at the time of reading are batched into a single "read" status update — the system does not issue more than one update per viewport-scroll event.
- **SC-P2-008**: A reply message with correct `parent_message_id` reference and visual quote block is deliverable end-to-end in under 3 seconds.
- **SC-P2-009**: Zero instances of peer-user identity exposed in reply quote blocks within blind groups, verified by cross-account testing.
- **SC-P2-010**: The Activity Log renders up to 50 events per page in under 2 seconds. New events appear without page refresh within 10 seconds of occurrence.
- **SC-P2-011**: The Activity Log cannot be cleared or modified by any user role — verified by attempting DELETE/UPDATE operations as Admin, Moderator, and User roles.

---

## Assumptions

- Phase 1 (`014-blind-chat-system`) is fully deployed and its schema is live. The `delivery_status`, `parent_message_id`, `last_read_position`, and `audio_allowed` fields in Phase 1 are already present and accepting values.
- The word blacklist is platform-wide (applies across all rooms and room types). Per-room blacklists are out of scope for Phase 2.
- Voice notes are audio-only (no video). Supported formats are WebM/Opus (browser recording standard) and M4A/AAC (iOS). The server accepts both.
- Message read receipts ("قُرئت") are implemented only for Direct Message rooms in Phase 2. Group-level read receipts are deferred to a potential Phase 3.
- Forwarding is available to all participants (Users, Admins, Moderators) but users can only forward to rooms they are active participants of.
- The Activity Log captures events from the moment Phase 2 is deployed; historical Phase 1 events are not retroactively backfilled.
- `message_sent` Activity Log events older than 90 days are moved to a cold archive (a separate table or partition). `message_blocked` and `session_event` events are retained indefinitely. Archival is a background job — it does not constitute deletion and preserves the append-only guarantee.
- Session events (login/logout) for the Activity Log are captured via a platform-level authentication hook, not per-chat. If the auth system does not support hooks, session events are deferred to Phase 3 and the remaining two event types still apply.
- Blacklist normalization targets Arabic script only. Latin-character normalization (e.g., case-folding) is also applied but dialect transliteration equivalence is out of scope.
- The Activity Log is visible only to users with `global_role = 'admin'`. Moderators do not have access.
- Forwarding does not create a new storage copy of attachments. The destination room participants access the same storage object via on-demand presigned URLs, subject to their own room RLS.
- Voice note waveform visualization is a progressive enhancement — the audio player must function without waveform data; waveform display is added only if the browser API provides it without additional server computation.
