<!--
==============================================================================
SYNC IMPACT REPORT
==============================================================================
Version Change: N/A (initial) → 1.0.0

Modified Principles: N/A (first ratification — all sections newly authored)

Added Sections:
  - I.  Architecture & Technology Stack
  - II. UI/UX & Arabic Localization (RTL-First)
  - III. Data Integrity & Manual Financial System
  - IV. Role-Based Access Control (RBAC)
  - V.  Component Modularity & Performance

Templates Updated:
  ✅ .specify/templates/plan-template.md — Constitution Check gate references
     these five principles; no structural changes needed, text is self-sufficient.
  ✅ .specify/templates/spec-template.md — User story acceptance scenarios must
     now include RTL rendering and admin-approval flow requirements where
     applicable; template commentary already supports this pattern.
  ✅ .specify/templates/tasks-template.md — Task categories now include:
     `[RBAC]`, `[SCHEMA]`, `[RTL]`, `[MANUAL-FIN]` labels for principle-driven
     traceability. No structural change to template required.

Follow-up TODOs: None — all fields resolved.
==============================================================================
-->

# TEMO Constitution

## Core Principles

### I. Architecture & Technology Stack

Every feature in TEMO MUST be built on the approved stack with no deviation
unless a formal amendment is ratified.

- **Framework**: Next.js (App Router) with React. Pages in `app/` directory
  using the file-system router. API logic lives in `app/api/` Route Handlers.
- **Styling**: Tailwind CSS only. Arbitrary CSS files MUST NOT be introduced
  unless scoped to `globals.css` for font imports and CSS custom properties.
- **Database**: Supabase PostgreSQL. All schema changes MUST be expressed as
  versioned SQL migration files under `supabase/migrations/`. Raw SQL is
  preferred over an ORM for performance-critical queries.
- **Auth**: Supabase Auth exclusively. No third-party auth library may be
  introduced. JWTs from Supabase are the single source of identity truth.
- **Server vs Client**: React Server Components (RSC) are the default.
  `"use client"` MUST only be added when browser-only APIs (e.g., `window`,
  event handlers, `useState`) are strictly required. Every `"use client"`
  boundary must carry a comment justifying the decision.
- **No unapproved dependencies**: Before adding any npm package, check whether
  the capability already exists in Next.js, React, or Supabase SDKs. If a
  new package is needed, document the justification in the PR description.

**Rationale**: A locked stack reduces cognitive overhead, eliminates
integration surprises, and ensures all developers work from a shared mental
model.

### II. UI/UX & Arabic Localization (RTL-First)

Every user-facing interface MUST be built RTL-first for Arabic speakers.
This is non-negotiable.

- **Document direction**: The root `<html>` element MUST carry `dir="rtl"`
  and `lang="ar"`. No component may override this with inline `dir="ltr"`
  without explicit justification and admin-panel scoping.
- **Logical CSS properties**: Use Tailwind logical utilities (`ms-`, `me-`,
  `ps-`, `pe-`, `text-start`, `text-end`) everywhere. Avoid directional
  utilities (`ml-`, `mr-`, `pl-`, `pr-`, `text-left`, `text-right`).
- **Typography**: Load Cairo or Tajawal from Google Fonts. All body text MUST
  use one of these fonts. Fallback: system Arabic sans-serif stack.
- **Color palette (non-negotiable)**:
  - App background: `slate-50`; Card/Surface: `white`
  - Primary elements & solid buttons: `slate-900` / `slate-800`
  - Financial accents, balances, success states: `emerald-500` / `emerald-600`
  - Secondary text: `slate-500`; Muted/placeholders: `slate-400`
- **Spacing**: 8-pt grid. Container padding MUST be at minimum `p-6` (`24px`).
  Cramped layouts are a defect.
