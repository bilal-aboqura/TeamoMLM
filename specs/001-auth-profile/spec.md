# Feature Specification: Authentication and Basic Profile

**Feature Branch**: `001-auth-profile`
**Created**: 2026-04-02
**Status**: Draft
**Input**: User description: "Build the Authentication and Basic Profile module for our platform."

---

## Clarifications

### Session 2026-04-02

- Q: After how many consecutive failed login attempts should the system apply a protection measure, and what should that measure be? → A: 5 failed attempts trigger a 15-minute automatic cooldown; the account auto-resets after the cooldown period without admin intervention.
- Q: How long should a user's authenticated session remain valid before it expires and forces a re-login? → A: 7-day sliding window — the session is refreshed on each authenticated request and expires 7 days after the last activity.
- Q: Should the registration page support URL-based referral links that auto-populate the Referral Code field? → A: Yes — a `?ref=CODE` query parameter auto-fills the Referral Code field on page load; the field remains editable by the user.
- Q: What should the system-generated referral code look like? → A: 8 characters, uppercase letters and digits only, excluding ambiguous characters (`0`, `O`, `I`, `l`, `1`) to prevent confusion when shared verbally or in screenshots.
- Q: What is the platform's ledger/display currency for user balances? → A: USD — all balances are stored and displayed in US Dollars, formatted as `$0.00`.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - New User Registration with Referral Code Validation (Priority: P1)

A prospective user arrives at the platform and wants to create an account. They must provide their Full Name, Phone Number, Password, and a Referral Code (كود الإحالة). The system validates that the Referral Code belongs to an existing active user before creating the new account and linking the two users in the MLM hierarchy. If the code is invalid or does not exist, registration is rejected immediately with a clear Arabic error message.

**Why this priority**: Registration is the gateway to the entire platform. Without it, no user can access any feature. The mandatory referral code enforcement is the foundation of the MLM business model — bypassing it would corrupt the entire earning and commission structure.

**Independent Test**: Can be fully tested by visiting the registration page, submitting valid and invalid referral codes, and verifying whether accounts are created or rejected accordingly, delivering a fully functional onboarding gate.

**Acceptance Scenarios**:

1. **Given** a visitor is on the registration page, **When** they submit a Full Name, valid Phone Number, Password, and a Referral Code that matches an existing active user in the system, **Then** a new account is created, the new user is linked to the referring user in the hierarchy, and the user is redirected to their dashboard.
2. **Given** a visitor is on the registration page, **When** they submit all fields but enter a Referral Code that does not match any user in the system, **Then** the registration is rejected, no account is created, and an Arabic error message is displayed: "كود الإحالة غير صحيح".
3. **Given** a visitor is on the registration page, **When** they submit all fields but leave the Referral Code field empty, **Then** the form fails validation immediately, no submission is made to the server, and the Referral Code field shows a required-field error in Arabic: "كود الإحالة مطلوب".
4. **Given** a visitor attempts to register with a Phone Number already linked to an existing account, **When** they submit the form, **Then** the registration is rejected with a clear Arabic error: "رقم الهاتف مستخدم بالفعل".
5. **Given** a visitor is on the registration page, **When** they submit a Password that is too short (under 8 characters), **Then** the form fails validation and shows a clear Arabic error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل".

---

### User Story 2 - Returning User Login (Priority: P1)

A registered user opens the platform and wants to log in to access their account. They enter their Phone Number and Password. On success, they are taken to their personal dashboard. On failure, they receive a clear Arabic error without revealing which field was incorrect (to prevent account enumeration).

**Why this priority**: Login parity with registration — without it, registered users are locked out. Both stories together define the complete auth boundary.

**Independent Test**: Can be fully tested by logging in with valid credentials and verifying dashboard access, and by attempting login with invalid credentials to verify rejection, without any other feature being built.

**Acceptance Scenarios**:

