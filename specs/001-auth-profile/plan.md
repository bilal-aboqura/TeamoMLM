# Implementation Plan: Authentication and Basic Profile

**Branch**: `001-auth-profile` | **Date**: 2026-04-02 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/001-auth-profile/spec.md`

---

## Summary

Build the complete authentication and user profile foundation for the TEMO MLM platform. This module delivers phone+password registration (with mandatory MLM referral code validation), login with account-level rate limiting, a mobile-first RTL Arabic dashboard showing balances and referral tools, and secure session management. The implementation uses Next.js 15 App Router with React Server Components, Supabase Auth (phone/password), Supabase PostgreSQL for the user profile and rate-limiting tables, Server Actions for all mutations, and Tailwind CSS with RTL logical utilities throughout.

---

## Technical Context

**Language/Version**: TypeScript 5 / Next.js 15 (App Router)  
**Primary Dependencies**: `@supabase/ssr`, `@supabase/supabase-js`, `zod`, `next`  
**Storage**: Supabase PostgreSQL — `public.users`, `public.login_attempts`  
**Testing**: Manual acceptance testing against spec scenarios; Playwright E2E (future)  
**Target Platform**: Mobile-first web (iOS Safari, Android Chrome); Progressive enhancement  
**Performance Goals**: Registration < 2 min end-to-end; Dashboard load < 3s on mobile; Referral code rejection < 1s  
**Constraints**: RTL-only (`dir="rtl"`); No CSS files except `globals.css`; No unapproved npm packages; Service role key server-only  
**Scale/Scope**: MVP single-region; Supabase free/pro tier; ~10k users initial target

---

## Constitution Check

*GATE: Evaluated pre-design and post-design. All gates PASS.*

| # | Principle | Gate Question | Status |
|---|-----------|---------------|--------|
| I | Architecture & Stack | Next.js App Router ✅, Supabase Auth/DB ✅, Tailwind CSS ✅, Zod for validation ✅, no unapproved packages ✅ | ✅ PASS |
| II | RTL & UI/UX | All components RTL-first (`dir="rtl"` on `<html>`) ✅, logical Tailwind utilities (`ms-`, `me-`, `ps-`, `pe-`) ✅, approved palette (slate-900, emerald-500/600, white, slate-50) ✅, Cairo/Tajawal font ✅, soft shadows only ✅ | ✅ PASS |
| III | Data Integrity | `wallet_balance` / `total_earned` are NOT writable by users (RLS + service-role-only) ✅, `created_at` + `updated_at` on all tables ✅, `updated_at` trigger ✅, `invited_by` FK uses RESTRICT ✅. Note: this module has no financial transaction records (deposits/withdrawals) — those belong to the Wallet module. The `wallet_balance` column exists here as a read-only display field. | ✅ PASS |
| IV | RBAC | Middleware protects `/dashboard/**` via `supabase.auth.getUser()` ✅, RLS on `public.users` (select-own only) ✅, admin routes (none in this module) not yet applicable ✅, service role client server-only ✅ | ✅ PASS |
| V | Component Modularity | All components < 200 lines ✅, RSC-first (data fetching in Server Components) ✅, `"use client"` only on `ReferralTool` (clipboard API) and `LogoutButton` (event handler) ✅, `loading.tsx` + `error.tsx` co-located with every page ✅, page-scoped components in `_components/` ✅ | ✅ PASS |

---

## Project Structure

### Documentation (this feature)

```text
specs/001-auth-profile/
├── plan.md              ← This file
├── research.md          ← Phase 0: Technical decisions
├── data-model.md        ← Phase 1: Schema, migrations, RLS
├── quickstart.md        ← Phase 1: Setup guide + file structure
├── contracts/
│   └── server-actions.md  ← Phase 1: Action input/output contracts
├── checklists/
│   └── requirements.md ← Spec quality checklist (all passed)
└── tasks.md             ← Phase 2 output (/speckit-tasks — not yet created)
```

### Source Code (repository root)

```text
app/
├── (auth)/
│   ├── login/
│   │   ├── page.tsx           # Server Component: login page shell
│   │   ├── loading.tsx        # Skeleton loader
│   │   └── error.tsx          # Error boundary
│   ├── register/
│   │   ├── page.tsx           # Server Component: reads searchParams.ref → passes to form
│   │   ├── loading.tsx
│   │   └── error.tsx
│   └── actions.ts             # All auth Server Actions (registerUser, loginUser, logoutUser)
│
├── dashboard/
│   ├── page.tsx               # Server Component: fetches profile, renders sub-components
│   ├── loading.tsx
│   ├── error.tsx
│   └── _components/
│       ├── BalanceCard.tsx        # RSC: renders wallet_balance + total_earned
│       ├── PackageStatusBadge.tsx # RSC: renders current_package_level or "غير مفعّل"
│       ├── ReferralTool.tsx       # "use client": clipboard copy functionality
│       └── LogoutButton.tsx       # "use client": calls logoutUser action
│
├── layout.tsx                 # Root layout → <html lang="ar" dir="rtl">
│
middleware.ts                  # Route guard + session refresh (@supabase/ssr)
│
lib/
├── supabase/
│   ├── client.ts              # Browser Supabase client (NEXT_PUBLIC keys)
│   ├── server.ts              # Server Supabase client factory (reads cookies)
│   └── admin.ts               # Service role client — server-only, never imported in "use client"
├── auth/
│   ├── generate-referral-code.ts  # Unique 8-char code generator
│   └── rate-limit.ts              # login_attempts read/write helpers
└── validations/
    └── auth-schemas.ts            # Zod schemas: registrationSchema, loginSchema

supabase/
└── migrations/
    ├── 20260402000001_create_users_table.sql
    └── 20260402000002_create_login_attempts_table.sql
```

---

## Implementation Phases

### Phase A: Foundation (Database + Auth Infrastructure)
1. Create Supabase migration files (data-model.md as source of truth)
2. Apply migrations via `supabase db push`
3. Configure Supabase Auth: phone provider, JWT expiry = 604800s
4. Create `lib/supabase/` client utilities (browser, server, admin)
5. Create `middleware.ts` with route protection and cookie refresh
6. Create Zod schemas in `lib/validations/auth-schemas.ts`
7. Create `lib/auth/generate-referral-code.ts`
8. Create `lib/auth/rate-limit.ts`

### Phase B: Server Actions
9. Implement `registerUser` Server Action (full flow per contracts/server-actions.md)
10. Implement `loginUser` Server Action (with rate-limit integration)
11. Implement `logoutUser` Server Action

### Phase C: Auth UI (Login + Register Pages)
12. Build `app/layout.tsx` with RTL root, Cairo font, slate-50 background
13. Build `app/(auth)/register/page.tsx` + glassmorphic `RegistrationForm` component
    - 4 fields: Full Name, Phone Number, Password, Referral Code
    - Referral Code field: required (*), pre-filled from `searchParams.ref`
    - Arabic error messages, emerald focus rings, RTL layout
14. Build `app/(auth)/login/page.tsx` + glassmorphic `LoginForm` component
    - 2 fields: Phone Number, Password
    - Arabic error messages
15. Add `loading.tsx` + `error.tsx` for both auth pages

### Phase D: Dashboard UI
16. Build `app/dashboard/page.tsx` (Server Component — fetches user profile)
17. Build `BalanceCard.tsx`:
    - Premium gradient card (slate-900 → slate-800)
    - Available Balance + Total Earned in emerald, `dir="ltr"` span for `$` symbol
18. Build `PackageStatusBadge.tsx`:
    - Shows package name or "غير مفعّل" badge
19. Build `ReferralTool.tsx` (Client Component):
    - Displays referral code
    - 1-click copy with "تم النسخ!" confirmation toast
    - Fallback: selectable text input if clipboard unavailable
20. Build `LogoutButton.tsx` (Client Component)
21. Add `loading.tsx` + `error.tsx` for dashboard

### Phase E: Verification
22. Manual acceptance testing — all 19 acceptance scenarios from spec
23. Validate RTL rendering on mobile (iOS Safari, Android Chrome)
24. Confirm RLS policies block cross-user data access
25. Verify rate limiting: 5 failures → cooldown → auto-reset after 15 min

---

## Complexity Tracking

> No constitution violations. No entries required.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| `"use client"` on `ReferralTool` | Clipboard API (`navigator.clipboard`) is browser-only | No server-side clipboard equivalent exists |
| `"use client"` on `LogoutButton` | `onClick` event handler required | Server Components cannot handle button click events |
| `<span dir="ltr">` on balance display | `$` symbol must appear left of number in RTL layout | CSS `unicode-bidi` alone is insufficient for mixed LTR numerals in RTL context; scoped to numeric display only — justified per constitution |

---

## Artifacts Generated

| Artifact | Path | Status |
|----------|------|--------|
| Research | [research.md](./research.md) | ✅ Complete |
| Data Model | [data-model.md](./data-model.md) | ✅ Complete |
| Contracts | [contracts/server-actions.md](./contracts/server-actions.md) | ✅ Complete |
| Quickstart | [quickstart.md](./quickstart.md) | ✅ Complete |
| Tasks | tasks.md | ⏳ Run `/speckit-tasks` |
