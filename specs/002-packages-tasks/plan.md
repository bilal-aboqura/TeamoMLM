# Implementation Plan: Packages & Daily Tasks (002-packages-tasks)

**Branch**: `002-packages-tasks` | **Date**: 2026-04-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-packages-tasks/spec.md`

---

## Summary

Build the user-facing Packages & Daily Tasks module for the TEMO MLM platform. Users browse 6 DB-driven subscription package tiers, submit manual-payment purchase requests (with receipt upload), and complete daily tasks (with proof uploads). All submissions create `pending` records for admin review — no automated balance mutations occur. The module introduces 5 new database tables, a `proofs` Supabase Storage bucket (private), 2 Server Actions, and 4 UI page routes under the authenticated `/dashboard` layout.

---

## Technical Context

**Language/Version**: TypeScript 5 / Next.js 15 (App Router)
**Primary Dependencies**: `@supabase/ssr`, `@supabase/supabase-js`, `zod` (already installed from `001-auth-profile`)
**Storage**: Supabase PostgreSQL (existing project) + Supabase Storage (`proofs` private bucket — new)
**Testing**: Manual acceptance tests against spec scenarios; no automated test runner added this phase
**Target Platform**: Mobile-first web (iOS Safari / Android Chrome primary); desktop secondary
**Project Type**: Full-stack web application (Next.js App Router, RSC-first)
**Performance Goals**: Packages grid loads in under 3 seconds on standard mobile; file upload + record insert completes in under 5 seconds
**Constraints**: No automated balance writes; all file uploads go to private bucket; all mutations via Server Actions with admin client; no new npm packages without justification
**Scale/Scope**: 6 packages, ~50 tasks in pool at MVP; single-tenant admin model

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Gate Question | Status |
|---|-----------|---------------|--------|
| I | Architecture & Stack | Next.js App Router, Supabase Auth/DB/Storage, Tailwind CSS only — no new frameworks | ✅ PASS |
| II | RTL & UI/UX | All new components RTL-first, logical Tailwind utilities, approved color palette, soft shadows, 8-pt grid | ✅ PASS |
| III | Data Integrity | All financial records (`package_subscription_requests`, `task_completion_logs`) carry `status`, `created_at`, `updated_at`; balance writes are admin-only; `financial_audit_log` required for status changes | ✅ PASS |
| IV | RBAC | RLS enabled on all 5 new tables; user-scoped SELECT policies; no user-context INSERT on `public.users`; admin mutations reserved for admin module | ✅ PASS |
| V | Component Modularity | All components < 200 lines, server-first data fetching, `loading.tsx` + `error.tsx` co-located per route segment | ✅ PASS |

> **Schema correction from user input**: User proposed `transactions` and `user_task_logs` — reconciled to `package_subscription_requests` and `task_completion_logs` per the clarified spec. `reward_amount` removed from `tasks` table (derived at runtime). `daily_tasks_count` → `daily_task_count` (spec canonical name).

---

## Project Structure

### Documentation (this feature)

```text
specs/002-packages-tasks/
├── plan.md              ✅ This file
├── research.md          ✅ Phase 0 output
├── data-model.md        ✅ Phase 1 output
├── contracts/
│   └── server-actions.md  ✅ Phase 1 output
├── quickstart.md        ✅ Phase 1 output
└── tasks.md             ⏳ Run /speckit-tasks
```

### Source Code (repository root — additions for this feature)

```text
app/
├── dashboard/
│   ├── packages/
│   │   ├── page.tsx                          # RSC — fetches packages + user profile
│   │   ├── loading.tsx                       # Skeleton grid
│   │   ├── error.tsx                         # Arabic error boundary
│   │   └── _components/
│   │       ├── PackageGrid.tsx               # RSC — renders package cards
│   │       ├── PackageCard.tsx               # RSC — single tier card
│   │       └── PurchaseModal.tsx             # Client — receipt upload + submit
│   ├── tasks/
│   │   ├── page.tsx                          # RSC — fetches task list + today's completions
│   │   ├── loading.tsx                       # Skeleton list
│   │   ├── error.tsx                         # Arabic error boundary
│   │   └── _components/
│   │       ├── TaskList.tsx                  # RSC — renders task items
│   │       ├── TaskItem.tsx                  # RSC — single task row
│   │       └── TaskExecutionModal.tsx        # Client — proof upload + submit
│   └── history/
│       ├── page.tsx                          # RSC — fetches purchase + task log history
│       ├── loading.tsx
│       ├── error.tsx
│       └── _components/
│           ├── HistoryTabs.tsx               # Client — tab toggle between packages/tasks
│           ├── SubscriptionRequestList.tsx   # RSC prop-fed
│           └── TaskLogList.tsx              # RSC prop-fed
├── (auth)/
│   └── actions.ts                           # [EXTEND] add purchasePackage, submitTaskProof, logoutUser already exists

lib/
├── supabase/
│   ├── admin.ts                             # ✅ Exists — no changes
│   ├── server.ts                            # ✅ Exists — no changes
│   └── client.ts                            # ✅ Exists — no changes
└── validations/
    └── packages-tasks-schemas.ts            # [NEW] Zod schemas for both actions

supabase/
├── migrations/
│   ├── 20260402000001_create_users_table.sql         # ✅ Exists
│   ├── 20260402000002_create_login_attempts_table.sql # ✅ Exists
│   ├── 20260402000003_create_packages_table.sql       # [NEW]
│   ├── 20260402000004_create_admin_settings_table.sql # [NEW]
│   ├── 20260402000005_create_package_sub_requests.sql # [NEW]
│   ├── 20260402000006_create_tasks_table.sql          # [NEW]
│   └── 20260402000007_create_task_completion_logs.sql # [NEW]
└── storage/
    └── proofs-bucket.sql                    # [NEW] bucket creation + RLS policies
```

---

## Implementation Phases

### Phase 0: Research ✅
→ See [research.md](./research.md)

### Phase 1: Design & Contracts ✅
→ See [data-model.md](./data-model.md) and [contracts/server-actions.md](./contracts/server-actions.md)

### Phase 2: Implementation
→ Task breakdown in [tasks.md](./tasks.md) (run `/speckit-tasks`)

---

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| `<span dir="ltr">` for USD amounts in RTL context | USD symbol must render left-of-digits even inside RTL layout (`$5.00` not `00.5$`) | Constitution explicitly permits this scoped to numeric financial display only |
| Client boundary for modals (`PurchaseModal`, `TaskExecutionModal`) | File upload (`<input type="file">`), drag-and-drop events, and `useState` for upload progress are browser-only APIs | Cannot be a Server Component; `"use client"` justified with comment |
| Client boundary for `HistoryTabs` | Tab switching requires `useState` for active tab; data itself is passed as props from RSC parent | Minimal client surface; data fetching remains in the RSC parent |