1. **Given** a registered user is on the login page, **When** they enter their correct Phone Number and Password and submit, **Then** they are authenticated and redirected to their personal dashboard.
2. **Given** a registered user is on the login page, **When** they enter a correct Phone Number but an incorrect Password, **Then** login is rejected with a generic Arabic error: "رقم الهاتف أو كلمة المرور غير صحيحة", and no hint is given about which field is wrong.
3. **Given** an unregistered phone number is entered on the login page with any password, **When** submitted, **Then** the same generic Arabic error is shown: "رقم الهاتف أو كلمة المرور غير صحيحة".
4. **Given** an authenticated user whose session is still valid visits the login page, **When** the page loads, **Then** they are automatically redirected to the dashboard without being shown the login form.

---

### User Story 3 - Personal Dashboard View After Login (Priority: P2)

After logging in, the user lands on their personal dashboard — mobile-first, RTL Arabic. The dashboard displays a premium balance card with their Available Balance (defaults to $0.00) and Total Earned (defaults to $0.00), their current subscription package status (defaults to "غير مفعّل" / Inactive), and a Referral Tool section showing their unique Referral Code with a one-click copy button.

**Why this priority**: The dashboard is the first thing every user sees post-login. Its content (balances, package status, referral code) is the core user value proposition and the primary motivator for user engagement and referrals.

**Independent Test**: Can be fully tested with a freshly created account (no deposits or packages yet) and verifying all default values are displayed correctly, the referral code is shown, and the copy button works — all without any financial or package features being implemented.

**Acceptance Scenarios**:

1. **Given** a logged-in user with a new account (no deposits, no package), **When** they land on the dashboard, **Then** they see an Available Balance of "$0.00", a Total Earned of "$0.00", and a package status of "غير مفعّل".
2. **Given** a logged-in user on the dashboard, **When** they look at the Referral Tool section, **Then** they can see their unique Referral Code displayed clearly and a "نسخ" (Copy) button next to it.
3. **Given** a logged-in user on the dashboard, **When** they tap or click the "نسخ" button next to their Referral Code, **Then** the code is copied to their clipboard and a brief success confirmation appears (e.g., "تم النسخ!" tooltip or toast).
4. **Given** a logged-in user on the dashboard, **When** the page loads on a mobile device, **Then** the layout is fully responsive, RTL-aligned, and all content is accessible without horizontal scrolling.

---

### User Story 4 - Secure Session Management & Logout (Priority: P3)

Once logged in, the user's session persists across page reloads and browser tabs. The user can log out, which terminates their session and redirects them to the login page. Unauthenticated users attempting to access the dashboard are redirected to login.

**Why this priority**: Core security hygiene. Without session persistence, users would be constantly logged out; without logout, users cannot securely exit from shared devices.

**Independent Test**: Can be fully tested by logging in, reloading the page, and verifying the session persists; then logging out and verifying the redirect to login and inability to access the dashboard.

**Acceptance Scenarios**:

1. **Given** a user is logged in, **When** they reload the page or open a new tab to the dashboard URL, **Then** they remain authenticated and see the dashboard without being prompted to log in again.
2. **Given** a logged-in user on the dashboard, **When** they click the logout button/action, **Then** their session is terminated and they are immediately redirected to the login page.
3. **Given** an unauthenticated user who attempts to directly navigate to the dashboard URL, **When** the page loads, **Then** they are immediately redirected to the login page.

---

### Edge Cases

- What happens when a user registers with a phone number that has leading/trailing spaces? The system must normalize (trim) phone input before validation and storage.
- What happens if two users attempt to register with the same phone number simultaneously? The system must use a unique constraint at the database level and handle the conflict gracefully, returning an Arabic error.
- What happens if the Referral Code's owner account has been deactivated or suspended? The system should reject registration with the same "كود الإحالة غير صحيح" message (to avoid leaking account status information).
- What happens when the user's session token expires while they are on the dashboard? The user should be gracefully redirected to the login page with a soft Arabic message: "انتهت جلستك، يرجى تسجيل الدخول مجدداً".
- What happens if a user's clipboard access is blocked by the browser when they click the copy button? A fallback should display the code in a selectable text field so the user can manually copy it.
- What if the user enters an extremely long phone number or name? Input length limits must be enforced both on the client (UX feedback) and server (security control).

---

## Requirements *(mandatory)*

### Functional Requirements

