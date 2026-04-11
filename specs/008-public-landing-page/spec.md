# Feature Specification: Landing Page & Shared Public UI (Module 008)

**Feature Branch**: `008-public-landing-page`  
**Created**: 2026-04-07  
**Status**: Draft  
**Input**: User description: "Build the Landing Page & Shared Public UI (Module 008). This is the public face of the platform at the root route `/`. Features required: Public Layout (Navbar, Footer), Hero Section, Features Overview, Packages Preview."

---

## Clarifications

### Session 2026-04-07

- Q: If live package data cannot be fetched (RLS not configured, network failure, DB unavailable), what is the acceptable fallback behavior? → A: Show hardcoded static package data as fallback if live fetch fails.
- Q: What visual treatment should the Hero section use? → A: Typographic hero with abstract CSS gradient/glow decorative background (animated subtle shapes or orbs).
- Q: When should the Navbar glassmorphic blur effect activate? → A: Transparent/minimal over the Hero, transitions to glassmorphic (bg-white/80 + backdrop-blur) after scrolling ~50–80px.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — First-Time Visitor Discovers the Platform (Priority: P1)

An anonymous Arabic-speaking user lands on the root URL `/` for the first time. They are immediately presented with a premium, fully bilingual-ready (RTL Arabic) landing page that communicates the platform's value proposition clearly. Within seconds, they understand what the platform offers and are guided toward registering.

**Why this priority**: This is the conversion entry point. Every user registration begins here. A poor first impression directly reduces registration rates, making this the highest-value page in the system.

**Independent Test**: Can be fully tested by navigating to `/` as an unauthenticated user and verifying that all four sections (Navbar, Hero, Features, Packages) render correctly with proper Arabic RTL layout and that both CTA buttons link to `/register` and `/login`.

**Acceptance Scenarios**:

1. **Given** a visitor navigates to `/`, **When** the page loads, **Then** a fully styled public layout appears with a Navbar (logo + Login CTA + Register CTA), a Hero section with Arabic headline, a Features section with 3–4 cards, a Packages preview section, and a Footer — all rendered right-to-left.
2. **Given** a visitor is on the landing page, **When** they click the primary CTA ("سجّل الآن"), **Then** they are navigated to `/register`.
3. **Given** a visitor is on the landing page, **When** they click the secondary CTA ("تسجيل الدخول"), **Then** they are navigated to `/login`.
4. **Given** a visitor is on the landing page, **When** they click the Navbar's "تسجيل الدخول" link, **Then** they are navigated to `/login`.
5. **Given** a visitor is on the landing page, **When** they click the Navbar's "إنشاء حساب" button, **Then** they are navigated to `/register`.

---

### User Story 2 — Visitor Evaluates the Platform Value (Priority: P2)

A potential user, still undecided, scrolls through the page to understand the platform's features and earning potential. They read about the 6-level referral system, daily tasks, and fast withdrawals. They also see the Packages Preview section showing Free and Paid VIP tiers with ROI details, which helps them understand the earning model without needing to register.

**Why this priority**: Conversion requires trust. Users who understand the earning mechanics before registering are more likely to complete onboarding and subscribe to a paid package. The Packages Preview directly impacts monetization.

**Independent Test**: Can be tested by verifying that the Features section displays 3–4 distinct benefit cards with Arabic titles and descriptions, and that the Packages Preview section renders at least 2 package tiers (Free + at least one Paid) with their key details (name, price, daily tasks count, total ROI) all visible without requiring login.

**Acceptance Scenarios**:

1. **Given** a visitor scrolls to the Features section, **When** the section is visible, **Then** 3–4 premium feature cards are displayed, each with an icon, an Arabic title, and a short Arabic description highlighting platform benefits (e.g., daily tasks, referral system, safe withdrawals).
2. **Given** a visitor scrolls to the Packages Preview section, **When** the section is visible, **Then** all available packages (Free tier + Paid VIP tiers) are displayed in a read-only grid showing package name, price/deposit, daily task count, and total ROI percentage.
3. **Given** a visitor views a package card in the Packages Preview, **When** they attempt to interact with it, **Then** the card is purely informational — no purchase/subscription action is available; a CTA is shown prompting them to register to get started.

---

### User Story 3 — Returning Visitor Navigates Directly to Auth (Priority: P3)

A returning user who previously visited the platform navigates back to `/` and quickly uses the Navbar links to go directly to the login page without needing to scroll to the Hero section's CTAs.