- **Shadows**: Only soft, diffused shadows are permitted:
  `shadow-[0_2px_10px_rgba(0,0,0,0.02)]` or `shadow-sm`. Heavy shadows
  (`shadow-lg`, `shadow-xl`) are forbidden.
- **Borders**: Do not wrap every element in a border. Use background contrast
  (`bg-white` on `bg-slate-50`) to create visual hierarchy.
- **Motion**: Every interactive element MUST have a Tailwind transition:
  minimum `transition-all duration-200`. Hover states that translate
  (`hover:-translate-y-1`) are strongly preferred over color-only changes.
- **Glassmorphism**: Permitted only for floating navbars and sticky headers:
  `bg-white/80 backdrop-blur-md border-b border-slate-200/50`.

**Rationale**: The target audience is exclusively Arabic-speaking. An RTL
defect is a product defect. Premium, consistent aesthetics build the trust
required for a financial platform.

### III. Data Integrity & Manual Financial System

All monetary state in TEMO is controlled exclusively by Admin approval.
No automated balance mutation may occur.

- **Status lifecycle**: Every financial record (deposits, withdrawals, salaries,
  package upgrades, task rewards) MUST carry a `status` column typed as a
  PostgreSQL ENUM: `('pending', 'approved', 'rejected')`. Default is always
  `'pending'`.
- **Immutable audit log**: Every status change MUST insert a row into a
  dedicated `financial_audit_log` table capturing: `record_id`, `record_type`,
  `old_status`, `new_status`, `changed_by` (admin user ID), and
  `changed_at TIMESTAMPTZ DEFAULT now()`. Audit rows are never deleted.
- **No direct balance writes from user context**: User-facing API routes MUST
  NOT update `users.balance` directly. Balance mutations are permitted only
  in admin-scoped server actions or Route Handlers protected by the RBAC
  middleware (see Principle IV).
- **Proof of transaction**: Deposit requests MUST store a `receipt_url`
  (Supabase Storage path) before they may be submitted. The URL must be
  validated server-side before the record is persisted.
- **Timestamps**: Every table MUST include `created_at TIMESTAMPTZ DEFAULT now()`
  and `updated_at TIMESTAMPTZ DEFAULT now()` columns. A trigger MUST auto-update
  `updated_at` on every row mutation.
- **Referential integrity**: All foreign keys MUST be declared with explicit
  `ON DELETE` and `ON UPDATE` clauses. Cascading deletes are forbidden for
  financial tables; use `RESTRICT` instead.

**Rationale**: A manual approval workflow is the product's core trust
mechanism. Any accidental or malicious balance mutation would be a critical
business failure. The audit log is the system of record.

### IV. Role-Based Access Control (RBAC)

The system recognizes exactly two roles: `user` and `admin`. These roles
MUST be enforced at the database level, middleware level, and component level.

- **Role storage**: User role is stored in `public.users.role` (mirrored from
  Supabase Auth custom claims). Supabase Row-Level Security (RLS) policies
  MUST be enabled on every table and authored to enforce role boundaries.
- **Middleware gate**: `middleware.ts` at the project root MUST intercept all
  requests to `/admin/**` routes and verify the user's JWT claim contains
  `role: 'admin'`. Any request failing this check MUST receive a `403`
  response; never a redirect that leaks route existence.
- **Admin Route Handlers**: Any Next.js Route Handler that mutates financial
  state MUST re-validate the session server-side (never trust client-passed
  role). Use `createServerClient` from `@supabase/ssr` and verify the role
  claim in every handler independently.
- **Component-level guards**: Admin-only UI elements MUST be rendered
  conditionally using a shared `AdminGate` server component. Client-side
  conditional rendering alone is insufficient; the data MUST also be withheld
  server-side.
- **No cross-role data leakage**: User-scoped API responses MUST NOT include
  other users' wallet addresses, balances, or personal data. RLS policies are
  the enforcement mechanism; application-level filtering is a secondary guard.