**Registration**

- **FR-001**: The registration form MUST include exactly four fields: Full Name (الاسم الكامل), Phone Number (رقم الهاتف), Password (كلمة المرور), and Referral Code (كود الإحالة). All four fields are mandatory.
- **FR-002**: The system MUST validate the Referral Code server-side against the existing user base before creating any new record. If the code does not match an active user, the registration MUST be rejected with the Arabic error: "كود الإحالة غير صحيح".
- **FR-003**: The system MUST reject registration if the Phone Number is already associated with an existing account, returning the Arabic error: "رقم الهاتف مستخدم بالفعل".
- **FR-004**: The system MUST enforce a minimum password length of 8 characters. Passwords below this threshold MUST trigger a validation error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل".
- **FR-005**: Upon successful registration, the new user MUST be linked to the referring user (identified by the Referral Code) in the system's MLM hierarchy, establishing a parent-child relationship.
- **FR-006**: The system MUST automatically generate a unique Referral Code for every newly created user account at registration time. The code MUST be exactly 8 characters long, composed exclusively of uppercase Latin letters (A–Z) and digits (2–9), explicitly excluding the ambiguous characters `0`, `O`, `I`, `l`, and `1`. The code MUST be guaranteed unique across all existing user accounts before being assigned.
- **FR-007**: Every new user account MUST be created with the following default values: Available Balance = $0.00 USD, Total Earned = $0.00 USD, Package Status = "Inactive" (غير مفعّل).
- **FR-008**: Phone numbers MUST be normalized (trimmed of whitespace) before validation or storage.
- **FR-029**: The registration page MUST read a `?ref=CODE` query parameter from the URL on page load and, if present, auto-populate the Referral Code (كود الإحالة) field with that value. The pre-filled value MUST remain editable by the user. If no query parameter is present, the field starts empty.

**Login**

- **FR-009**: The login form MUST accept exactly two fields: Phone Number and Password. Both are mandatory.
- **FR-010**: The system MUST reject login with an incorrect phone/password combination using the generic Arabic message: "رقم الهاتف أو كلمة المرور غير صحيحة", without disclosing which field is wrong.
- **FR-011**: Upon successful login, the system MUST establish an authenticated session and redirect the user to their dashboard.
- **FR-012**: Authenticated users who visit the login or registration page MUST be automatically redirected to the dashboard.

**Dashboard**

- **FR-013**: The user dashboard MUST display the user's Available Balance in USD, formatted as `$` followed by a two-decimal-place number (e.g., `$12.50`). The `$` symbol MUST appear to the left of the number regardless of RTL layout direction.
- **FR-014**: The user dashboard MUST display the user's Total Earned in USD, formatted identically to the Available Balance (`$0.00` style).
- **FR-030**: All monetary amounts on the platform MUST use USD as the single ledger and display currency. No currency conversion or dual-currency display is required.
- **FR-015**: The user dashboard MUST display the user's current Package Status. When no package is active, the status MUST read "غير مفعّل".
- **FR-016**: The user dashboard MUST display the user's unique Referral Code in a clearly visible section dedicated to the "Referral Tool".
- **FR-017**: The Referral Tool section MUST include a one-click copy button (labelled "نسخ") that copies the Referral Code to the user's clipboard. A brief visual confirmation (e.g., "تم النسخ!") MUST appear upon successful copy.
- **FR-018**: If clipboard access is unavailable, the system MUST fall back to displaying the code in a selectable text input so the user can copy manually.

**Session & Security**

- **FR-019**: Authenticated user sessions MUST persist across page reloads and new browser tabs using a 7-day sliding window. The session expiry timer MUST be reset on each successful authenticated request. A session that has seen no activity for 7 consecutive days MUST be invalidated automatically.
- **FR-020**: The system MUST provide a logout mechanism. Upon logout, the session MUST be fully invalidated and the user MUST be redirected to the login page.
- **FR-021**: Any unauthenticated request to a protected dashboard route MUST be redirected to the login page.
- **FR-022**: All user-supplied input (names, phone numbers, passwords, referral codes) MUST be validated server-side before any database write. Client-side validation is complementary, not the authority.
- **FR-023**: Session expiry MUST result in graceful redirection to login with the Arabic message: "انتهت جلستك، يرجى تسجيل الدخول مجدداً".
- **FR-028**: After 5 consecutive failed login attempts from the same account, the system MUST apply a 15-minute automatic cooldown. During the cooldown period, all login attempts for that account MUST be rejected immediately with an Arabic message: "تم تجاوز عدد المحاولات المسموح بها. يرجى المحاولة بعد 15 دقيقة." The cooldown resets automatically after 15 minutes without admin intervention.