**Why this priority**: Usability for returning visitors reduces friction and improves re-engagement. The Navbar must be always accessible and clear.

**Independent Test**: Can be tested by verifying the Navbar is sticky/fixed on scroll and that Login and Register links are always visible and functional at any scroll position.

**Acceptance Scenarios**:

1. **Given** a visitor has scrolled down the page, **When** the Navbar is visible (sticky), **Then** the Login and Register links remain accessible and functional at the top of the viewport.
2. **Given** a visitor is on any screen size (mobile/desktop), **When** they view the Navbar, **Then** the logo, Login link, and Register button are all clearly visible and properly styled.

---

### User Story 4 — Mobile User Experiences the Full Landing Page (Priority: P3)

An Arabic-speaking user on a mobile device visits the landing page. The layout is mobile-first, all text is correctly displayed right-to-left, touch targets are appropriately sized, and the bottom navigation or mobile Navbar adapts correctly for small screens.

**Why this priority**: The majority of the target audience accesses the platform via mobile. A broken mobile layout directly impacts acquisition.

**Independent Test**: Can be tested by resizing to a 390px viewport and verifying that no horizontal overflow occurs, all text is legible, and all CTA buttons are tappable with adequate spacing.

**Acceptance Scenarios**:

1. **Given** a user views the landing page on a mobile device (< 768px), **When** the page renders, **Then** all sections stack vertically, no horizontal scrollbar appears, and text remains legible in RTL Arabic.
2. **Given** a user on mobile views the Packages section, **When** the section renders, **Then** package cards display in a single-column layout with full readability.
3. **Given** a user on desktop (≥ 1024px) views the Packages section, **When** the section renders, **Then** package cards display in a 3-column grid layout.

---

### Edge Cases

- What happens when the packages data is unavailable or takes time to load? → The Packages section must show a graceful loading state (skeleton UI) or a friendly error message, never a blank/broken section.
- What happens if the user is already authenticated and navigates to `/`? → The system should redirect authenticated users to `/dashboard` instead of showing the landing page, preventing confusion.
- What happens on very slow network connections? → Above-the-fold content (Navbar + Hero) must be prioritized and visible within 3 seconds even on slow connections.
- What happens when the browser language preference is not Arabic? → The page renders in Arabic regardless, as the platform is Arabic-language-only.
- What happens if a user clicks a package's "Register to Start" CTA? → They are directed to `/register`, maintaining the referral code parameter in the URL if one is present (e.g., `/register?ref=XYZ`).

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST display a fully rendered landing page at the root route `/` accessible to all unauthenticated visitors without requiring login.
- **FR-002**: The system MUST redirect authenticated users away from `/` to their dashboard, preventing authenticated users from seeing the public landing page.
- **FR-003**: The public Navbar MUST display the platform logo, a "تسجيل الدخول" (Login) link, and an "إنشاء حساب" (Register) button, all in RTL order.
- **FR-004**: The public Navbar MUST remain visible (sticky/fixed) as the user scrolls down the page. It MUST start transparent (no background, no border) when positioned over the Hero section, and MUST transition to a glassmorphic style (`bg-white/80 backdrop-blur-md border-b border-slate-200/50`) once the user scrolls past a threshold of approximately 50–80px. The transition MUST be smooth (CSS transition, not instant snap).
- **FR-005**: The Hero section MUST display an Arabic primary headline (e.g., "ابدأ رحلة أرباحك اليوم"), a supporting subheadline explaining the MLM/tasks earning concept, a primary CTA button linking to `/register`, and a secondary CTA button linking to `/login`. The Hero background MUST use an abstract CSS gradient/glow treatment — specifically, a dark slate gradient base (matching the platform palette) with subtle animated emerald-toned decorative elements (e.g., soft glowing orbs or radial gradients) rendered purely via CSS with no external image assets.
- **FR-006**: The Features Overview section MUST display exactly 3–4 cards, each containing a thematic icon, an Arabic title, and a 1–2 sentence Arabic description. Required topics: daily tasks (المهام اليومية), 6-level referral system (نظام إحالة من 6 مستويات), fast and secure withdrawals (سحوبات سريعة وآمنة), and optionally premium VIP packages (باقات VIP حصرية).
- **FR-007**: The Packages Preview section MUST display all available subscription tiers (Free + Paid) in a read-only grid showing each package's name, deposit amount, daily task count, and total ROI. No purchase action is available on this page.
- **FR-008**: Each package card in the Packages Preview MUST include a CTA that directs visitors to `/register` to get started. If a referral code is present in the page URL, it MUST be preserved in the redirect URL.
- **FR-009**: The public Footer MUST display the platform name/logo, copyright text, and relevant links (Privacy Policy, Terms of Service, Contact).
- **FR-010**: All text, layout, and navigation on the landing page MUST be rendered strictly right-to-left (RTL) using logical CSS properties (start/end, ps/pe, ms/me) exclusively — no physical directional properties (left/right, ml/mr, pl/pr) are permitted.
- **FR-011**: All shadow styles used on the landing page MUST be restricted to the defined soft shadow utilities: `shadow-[0_4px_20px_rgba(0,0,0,0.02)]` and `shadow-[0_2px_10px_rgba(0,0,0,0.02)]` — no other shadow variants are permitted.
- **FR-012**: The landing page MUST be fully responsive and function correctly on mobile (≥ 320px), tablet (≥ 768px), and desktop (≥ 1024px) viewports.
- **FR-013**: The Packages Preview section MUST display a graceful loading state while package data is being fetched. If the live fetch fails for any reason (network error, database unavailability, RLS misconfiguration), the section MUST silently fall back to displaying a hardcoded static package list that mirrors the seed data — the Packages section must never render as empty or broken on the landing page.