**Rationale**: Financial platforms are high-value attack targets. A single
RBAC bypass could expose all user funds. Defence-in-depth (DB + middleware +
server) ensures no single layer failure is catastrophic.

### V. Component Modularity & Performance

The codebase MUST remain maintainable through disciplined component
decomposition and a server-first rendering strategy.

- **Single responsibility**: Each component MUST do exactly one thing.
  A component that fetches data, formats it, and renders interactive UI is
  three components, not one.
- **File length limit**: No component file may exceed 200 lines. If a file
  approaches this limit, extract sub-components or logic hooks before
  submitting a PR.
- **Colocation**: Components used by only one page MUST live in a `_components/`
  folder adjacent to that page's `page.tsx`. Globally shared components live
  in `components/` at the project root.
- **Server by default**: Data fetching MUST happen in Server Components using
  `async/await` directly. Client components MUST NOT call Supabase for
  initial data load; they receive data as props from their Server Component
  parent.
- **No prop drilling beyond two levels**: If a value must travel more than two
  component levels, use React Context or a server-passed slot pattern. Global
  client state libraries (Redux, Zustand) MUST NOT be introduced without a
  formal amendment.
- **Image optimization**: All images MUST use Next.js `<Image>` component.
  Raw `<img>` tags are forbidden in production code.
- **Loading & error boundaries**: Every data-fetching Server Component MUST
  be accompanied by a co-located `loading.tsx` and `error.tsx` in the same
  `app/` segment.

**Rationale**: A modular codebase enables parallel feature development across
the team and makes the Admin and User surfaces independently maintainable.
Server-first rendering minimizes client bundle size, which is critical for
mobile users on potentially slow connections.

## Security Requirements

- **Environment variables**: All secrets (Supabase URL, anon key, service role
  key) MUST be stored in `.env.local` and never committed to version control.
  The `SUPABASE_SERVICE_ROLE_KEY` MUST only be used in server-side code and
  never exposed to the client bundle.
- **Input validation**: All user-supplied input MUST be validated server-side
  using a schema validation library (e.g., Zod) before any database write.
  Client-side validation is a UX convenience only, not a security control.
- **File uploads**: Uploaded receipts MUST be stored in a private Supabase
  Storage bucket. Signed URLs with short TTLs MUST be used for admin review.
  Direct public bucket access is forbidden for financial proofs.
- **Rate limiting**: Authentication endpoints MUST be protected by Supabase's
  built-in rate limiting. Admin mutation endpoints MUST additionally enforce
  a per-IP rate limit via middleware.

## Development Workflow

- **Branch naming**: `feature/###-short-description`, `fix/###-short-description`,
  `chore/###-short-description`. Branch numbers correspond to task IDs in
  `tasks.md`.
- **Constitution check**: Every PR description MUST include a "Constitution
  Check" section confirming compliance with all five principles. Non-compliant
  PRs MUST NOT be merged.
- **Migration discipline**: Never edit an already-merged migration file.
  Schema fixes MUST be a new migration file. Migrations are append-only.
- **Accessibility**: All interactive elements MUST have ARIA labels or roles
  in Arabic. Color contrast ratios MUST meet WCAG AA (4.5:1 for normal text).

## Governance

This constitution supersedes all other project guidelines, README snippets,
and informal conventions. Amendments require:

1. A written proposal describing the change and its motivation.
2. Review by the project lead (Bilal Abukoura / Codely).
3. A `MAJOR`, `MINOR`, or `PATCH` version bump per semantic versioning rules
   documented in this file's header comment.
4. Update of this file and all affected templates before the amendment is
   considered ratified.

All feature planning (spec → plan → tasks) MUST include a Constitution Check
gate verifying compliance with Principles I–V before implementation begins.
Complexity violations MUST be tracked in the plan's Complexity Tracking table.

**Version**: 1.0.0 | **Ratified**: 2026-04-02 | **Last Amended**: 2026-04-02
