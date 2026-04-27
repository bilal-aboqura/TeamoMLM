# Implementation Plan: Apps Offerwall & Tasks System

**Branch**: `012-offerwall-tasks-system` | **Date**: 2026-04-25 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/012-offerwall-tasks-system/spec.md`

## Summary

Build a full-stack Offerwall module enabling admins to create fixed-reward tasks (with mandatory external action URLs and step-by-step descriptions) and users to complete them by uploading screenshot proofs. Includes atomic admin review (approve/reject) with idempotent wallet crediting, a 3-attempt abuse cap per user per task, private signed-URL screenshot access, and user-facing transaction history entries. The feature extends the existing `public.tasks` table, introduces two new tables (`offerwall_submissions`, `wallet_transactions`), and adds three new `SECURITY DEFINER` RPCs following the established wallet-hardening pattern.

---

## Technical Context

**Language/Version**: TypeScript 5 / Node 20  
**Primary Dependencies**: Next.js 14 (App Router, RSC, Server Actions), Supabase JS v2, Zod, Tailwind CSS v3, lucide-react  
**Storage**: Supabase Storage — `proofs` bucket (private), path prefix `task-proofs/{user_id}/`  
**Testing**: Manual checklist in `quickstart.md` Step 5  
**Target Platform**: Web (mobile-first, RTL Arabic)  
**Performance Goals**: Offerwall page load < 2s; admin approval action < 1s round-trip  
**Constraints**: Strict RTL (logical Tailwind utilities only), no emoji, lucide-react icons only, components < 200 lines, `use client` only for interactive elements  
**Scale/Scope**: ~20–100 active tasks; ~1000 user submissions/day at peak

---

## Constitution Check

| # | Principle | Gate Question | Status |
|---|-----------|---------------|--------|
| I | Architecture & Stack | Next.js App Router ✅, Supabase Auth/DB ✅, Tailwind CSS ✅ — no unapproved deps | ✅ Pass |
| II | RTL & UI/UX | All new components RTL-first; logical utilities (`ms-`, `ps-`, `text-start`); Cairo font inherited from root; emerald accent for rewards; slate-900 primary buttons | ✅ Pass |
| III | Data Integrity | `offerwall_submissions` has `status` (enum-checked), `created_at`, `updated_at`; `wallet_transactions` is immutable insert-only; balance writes only via SECURITY DEFINER RPC; `financial_audit_log` entry on every status transition | ✅ Pass |
| IV | RBAC | Admin routes protected by existing middleware at `/admin/**`; RPCs re-verify `role = 'admin'` via `auth.uid()` server-side; RLS enabled on both new tables with user-scoped SELECT and admin-scoped ALL policies | ✅ Pass |
| V | Component Modularity | New pages have co-located `loading.tsx` + `error.tsx`; components split by responsibility (grid, card, modal, table, review card); data fetching in Server Components only; client boundaries minimised to interactive upload form and approve/reject buttons | ✅ Pass |

> No violations. Complexity Tracking table omitted.

---

## Project Structure

### Documentation (this feature)

```text
specs/012-offerwall-tasks-system/
├── plan.md              ← this file
├── research.md          ← D-001 to D-008 decisions
├── data-model.md        ← full schema, RPC SQL, ER summary
├── quickstart.md        ← developer handoff + test checklist
├── contracts/
│   └── contracts.md     ← TypeScript interfaces + Zod schemas
├── checklists/
│   └── requirements.md  ← specification quality checklist
└── tasks.md             ← Phase 2 output (not yet generated)
```

### Source Code (repository root)

```text
supabase/migrations/
└── 20260425000023_offerwall_tasks_system.sql   [NEW]

lib/validations/
├── admin-schemas.ts                             [MODIFY — add description]
└── offerwall-schemas.ts                         [NEW — proof upload schema]

app/admin/tasks/
├── actions.ts                                   [MODIFY — add description field]
└── _components/
    ├── CreateTaskForm.tsx                       [MODIFY — add description textarea]
    └── TaskManagementTable.tsx                  [MODIFY — show description preview]

app/admin/task-submissions/                      [NEW ROUTE]
├── page.tsx
├── loading.tsx
├── error.tsx
├── actions.ts
└── _components/
    ├── SubmissionsTable.tsx
    └── SubmissionReviewCard.tsx

app/dashboard/tasks/
├── page.tsx                                     [MODIFY — offerwall grid]
├── actions.ts                                   [REPLACE — new submission logic]
├── data.ts                                      [MODIFY — fetchOfferwallTasks]
└── _components/
    ├── TaskCard.tsx                             [MODIFY — 4-state badge]
    ├── TaskDetailModal.tsx                      [MODIFY — "Go to App" + proof upload]
    └── OfferwallGrid.tsx                        [NEW — grid wrapper]

app/dashboard/history/
└── _components/TaskLogList.tsx                  [MODIFY — wallet_transactions source]
```

---

## Key Design Decisions (see research.md for full rationale)

| ID | Decision |
|----|---------|
| D-001 | Extend `public.tasks` (add `description`) rather than new table |
| D-002 | New `offerwall_submissions` table (not repurpose `task_completion_logs`) |
| D-003 | New `wallet_transactions` table for user-facing history |
| D-004 | 3-rejection cap enforced in `user_submit_offerwall_proof` RPC |
| D-005 | Signed URL TTL = 900 seconds (15 min) for admin review |
| D-006 | Reuse existing `proofs` bucket; `task-proofs/` path prefix |
| D-007 | `/admin/task-submissions` as separate dedicated route |
| D-008 | `wallet_transactions` feeds existing `TaskLogList` history component |

---

## Critical Implementation Note

> All 3 new RPCs (`admin_approve_offerwall_submission`, `admin_reject_offerwall_submission`, `user_submit_offerwall_proof`) use `SECURITY DEFINER` + `auth.uid()` internally.
>
> They **MUST** be called with the **user session client** (`createClient()`) — NOT the service-role admin client (`createAdminClient()`). The service-role client returns `NULL` for `auth.uid()`, which will cause an `unauthenticated` exception from every RPC.