### Key Entities

- **Package (Public View)**: A read-only representation of a subscription tier visible on the landing page. Key attributes: name (Arabic), price/deposit amount, daily task count, total ROI percentage, badge/tier indicator (Free vs. VIP). No write operations.
- **Public Navbar**: A site-wide shared component displayed on all public-facing pages. Contains: logo, login link, register button. Sticky behavior with scroll-aware styling.
- **Public Footer**: A site-wide shared component at the bottom of all public pages. Contains: branding, copyright, and policy links.
- **Hero Section**: The above-the-fold section of the landing page. Contains: Arabic headline, Arabic subheadline, primary CTA, secondary CTA, and a purely CSS-based decorative background (dark slate gradient with subtle animated emerald glow orbs). No external image assets are used in the Hero.
- **Features Card**: A presentational component showing a platform benefit. Contains: icon, Arabic title, Arabic description.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Visitors can understand the platform's core value proposition (what it does and how they earn) within 10 seconds of landing on the page, as validated by user testing with first-time Arabic-speaking users.
- **SC-002**: The landing page loads all above-the-fold content (Navbar + Hero) and is interactive within 3 seconds on a standard mobile connection.
- **SC-003**: 100% of all interactive CTA elements (Navbar links, Hero buttons, Package card CTAs) navigate to the correct target routes (`/register` or `/login`).
- **SC-004**: The page renders without any horizontal overflow or layout breakage on all screen sizes from 320px to 2560px width.
- **SC-005**: All text and layout elements on the page are rendered in correct RTL orientation with no mixed-direction visual artifacts.
- **SC-006**: The Packages Preview section displays current, accurate package data (at least 2 tiers) with no blank or broken states under normal network conditions.
- **SC-007**: Authenticated users who navigate to `/` are redirected to the dashboard within 1 second, without seeing the landing page content.
- **SC-008**: The Packages section displays a loading skeleton and then populates within 2 seconds under normal network conditions.

---

## Assumptions

- The platform is Arabic-language-only; no internationalization or language toggle is required on the landing page.
- Package data (names, prices, ROI, task counts) is fetched from the existing database that powers the authenticated packages view — the same package definitions are reused for the public preview, with no additional data model changes needed.
- The landing page is a public-facing marketing page and does not require authentication; anonymous reads on the packages table are preferred for live data. However, if RLS does not permit anonymous reads or the fetch fails, a hardcoded static fallback package list (matching seed data) is always shown — the section is never empty or broken.
- The platform logo/branding assets are already available in the codebase or will be provided before implementation.
- The referral code mechanism (for preserving `?ref=` query parameters through to the register page) follows the same pattern already established in the auth module (Module 001).
- Mobile-first layout is the default; the design expands upward for tablet and desktop breakpoints.
- The Navbar does not include a hamburger/mobile menu in v1; on mobile, the logo and two compact auth CTAs in the Navbar are sufficient given the minimal navigation options for unauthenticated users.
- The "Features Overview" section uses static hardcoded content (not CMS-driven), as the 3–4 feature tiles represent stable platform capabilities.
- No analytics tracking script (e.g., Google Analytics) is required as part of this module; it can be added later.
- The public layout (Navbar + Footer) created in this module will serve as the shared layout wrapper for all public-facing pages (auth pages, landing page) to maintain visual consistency.
