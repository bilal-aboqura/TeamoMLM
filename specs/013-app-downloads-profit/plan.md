# Implementation Plan: App Downloads Profit

**Branch**: `013-app-downloads-profit` | **Date**: 2026-04-25 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/013-app-downloads-profit/spec.md`

## Summary

Build a standalone "App Downloads Profit" (`الربح بالتطبيقات`) module with isolated user routes, admin routes, storage, tables, proof submissions, app-profit wallet balance, and Friday-only withdrawals. The legacy daily-task/task-completion system remains untouched. Access is gated by existing user rank/package fields plus an app-package qualification stored in the new app-profit namespace.

## Technical Context

**Language/Version**: TypeScript 5 / Node 20  
**Primary Dependencies**: Next.js App Router, Server Actions, Supabase JS v2, Zod, Tailwind CSS, lucide-react  
**Storage**: Supabase PostgreSQL plus private Supabase Storage bucket `app-profit-proofs`  
**Testing**: TypeScript validation, Next production build, manual quickstart checklist  
**Target Platform**: Web, mobile-first RTL Arabic  
**Project Type**: Next.js web application  
**Performance Goals**: App offer list loads in under 2 seconds for up to 100 active app offers; admin review actions complete in under 1 second excluding network latency  
**Constraints**: Fully isolated from legacy task tables/routes; RTL-first; no app images for MVP; Friday-only withdrawal rule enforced client and server side; components under 200 lines  
**Scale/Scope**: MVP supports 20-100 active offers, 1,000 submissions/day, and weekly withdrawal review batches

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Gate Question | Status |
|---|-----------|---------------|--------|
| I | Architecture & Stack | Next.js App Router, Supabase Auth/DB, migrations, Server Actions, Tailwind only | Pass |
| II | RTL & UI/UX | New user/admin pages are RTL-first and use existing slate/emerald design language | Pass |
| III | Data Integrity | App-profit submissions/withdrawals have status, timestamps, RLS, and balance mutation happens only in admin/user RPCs with guards | Pass |
| IV | RBAC | Admin routes stay under `/admin/**`; new tables have RLS for own-user/admin access | Pass |
| V | Component Modularity | Routes use server data loaders and small client components only for forms/actions | Pass |

## Project Structure

### Documentation (this feature)

```text
specs/013-app-downloads-profit/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── contracts.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
supabase/migrations/
└── 20260425000025_app_downloads_profit.sql

lib/validations/
└── app-profit-schemas.ts

lib/app-profits/
├── access.ts
└── types.ts

app/dashboard/app-profits/
├── page.tsx
├── loading.tsx
├── error.tsx
├── actions.ts
├── data.ts
├── _components/
│   ├── AppOfferList.tsx
│   ├── AppOfferCard.tsx
│   ├── ProofUploadModal.tsx
│   └── AccessLockedState.tsx
├── history/
│   ├── page.tsx
│   ├── loading.tsx
│   └── error.tsx
└── withdraw/
    ├── page.tsx
    ├── loading.tsx
    ├── error.tsx
    ├── actions.ts
    └── _components/WithdrawForm.tsx

app/admin/app-profits/
├── manage/
│   ├── page.tsx
│   ├── actions.ts
│   ├── loading.tsx
│   ├── error.tsx
│   └── _components/
│       ├── OfferForm.tsx
│       └── OffersTable.tsx
├── reviews/
│   ├── page.tsx
│   ├── actions.ts
│   ├── loading.tsx
│   ├── error.tsx
│   └── _components/ReviewsTable.tsx
└── withdrawals/
    ├── page.tsx
    ├── actions.ts
    ├── loading.tsx
    ├── error.tsx
    └── _components/WithdrawalsTable.tsx
```

**Structure Decision**: Add a dedicated `/dashboard/app-profits` and `/admin/app-profits/*` route tree. Do not modify `/dashboard/tasks`, `/admin/tasks`, `task_completion_logs`, or legacy task server actions.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