**UI & Accessibility**

- **FR-024**: All user-facing text, labels, error messages, and UI copy MUST be in Arabic.
- **FR-025**: The entire interface MUST be RTL-aligned (`dir="rtl"`). No directional utilities (left/right) may override core RTL layout.
- **FR-026**: All interactive elements (buttons, inputs, links) MUST have Arabic ARIA labels for accessibility.
- **FR-027**: The dashboard MUST be mobile-first and fully usable without horizontal scrolling on standard mobile widths (≥ 320px).

### Key Entities

- **User**: Represents a registered platform member. Key attributes: unique ID, full name, phone number (unique), hashed password, unique referral code, referrer ID (foreign key to another User — the one whose referral code was used at registration), role (always `'user'` for regular accounts), available balance, total earned, package status, account status (active/suspended), created at, updated at.
- **Session**: Represents an authenticated session for a User. Managed by the authentication system; tied to a User ID with an expiry timestamp.
- **MLM Hierarchy Node**: The referrer-to-new-user link established at registration. Represented by the `referrer_id` foreign key on the User entity, creating a tree structure.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can complete the full registration flow — from landing on the registration page to reaching their dashboard — in under 2 minutes under normal network conditions.
- **SC-002**: An invalid referral code is rejected within 1 second of form submission, with the Arabic error message displayed in the same view without a full page reload.
- **SC-003**: 100% of registration attempts with a non-existent or invalid referral code MUST be rejected. Zero accounts must ever be created without a valid referral link (excluding any designated "root" seed accounts created by admins directly).
- **SC-004**: A returning user can log in and reach their dashboard in under 30 seconds, assuming they recall their credentials.
- **SC-005**: The one-click referral code copy succeeds on 95% of attempts across modern mobile browsers (iOS Safari, Android Chrome), confirmed by the visual "تم النسخ!" confirmation appearing.
- **SC-006**: The dashboard loads all visible content (balances, package status, referral code) in under 3 seconds on a standard mobile connection.
- **SC-007**: 100% of unauthenticated requests to protected routes result in a redirect to the login page — no protected data is ever served to unauthenticated users.
- **SC-008**: All error messages displayed to users are in Arabic; zero English-language error strings are exposed in the UI.
- **SC-009**: A session inactive for exactly 7 days is automatically invalidated; a session with activity within the past 7 days remains valid without requiring re-login.

---

## Assumptions

- A "root" or "seed" user account will be created directly by the platform admin (outside the normal registration flow) to bootstrap the MLM tree. This admin-created account will have no referrer and will serve as the ancestor for all first-generation users.
- The platform is Arabic-only for regular users. No internationalization (i18n) or language switcher is required within this module.
- Phone numbers follow a single regional format (e.g., local Arabic market format). International phone number parsing/formatting is out of scope for this module.
- The Referral Code format is system-generated: exactly 8 uppercase alphanumeric characters (A–Z, 2–9), excluding ambiguous characters (`0`, `O`, `I`, `l`, `1`). Users cannot choose their own referral code.
- Email address is not used for authentication or communication in this platform; Phone Number is the sole identifier.
- Password recovery/reset flow (e.g., "forgot password" via SMS OTP) is out of scope for this module and will be addressed in a separate feature.
- The dashboard shown in this spec is the "Basic Profile" view. More complex dashboard sections (task lists, financial wallet, package upgrade UI) are governed by separate feature modules.
- The platform will be accessed primarily via mobile web browsers; a native app is out of scope.
- Admin account creation and the admin dashboard are out of scope for this module.
