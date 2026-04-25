# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

This feature adds a "Profit Shares & Equity Purchasing" module to the Teamo platform, allowing users to buy a percentage of the platform's future profits. The system provides a public progress bar (polled client-side), predefined equity packages, and an admin workflow for approving purchases, enforcing a 30% global cap and 10% per-user cap.

## Technical Context

**Language/Version**: TypeScript / React 18  
**Primary Dependencies**: Next.js 14 App Router, React Server Components (RSC), Next.js Server Actions, Tailwind CSS, `lucide-react`
**Storage**: Supabase PostgreSQL (DB) & Supabase Storage (Receipts)  
**Testing**: Jest / Playwright (if applicable in project)  
**Target Platform**: Web application (Responsive, Mobile-first)
**Project Type**: Web Service (Full-stack Next.js)  
**Performance Goals**: Max 15s latency for public progress bar updates (polling interval)  
**Constraints**: Strict 10% per-user cap and 30% global cap enforced via atomic DB updates. Strict RTL logical CSS properties.  
**Scale/Scope**: ~6 new UI components, 2 new server actions, 1 new DB table (`profit_share_requests`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with all five TEMO principles before proceeding:

| # | Principle | Gate Question | Status |
|---|-----------|---------------|--------|
| I | Architecture & Stack | Does this feature use Next.js App Router, Supabase Auth/DB, and Tailwind CSS only? | [X] |
| II | RTL & UI/UX | Are all new components RTL-first, using logical Tailwind utilities and the approved color palette? | [X] |
| III | Data Integrity | Do all new financial records have `status`, `created_at`, `updated_at`, and are balance writes admin-only? | [X] |
| IV | RBAC | Are admin routes protected at middleware + server level, with RLS policies on all new tables? | [X] |
| V | Component Modularity | Are components < 200 lines, server-first, with `loading.tsx` / `error.tsx` co-located? | [X] |

> Document violations (if any) in the **Complexity Tracking** table below.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
```text
app/
├── profit-shares/                 # Public-facing page
│   ├── page.tsx
│   ├── _components/
│   │   ├── ProgressBar.tsx
│   │   ├── PackageGrid.tsx
│   │   ├── PurchaseModal.tsx
│   │   └── RequestHistory.tsx
│   └── actions.ts                 # Server actions for user (purchase)
├── admin/
│   └── equity-requests/           # Admin page
│       ├── page.tsx
│       ├── _components/
│       │   └── AdminRequestsTable.tsx
│       └── actions.ts             # Server actions for admin (accept/reject)
```

**Structure Decision**: Web application structure following Next.js App Router conventions, with feature-specific components co-located and server actions in `actions.ts`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
