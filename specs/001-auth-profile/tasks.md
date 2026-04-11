# Tasks: Authentication and Basic Profile (001-auth-profile)

**Branch**: `001-auth-profile` | **Date**: 2026-04-02  
**Input**: Design documents from `/specs/001-auth-profile/`  
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/server-actions.md ✅ | quickstart.md ✅

**Tests**: Not explicitly requested — no test tasks included.  
**Organization**: Tasks are grouped by user story to enable independent implementation and delivery.

---

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel with other [P]-marked tasks in the same phase (different files, no shared dependencies)
- **[Story]**: Maps to spec.md user story (US1–US4)
- All task descriptions include exact file paths

---

## Phase 1: Setup (Project Infrastructure)

**Purpose**: Initialize Next.js project, configure Tailwind RTL, fonts, Supabase clients, and environment. Must be complete before any feature work begins.

- [X] T001 Initialize Next.js 15 App Router project with TypeScript in the repository root (`package.json`, `tsconfig.json`, `next.config.ts`)
- [X] T002 [P] Install and configure required dependencies: `@supabase/ssr`, `@supabase/supabase-js`, `zod` — update `package.json`
- [X] T003 [P] Configure Tailwind CSS with Cairo/Tajawal font from Google Fonts in `app/layout.tsx` and `globals.css` (font import only — no custom CSS beyond font faces)
- [X] T004 [P] Create `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (add `.env.local` to `.gitignore`)
- [X] T005 Create root `app/layout.tsx` with `<html lang="ar" dir="rtl">`, Cairo font class, and `bg-slate-50` body background
- [X] T006 [P] Create Supabase browser client utility in `lib/supabase/client.ts` (uses `NEXT_PUBLIC_*` keys, `createBrowserClient` from `@supabase/ssr`)
- [X] T007 [P] Create Supabase server client factory in `lib/supabase/server.ts` (uses `cookies()` from `next/headers`, `createServerClient` from `@supabase/ssr`)
- [X] T008 [P] Create Supabase admin client in `lib/supabase/admin.ts` (uses `SUPABASE_SERVICE_ROLE_KEY`, `createClient` from `@supabase/supabase-js` — mark file with `// SERVER ONLY` comment, never imported in `"use client"` files)

**Checkpoint**: Project boots locally (`npm run dev`), environment variables load, Supabase clients instantiate without errors.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, migrations, middleware, validation schemas, and auth utilities that ALL user stories depend on. No user story can be implemented until this phase is complete.

**⚠️ CRITICAL**: Complete this phase fully before starting any Phase 3+ work.

