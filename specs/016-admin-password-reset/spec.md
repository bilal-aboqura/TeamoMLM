# Feature Specification: Admin Force Password Reset

**Feature Branch**: `016-admin-password-reset`  
**Created**: 2026-05-16  
**Status**: Draft  
**Input**: User description: "Add an Admin Force Password Reset feature to the Admin Dashboard. The Admin needs the ability to manually change any user's password directly from the Admin UI without requiring the user's current password or an email/SMS loop."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin Resets A User Password (Priority: P1)

An administrator can open user management, choose a specific user, enter a new password, confirm the action, and complete the password reset immediately without involving the user.

**Why this priority**: This is the core support and account recovery workflow requested for administrators.

**Independent Test**: Can be fully tested by signing in as an administrator, resetting a selected user's password, and verifying the user can sign in with the new password.

**Acceptance Scenarios**:

1. **Given** an authenticated administrator is viewing the user list, **When** they choose "تغيير كلمة المرور" for a user, enter a valid new password, and confirm, **Then** the user's password is changed and a success message is shown.
2. **Given** an authenticated administrator is resetting a password, **When** the new password is invalid or missing, **Then** the reset is not submitted and the administrator sees a clear validation message.

---

### User Story 2 - Non-Admins Cannot Reset Passwords (Priority: P1)

Only administrators can perform forced password resets; non-admin users cannot invoke the workflow or complete the reset.

**Why this priority**: Password reset authority is highly sensitive and must be restricted to trusted administrators.

**Independent Test**: Can be fully tested by attempting the reset workflow as a non-admin account and verifying the password remains unchanged.

**Acceptance Scenarios**:

1. **Given** a non-admin user is authenticated, **When** they attempt to reset another user's password, **Then** the reset is denied and no password change occurs.
2. **Given** an unauthenticated visitor attempts the reset, **When** the request is processed, **Then** the reset is denied and no password change occurs.

### Edge Cases

- The selected user no longer exists when the administrator confirms the reset.
- The new password does not meet password length or strength requirements.
- The administrator submits the reset multiple times while the first request is still pending.
- The reset service rejects the password change after the administrator passes local validation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide administrators with a visible "تغيير كلمة المرور" action for each manageable user in the admin user-management experience.
- **FR-002**: The system MUST let administrators enter and confirm a new password before submitting a forced reset.
- **FR-003**: The system MUST validate that the new password is present and meets the existing password policy before attempting the reset.
- **FR-004**: The system MUST require the caller to be an administrator before any forced password reset is executed.
- **FR-005**: The system MUST change the target user's password without requiring the user's current password or an email/SMS confirmation loop.
- **FR-006**: The system MUST show the administrator the success message "تم تغيير كلمة المرور بنجاح" after a completed reset.
- **FR-007**: The system MUST show a clear error message when the reset cannot be completed.
- **FR-008**: The system MUST prevent duplicate submissions while a reset request is pending.

### Key Entities

- **Administrator**: A privileged user allowed to manage other users and perform forced password resets.
- **Managed User**: The account whose password may be changed by an administrator.
- **Password Reset Request**: The administrator-initiated action containing the selected user and replacement password.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Administrators can complete a password reset for a selected user in under 60 seconds.
- **SC-002**: 100% of non-admin forced password reset attempts are denied.
- **SC-003**: 95% of valid reset attempts show a clear success or failure result within 5 seconds.
- **SC-004**: Support staff can recover locked-out users without requiring user email or SMS access.

## Assumptions

- Existing admin authentication and role assignment remain the source of truth for determining who is an administrator.
- The existing password policy applies to administrator-forced password changes.
- The reset action belongs in the existing admin user-management flow.