- [X] T009 Create Supabase migration `supabase/migrations/20260402000001_create_users_table.sql` — full contents from `data-model.md` (includes `set_updated_at()` trigger function, `public.users` table, RLS policy `users_select_own`, indexes, constraints, comments)
- [X] T010 Create Supabase migration `supabase/migrations/20260402000002_create_login_attempts_table.sql` — full contents from `data-model.md` (includes `public.login_attempts` table, trigger, comments — no RLS)
- [ ] T011 Apply migrations to Supabase project: run `supabase db push` (or `supabase migration up` for local dev) and verify both tables exist with correct columns and constraints
- [ ] T012 Configure Supabase Auth in dashboard: enable phone sign-in (password-based), set JWT expiry to `604800` seconds (7 days), disable email confirmations for dev
- [X] T013 [P] Create Zod validation schemas in `lib/validations/auth-schemas.ts`: export `registrationSchema` (full_name, phone_number, password, referral_code) and `loginSchema` (phone_number, password) — exact rules per `data-model.md` Validation Rules section
- [X] T014 [P] Create referral code generator in `lib/auth/generate-referral-code.ts`: function `generateUniqueReferralCode(supabase)` — charset `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (32 chars), 8 chars, max 5 retry attempts, throws on exhaustion — per `research.md` §5
- [X] T015 [P] Create login rate-limit helpers in `lib/auth/rate-limit.ts`: export `checkRateLimit(phone)`, `recordFailedAttempt(phone)`, `resetRateLimit(phone)` — reads/writes `public.login_attempts` via admin client, implements 5-attempt / 15-minute cooldown logic per `contracts/server-actions.md` Action 2
- [X] T016 Create `middleware.ts` at project root: use `createServerClient` from `@supabase/ssr`, call `supabase.auth.getUser()` (not `getSession()`), implement route table from `contracts/server-actions.md` Middleware Contract section (`/dashboard/**` → auth required, `/login` + `/register` → redirect if already authed, `/` → redirect based on auth state)

**Checkpoint**: Database tables exist, migrations applied, middleware compiles, helper functions exportable without TypeScript errors. Visiting `/dashboard` while unauthenticated redirects to `/login`.

---

## Phase 3: User Story 1 — Registration with Referral Code Validation (Priority: P1) 🎯 MVP

**Goal**: A visitor can create an account by providing Full Name, Phone, Password, and a mandatory Referral Code. Invalid codes are rejected with an Arabic error. On success the user lands on the dashboard.

**Independent Test**: Visit `/register`, submit with an invalid referral code → see Arabic error "كود الإحالة غير صحيح". Submit with a valid seed-account referral code and unique phone → account is created, session is established, user is redirected to `/dashboard`.

### Implementation for User Story 1

- [X] T017 [US1] Implement `registerUser` Server Action in `app/(auth)/actions.ts` following the exact 8-step processing flow in `contracts/server-actions.md` Action 1:
  1. Zod validation (field-level errors)
  2. Phone normalization (trim)
  3. Referral code DB lookup (`SELECT id, status FROM public.users WHERE referral_code = $1`)
  4. Reject if no row OR status = 'suspended' with `{ error: { field: 'referral_code', message: 'كود الإحالة غير صحيح' } }`
  5. Generate unique referral code for new user (call `generateUniqueReferralCode`)
  6. Create auth user via `supabaseAdmin.auth.admin.createUser({ phone, password })`
  7. Insert `public.users` row with `invited_by = upline.id`; on unique violation, delete auth user (compensating transaction) and return duplicate-phone error
  8. Sign in via `supabase.auth.signInWithPassword({ phone, password })` to establish session cookie; return `{ success: true }`
- [X] T018 [P] [US1] Create `app/(auth)/register/page.tsx` as a Server Component: reads `searchParams.ref`, passes value as `initialReferralCode` prop to `RegistrationForm` client component; wraps in centered `bg-gradient-to-br from-slate-50 to-slate-100` full-screen layout
- [X] T019 [US1] Create `app/(auth)/register/_components/RegistrationForm.tsx` as a Client Component (`"use client"` — needed for `useFormState`/`useFormStatus` hooks): glassmorphic auth card (`bg-white/80 backdrop-blur-md rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-8`); 4 RTL fields (Full Name, Phone, Password, Referral Code); Referral Code field pre-filled from `initialReferralCode` prop and marked required with `*`; all labels and placeholders in Arabic; emerald focus rings (`focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20`); inline Arabic error messages per field; primary submit button (`bg-slate-900 text-white rounded-xl hover:bg-slate-800 active:scale-95 transition-all`); link to `/login`
- [X] T020 [P] [US1] Create `app/(auth)/register/loading.tsx`: pulsing skeleton card matching the auth card dimensions
- [X] T021 [P] [US1] Create `app/(auth)/register/error.tsx`: Arabic error boundary message ("حدث خطأ غير متوقع") with retry button

**Checkpoint**: Full registration flow works end-to-end. Invalid referral code rejected within 1 second. Successful registration creates a row in `public.users` with correct `invited_by` and system-generated `referral_code`. User lands on `/dashboard` after success.

---

## Phase 4: User Story 2 — Returning User Login (Priority: P1)

**Goal**: A registered user can log in with Phone + Password. Invalid credentials return a generic Arabic error (no field enumeration). After 5 failures, a 15-minute cooldown is applied.

**Independent Test**: Log in with correct credentials → redirected to dashboard. Log in with wrong password → see "رقم الهاتف أو كلمة المرور غير صحيحة". Fail 5 times in a row → see cooldown message. Wait 15 minutes (or manually reset `login_attempts` row) → login works again.

### Implementation for User Story 2

- [X] T022 [US2] Implement `loginUser` Server Action in `app/(auth)/actions.ts` following the exact processing flow in `contracts/server-actions.md` Action 2:
  1. Zod validation (non-empty check)
  2. Phone normalization
  3. Query `login_attempts` via `checkRateLimit(phone)` → reject immediately with cooldown Arabic message if locked
  4. Call `supabase.auth.signInWithPassword({ phone, password })`
  5. On failure → call `recordFailedAttempt(phone)` (increments count, sets `locked_until` at count=5) → return generic Arabic error
  6. On success → call `resetRateLimit(phone)` → set session cookie → return `{ success: true }`
- [X] T023 [P] [US2] Create `app/(auth)/login/page.tsx` as a Server Component: redirects authenticated users to `/dashboard` (middleware handles this, but add explicit guard); renders `LoginForm` in same centered layout as register page
- [X] T024 [US2] Create `app/(auth)/login/_components/LoginForm.tsx` as a Client Component (`"use client"` — `useFormState`/`useFormStatus`): glassmorphic auth card matching register card style; 2 RTL fields (Phone, Password); all text in Arabic; generic error displayed below the form (no field-level targeting); primary submit button; link to `/register`; TEMO logo/wordmark at top of card
- [X] T025 [P] [US2] Create `app/(auth)/login/loading.tsx`: matching skeleton card
- [X] T026 [P] [US2] Create `app/(auth)/login/error.tsx`: Arabic error boundary with retry

**Checkpoint**: Login works. Wrong credentials show generic error. 5th failure triggers cooldown message. Authenticated users hitting `/login` are redirected to dashboard.

---

## Phase 5: User Story 3 — Personal Dashboard View (Priority: P2)

**Goal**: After login, users see a premium mobile-first RTL dashboard with their balance card (Available Balance + Total Earned in USD), package status badge, and referral tool with 1-click copy.

**Independent Test**: Log in with a fresh account → dashboard shows `$0.00` Available Balance, `$0.00` Total Earned, "غير مفعّل" package status, the user's 8-char referral code. Click the "نسخ" button → code is copied to clipboard and "تم النسخ!" confirmation appears briefly. Check on mobile viewport (320px) → no horizontal scroll, all elements accessible.

### Implementation for User Story 3

- [X] T027 [US3] Create `app/dashboard/page.tsx` as a Server Component: call `getCurrentUserProfile()` helper (SELECT from `public.users` WHERE `id = auth.uid()`); render `BalanceCard`, `PackageStatusBadge`, `ReferralTool`, `LogoutButton` components with profile data as props; use `ms-auto`/`me-auto` for centering, `max-w-md` container, `px-4 py-6` padding
- [X] T028 [P] [US3] Create `app/dashboard/_components/BalanceCard.tsx` as a Server Component (RSC, no `"use client"`): premium gradient card (`bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6`); display Available Balance and Total Earned using `<span dir="ltr">` wrapper for USD amounts (`$0.00` format, `text-emerald-400 font-bold text-3xl`); Arabic labels in `text-slate-400`; soft shadow (`shadow-[0_4px_20px_rgba(0,0,0,0.15)]`)
- [X] T029 [P] [US3] Create `app/dashboard/_components/PackageStatusBadge.tsx` as a Server Component (RSC): if `current_package_level` is null → render "غير مفعّل" badge (`bg-slate-100 text-slate-500 rounded-full px-3 py-1 text-sm`); if set → render package name in emerald badge; used within a stat card (`bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]`)
- [X] T030 [US3] Create `app/dashboard/_components/ReferralTool.tsx` as a Client Component (`"use client"` — clipboard API is browser-only; add `// use client — clipboard API requires browser environment` comment): display referral code in monospace styled box; "نسخ" button (`bg-emerald-600 text-white rounded-xl shadow-[0_4px_14px_0_rgba(5,150,105,0.39)] hover:bg-emerald-700 active:scale-95 transition-all`); on copy: call `navigator.clipboard.writeText(code)`, set 2-second "تم النسخ!" confirmation state; fallback: if clipboard unavailable, render `<input readOnly value={code} className="..." />` selectable text field with Arabic label "انسخ الكود يدوياً"; wrap card in `bg-white rounded-2xl p-6 border border-slate-100`
- [X] T031 [P] [US3] Create `app/dashboard/loading.tsx`: skeleton loaders for balance card, package badge, and referral section with `animate-pulse` and `bg-slate-100` placeholder blocks
- [X] T032 [P] [US3] Create `app/dashboard/error.tsx`: Arabic error boundary ("تعذر تحميل بياناتك") with a reload button

**Checkpoint**: Dashboard renders correctly for fresh accounts. Balance card shows $0.00 in both fields. Package status shows "غير مفعّل". Referral code is displayed. Copy button functions on iOS Safari and Android Chrome. Layout has no horizontal scroll at 320px width.

---

## Phase 6: User Story 4 — Session Management & Logout (Priority: P3)

**Goal**: Sessions persist across reloads/tabs (7-day sliding window). Users can log out. Unauthenticated access to dashboard redirects to login. Session expiry triggers graceful redirect with Arabic message.

**Independent Test**: Log in → reload page → still authenticated. Open new tab to `/dashboard` → still authenticated (same session). Click logout → session invalidated, redirected to `/login`. Clear session manually → navigate to `/dashboard` → redirected to `/login`.

### Implementation for User Story 4

- [X] T033 [US4] Implement `logoutUser` Server Action in `app/(auth)/actions.ts`: call `supabase.auth.signOut()` server-side (clears session cookie automatically via `@supabase/ssr`); return `{ success: true }`; client redirects to `/login` using `redirect()` from `next/navigation`
- [X] T034 [US4] Create `app/dashboard/_components/LogoutButton.tsx` as a Client Component (`"use client"` — onClick handler; add comment justifying the boundary): button with Arabic label "تسجيل الخروج" using ghost/secondary style (`bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl transition-all active:scale-95`); calls `logoutUser` action on click; shows loading state ("جاري الخروج...") while action is pending using `useFormStatus` or `useState`
- [X] T035 [US4] Validate session refresh behaviour in `middleware.ts`: confirm `updateSession` pattern from `@supabase/ssr` is correctly calling `supabase.auth.getUser()` and refreshing the cookie on every request (this implements the 7-day sliding window — each authenticated page visit extends the session); add session-expired redirect: if `getUser()` returns an error on a protected route, redirect to `/login?expired=1`
- [X] T036 [US4] Handle session-expiry message on `app/(auth)/login/page.tsx`: read `searchParams.expired` in the Server Component; if `"1"`, pass a prop to `LoginForm` to display the Arabic message "انتهت جلستك، يرجى تسجيل الدخول مجدداً" as a toast/banner above the form in amber/yellow styling

**Checkpoint**: Full session lifecycle works. Logout clears session. Unauthenticated dashboard access redirects to `/login`. Session-expiry message shows correctly. Reloading the app within 7 days of last activity does not require re-login.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility, RTL final review, micro-animations, and edge case hardening across all components.

- [X] T037 [P] Add Arabic ARIA labels to all interactive elements across all auth and dashboard components: buttons (`aria-label`), inputs (`aria-label` or `aria-labelledby`), form error messages (`aria-live="polite"` for dynamic errors) — per FR-026
- [X] T038 [P] Audit all Tailwind utility classes across all new files: replace any directional utilities (`ml-`, `mr-`, `pl-`, `pr-`, `text-left`, `text-right`) with logical equivalents (`ms-`, `me-`, `ps-`, `pe-`, `text-start`, `text-end`) — per Constitution Principle II
- [X] T039 [P] Add micro-animations to RegistrationForm and LoginForm inputs: `transition-all duration-200` on focus, `hover:-translate-y-0.5` on submit buttons; ensure `active:scale-95` is on all primary action buttons
- [X] T040 [P] Validate WCAG AA colour contrast on all text/background combinations used (slate-500 on white, emerald-400 on slate-900, etc.) — document results; adjust shades if any fail 4.5:1 ratio
- [ ] T041 Run full manual acceptance test suite against all 19 acceptance scenarios from `spec.md`, documenting results — mark each scenario Pass/Fail; resolve any failures before marking this phase complete
- [X] T042 [P] Verify `lib/supabase/admin.ts` (service role client) is not imported anywhere in files marked `"use client"` — grep the project and add ESLint rule or comment guard if needed
- [ ] T043 Seed the database with a root/admin user account (no `invited_by`) directly via Supabase Dashboard SQL editor, so the first real user can register using the root account's `referral_code`

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
    └──► Phase 2 (Foundational) ─ BLOCKS ALL ──► Phase 3 (US1 Registration)  🎯 MVP
                                                  Phase 4 (US2 Login)
                                                  Phase 5 (US3 Dashboard)
                                                  Phase 6 (US4 Session)
                                                      └──► Phase 7 (Polish)
```

### User Story Dependencies

| User Story | Depends On | Can Parallel With |
|---|---|---|
| US1: Registration (P1) | Phases 1 + 2 complete | Can start alongside US2 after Phase 2 |
| US2: Login (P1) | Phases 1 + 2 + T017 (`registerUser` action — shares `actions.ts`) | Start after T017 |
| US3: Dashboard (P2) | US1 + US2 (needs auth to access) | Independent of US4 |
| US4: Session (P3) | US2 complete (needs login to test) | Independent of US3 |

### Within Each Story

- Server Actions before UI components (actions must exist before forms can call them)
- Page Server Component before sub-components (props flow downward)
- `loading.tsx` + `error.tsx` can be written in parallel [P] with their page

---

## Parallel Execution Examples

### Phase 2 — Run simultaneously after Phase 1:
```
T009 (migration 1) ‖ T010 (migration 2) ‖ T013 (Zod schemas) ‖ T014 (referral code gen) ‖ T015 (rate limit)
                                         T011 (apply migrations — after T009 + T010)
                                         T016 (middleware — after T013)
```

### Phase 3 (US1) — Run simultaneously after Phase 2:
```
T017 (registerUser action — FIRST, sequential)
     └──► T018 (register page.tsx) ‖ T020 (loading.tsx) ‖ T021 (error.tsx)
               └──► T019 (RegistrationForm — after T018, needs page to exist)
```

### Phase 5 (US3 Dashboard) — Run simultaneously after US1+US2:
```
T027 (dashboard page.tsx — FIRST, sequential)
     └──► T028 (BalanceCard) ‖ T029 (PackageStatusBadge) ‖ T031 (loading) ‖ T032 (error)
               └──► T030 (ReferralTool — after T027, receives referral_code prop)
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 — Both P1)

1. ✅ Complete **Phase 1**: Setup — project boots, clients work
2. ✅ Complete **Phase 2**: Foundational — DB, middleware, helpers
3. ✅ Complete **Phase 3**: US1 Registration — full reg flow with referral validation
4. ✅ Complete **Phase 4**: US2 Login — login, rate limiting
5. 🎯 **STOP AND VALIDATE**: Registration + Login work end-to-end; the MLM onboarding gate is operational
6. Continue to Phase 5 (Dashboard) → Phase 6 (Session) → Phase 7 (Polish)

### Incremental Delivery

| Milestone | Phases Complete | What Works |
|---|---|---|
| Foundation | 1 + 2 | DB schema, middleware route guards |
| Auth MVP | + 3 + 4 | Full registration + login with MLM referral enforcement |
| Full Dashboard | + 5 | Balance card, package status, referral copy tool |
| Session Complete | + 6 | Logout, session expiry, 7-day sliding window |
| Production-Ready | + 7 | RTL audit, ARIA, contrast, acceptance tests all passed |

---

## Notes

- `[P]` = different files, no dependency on an incomplete task in the same phase — safe to parallelize
- `[Story]` label maps each task to the spec.md user story for traceability
- No test tasks generated (not requested in spec)
- **T017 is the most critical single task** — the `registerUser` action encodes the MLM referral gate; implement it first and test manually before building any UI
- **T043 (seed root user)** must be done before any registration attempt can succeed — do this before demoing US1
- Commit after each phase checkpoint at minimum; commit after each [P] task group ideally
- Never edit migration files after applying them — create new migrations for schema fixes
