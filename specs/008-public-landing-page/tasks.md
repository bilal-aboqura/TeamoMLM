# Tasks: Landing Page & Shared Public UI (Module 008)

**Input**: Design documents from `/specs/008-public-landing-page/`  
**Branch**: `008-public-landing-page`  
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅ | quickstart.md ✅

**Organization**: Tasks grouped by user story for independent implementation and testing.  
**Tests**: Not requested — no test tasks generated.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: Maps to user story from spec.md (US1–US4)
- **[RTL]**: Constitution II compliance tag — RTL/UI task requiring logical property enforcement
- **[ARCH]**: Constitution I compliance tag — architecture/routing task

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Unblock the landing page at `/` and scaffold the new route group.

- [x] T001 [ARCH] Update `isRoot` redirect in `middleware.ts` — remove the unauthenticated `→ /login` redirect so anonymous users reach the landing page; keep authenticated `→ /dashboard` redirect only
- [x] T002 Delete `app/page.tsx` (boilerplate redirect, superseded by `app/(public)/page.tsx`)
- [x] T003 Create `app/(public)/` directory structure: `layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`, `_components/`, `_data/`

**Checkpoint**: `npm run dev`, navigate to `http://localhost:3000` — should render a blank page (no redirect to `/login`). Authenticated users still redirect to `/dashboard`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Data layer and shared layout components that all page sections depend on.

- [x] T004 [P] Create `app/(public)/_data/public-packages.ts`: define `PublicPackage` type, `STATIC_PACKAGES_FALLBACK` constant (6 packages mirroring seed data), and `getPublicPackages()` async function (anon Supabase client → try DB fetch → catch/empty → return fallback)
- [x] T005 [P] [RTL] Create `components/public/PublicFooter.tsx` (RSC): dark `bg-slate-900` footer with platform name, auto-year copyright, and placeholder Privacy/Terms links — all RTL logical properties
- [x] T006 [RTL] [ARCH] Create `components/public/PublicNavbar.tsx` (`"use client"` — justified: requires `window.scrollY` scroll listener and `useState`): fixed positioning, transparent when `scrollY ≤ 64`, transitions to `bg-white/80 backdrop-blur-md border-b border-slate-200/50` when `scrollY > 64`, text color transitions `text-white → text-slate-900`, `transition-all duration-300 ease-out` on nav element; logo at `start`, auth CTAs at `end`
- [x] T007 [ARCH] Create `app/(public)/layout.tsx` (RSC): renders `<PublicNavbar />`, `{children}` in `<main>`, and `<PublicFooter />`; no `"use client"` needed
- [x] T008 Create `app/(public)/loading.tsx`: full-page pulse skeleton or centered spinner for Suspense fallback
- [x] T009 Create `app/(public)/error.tsx` (`"use client"` — error boundary requirement): Arabic error message with retry button

**Checkpoint**: `npm run dev` → `http://localhost:3000` renders the PublicNavbar and PublicFooter. Test scroll threshold: glass effect activates after 64px scroll.

---

## Phase 3: User Story 1 — First-Time Visitor Discovers Platform (Priority: P1) 🎯 MVP

**Goal**: Render the complete landing page at `/` with all four sections (Navbar, Hero, Features, Packages) in correct RTL Arabic layout, with all CTA buttons routing correctly.

**Independent Test**: Navigate to `/` as unauthenticated user. Verify: (1) PublicNavbar shows logo + Login + Register; (2) Hero section has Arabic H1 headline and both CTAs; (3) Features section shows 4 cards; (4) Packages section shows package cards; (5) All CTAs route to `/register` or `/login`; (6) Zero horizontal overflow at 390px viewport.

### Implementation for User Story 1

- [x] T010 [P] [US1] [RTL] Create `app/(public)/_components/HeroSection.tsx` (RSC): `min-h-screen` full-viewport dark hero; background `bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900`; two absolutely positioned CSS glow orbs (`rounded-full bg-emerald-500/20 blur-3xl animate-pulse`) using `end-0`/`start-0` inset logical utilities; overlay `z-10` content column: eyebrow badge `text-emerald-400`, H1 `text-4xl md:text-6xl font-bold text-white` ("ابدأ رحلة أرباحك اليوم"), subheadline `text-lg text-slate-300`, primary CTA `<Link href="/register">` styled `bg-emerald-600 text-white rounded-xl py-3 px-6 hover:bg-emerald-500 transition-all active:scale-95`, secondary CTA `<Link href="/login">` styled `border border-white/20 text-white rounded-xl py-3 px-6 hover:bg-white/10`; top padding `pt-24` to clear fixed navbar
- [x] T011 [P] [US1] [RTL] Create `app/(public)/_components/FeaturesSection.tsx` (RSC): static 4-card grid; section heading "لماذا TEMO؟"; grid `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12`; each card `bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:-translate-y-1 transition-all duration-300`; four cards: المهام اليومية, نظام إحالة من 6 مستويات, سحوبات سريعة وآمنة, باقات VIP حصرية — each with SVG/emoji icon, bold Arabic title, `text-sm text-slate-500 leading-relaxed` description
- [x] T012 [P] [US1] [RTL] Create `app/(public)/_components/PackagePreviewCard.tsx` (RSC): accepts `PublicPackage` prop; card `bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]`; renders package name `font-semibold text-slate-900`, price in `text-emerald-600 text-2xl font-bold`, daily task count and daily profit in secondary text; ghost CTA `<Link href="/register">` "سجّل الآن للانضمام"
- [x] T013 [US1] [RTL] Create `app/(public)/_components/PackagesPreviewSection.tsx` (async RSC): calls `getPublicPackages()`; section `py-20 px-6 bg-slate-50`; section heading + subheadline; maps packages to `<PackagePreviewCard />`; grid `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12`; end-of-section CTA "سجّل الآن وابدأ الربح" → `/register`; wraps in `<Suspense>` if needed per Next.js async RSC pattern
- [x] T014 [US1] Create `app/(public)/page.tsx` (RSC): export metadata (`title: "TEMO | ابدأ رحلة أرباحك اليوم"`, Arabic description); renders `<HeroSection />`, `<FeaturesSection />`, `<PackagesPreviewSection />` in a single `<div>`; no data fetching at this level

**Checkpoint**: Full landing page renders at `/`. All four sections visible. Both Hero CTAs and all navbar links route correctly. No TypeScript errors (`npx tsc --noEmit`).

---

## Phase 4: User Story 2 — Visitor Evaluates Platform Value (Priority: P2)

**Goal**: Features and Packages sections are fully informative — correct data, correct card design, read-only with Register CTAs. Package fallback works when DB is unavailable.

**Independent Test**: (1) Features section: 4 cards each with icon + Arabic title + description; (2) Packages section: all 6 packages displayed with name, price, daily task count, daily profit; (3) Temporarily remove DB access → packages section still renders 6 static fallback cards (no error/blank state).

### Implementation for User Story 2

- [x] T015 [US2] [RTL] Polish `PackagePreviewCard.tsx`: add emerald "الأكثر شعبية" badge to the highest-value paid package (`display_order === 4` i.e. "باقة B1" or determined by price threshold); ensure `price === 0` packages show "مجاناً" instead of price; add subtle `hover:-translate-y-1 transition-all duration-300` micro-interaction
- [x] T016 [US2] Verify static fallback: in `getPublicPackages()`, confirm try/catch is exhaustive (catches both DB errors and empty `data` arrays); add an inline comment `// Fallback: never let the marketing page render empty packages`
- [x] T017 [US2] [RTL] Add trust-indicator stat strip to `HeroSection.tsx`: a row of 3 badge-style spans below the CTA buttons showing "6 مستويات إحالة", "+1000 عضو نشط", "سحب سريع" in `text-sm text-slate-400` with a small divider between them

**Checkpoint**: All 6 package cards appear. Stat strip visible beneath Hero CTAs. Temporarily returning `STATIC_PACKAGES_FALLBACK` directly from `getPublicPackages()` renders identical output (confirming fallback parity).

---

## Phase 5: User Story 3 — Returning Visitor Uses Sticky Navbar (Priority: P3)

**Goal**: Navbar is always accessible, sticky at top, and scroll threshold glassmorphic effect works correctly at all scroll positions.

**Independent Test**: (1) Scroll past 64px → glassmorphic effect activates with smooth transition; (2) Scroll back to top → returns to transparent; (3) Login and Register links always functional; (4) On mobile (390px): logo and both auth CTAs visible without overflow.

### Implementation for User Story 3

- [x] T018 [US3] Audit `PublicNavbar.tsx` scroll behavior: confirm `useEffect` cleanup (`return () => window.removeEventListener('scroll', handler)`) is present to prevent memory leaks; confirm `threshold = 64` is a named constant (not magic number); add `will-change: contents` or Tailwind `will-change-auto` to nav if needed for GPU compositing
- [x] T019 [US3] [RTL] Ensure Navbar text over dark Hero is readable: verify `isScrolled ? "text-slate-900" : "text-white"` conditional classname applies to all nav links and the logo; the transition must be part of `transition-all duration-300` on each text element
- [x] T020 [US3] [RTL] Mobile Navbar audit: at 390px viewport, confirm logo ("TEMO") and two compact auth buttons fit without wrapping or overflow; Login link may be text-only (`text-sm`); Register button compact (`py-2 px-3 text-sm`)

**Checkpoint**: Open DevTools → scroll slowly → verify `bg-white/80 backdrop-blur-md` applied to `<nav>` at `scrollY > 64`. Resize to 390px → no overflow.

---

## Phase 6: User Story 4 — Mobile User Experience (Priority: P3)

**Goal**: Full landing page works flawlessly at 320px–768px viewports: single-column layout, no horizontal overflow, legible Arabic RTL text, tappable CTA buttons.

**Independent Test**: In Chrome DevTools at 390px (iPhone 14 profile): (1) No horizontal scrollbar; (2) HeroSection sections stack vertically; (3) Features cards 1-column; (4) Package cards 1-column; (5) All CTA buttons ≥ 44px height (minimum tap target); (6) Text direction is RTL throughout.

### Implementation for User Story 6

- [x] T021 [US4] [RTL] Responsive audit of `HeroSection.tsx`: ensure `px-6` horizontal padding (not `px-4`); H1 font size `text-4xl` on mobile → `md:text-6xl`; CTA row uses `flex flex-col sm:flex-row gap-4` so buttons stack on small screens; stat strip wraps with `flex-wrap gap-3`
- [x] T022 [US4] [RTL] Responsive audit of `FeaturesSection.tsx`: confirm `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` breakpoints; card `p-6` maintained on all sizes; no fixed width values that would break at 320px
- [x] T023 [US4] [RTL] Responsive audit of `PackagesPreviewSection.tsx` and `PackagePreviewCard.tsx`: confirm `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`; package card text does not truncate awkwardly on narrow screens; price text `text-2xl` → `text-xl` on smallest breakpoint if needed
- [x] T024 [US4] Touch target audit: all CTA `<Link>` elements have minimum `py-3` (≥ 48px effective height) to meet WCAG touch target guidance; check all Navbar auth buttons too

**Checkpoint**: Chrome DevTools responsive mode at 390px, 375px (iPhone SE), and 320px — zero horizontal scroll, all content readable and tappable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final RTL audit, constitution compliance sweep, accessibility, and SEO.

- [x] T025 [P] [RTL] Full RTL logical property audit across all new files: grep for any `ml-`, `mr-`, `pl-`, `pr-`, `text-left`, `text-right`, `left-[`, `right-[` — replace all occurrences with logical equivalents (`ms-`, `me-`, `ps-`, `pe-`, `text-start`, `text-end`, `start-[`, `end-[`)
- [x] T026 [P] [RTL] Shadow audit: grep for `shadow-lg`, `shadow-xl`, `shadow-md` across all new files — verify only `shadow-[0_2px_10px_rgba(0,0,0,0.02)]`, `shadow-[0_4px_20px_rgba(0,0,0,0.02)]`, and `shadow-sm` are used
- [x] T027 [P] SEO: ensure `app/(public)/page.tsx` exports `generateMetadata` or static `metadata` with Arabic title and description; add `<html lang="ar" dir="rtl">` verification (already in root layout — confirm it applies to `(public)` pages)
- [x] T028 ARIA audit: all interactive `<Link>` CTA elements have descriptive `aria-label` attributes in Arabic where the visible text may be ambiguous; Navbar landmark `<nav aria-label="التنقل الرئيسي">` added
- [x] T029 TypeScript validation: run `npx tsc --noEmit` — zero errors across all new and modified files
- [x] T030 Production build check: run `npx next build` — zero build errors; `app/(public)/page.tsx` must be statically rendered or ISR (no dynamic-only forced rendering)
- [x] T031 Run quickstart.md manual verification checklist — all 10 browser verification steps confirmed

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Requires Phase 1 complete — T001 (middleware), T002 (delete page.tsx), T003 (scaffolding) must finish first
- **Phase 3 (US1 — MVP)**: Requires Phase 2 complete — T004 through T009 must all be done
- **Phase 4 (US2)**: Requires Phase 3 — polishes components built in Phase 3
- **Phase 5 (US3)**: Requires Phase 3 — audits Navbar built in Phase 2
- **Phase 6 (US4)**: Requires Phase 3 — responsive audit of all Phase 3 components
- **Phase 7 (Polish)**: Requires Phases 3–6 complete

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational (Phase 2) — no other story dependencies
- **US2 (P2)**: Depends on US1 (same components, adds polish)
- **US3 (P3)**: Depends on Foundational Phase 2 (Navbar) — independent of US1 sections
- **US4 (P3)**: Depends on US1 (responsive audit of all Phase 3 components)
- **Polish**: Depends on US1–US4 all complete

### Within Each Phase

- Models/data first (`_data/`) → components → layout → pages
- Foundational components (Navbar, Footer, data layer) before section components
- Section components in parallel where possible (HeroSection, FeaturesSection are independent)

### Parallel Opportunities

- **Phase 2**: T004 (data layer), T005 (Footer), T006 (Navbar) — all different files, run in parallel
- **Phase 3**: T010 (Hero), T011 (Features), T012 (PackagePreviewCard) — all different files, run in parallel; T013 depends on T012; T014 depends on T010/T011/T013
- **Phase 7**: T025, T026, T027, T028 — audit tasks can run in parallel (different concerns)

---

## Parallel Example: Phase 3 (US1 — MVP)

```text
# Run these three tasks in parallel (different files, no shared dependencies):
T010: HeroSection.tsx         ← standalone section, no imports from other new files
T011: FeaturesSection.tsx     ← standalone section, static content only
T012: PackagePreviewCard.tsx  ← leaf component, only imports PublicPackage type from _data/

# Then sequentially:
T013: PackagesPreviewSection.tsx  ← depends on T012 (PackagePreviewCard) + T004 (data layer)
T014: page.tsx                   ← depends on T010, T011, T013

# Foundational (before Phase 3):
T004: public-packages.ts  ←  parallel with T005, T006
T005: PublicFooter.tsx    ←  parallel with T004, T006
T006: PublicNavbar.tsx    ←  parallel with T004, T005 (most complex — allocate most time)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete **Phase 1** (Setup — 3 tasks): middleware fix, delete old page.tsx, scaffold directories
2. Complete **Phase 2** (Foundational — 6 tasks): data layer + Navbar + Footer + layout + loading/error
3. Complete **Phase 3** (US1 — 5 tasks): all four sections + page entry
4. **STOP and VALIDATE**: Full landing page renders at `/`, all CTAs work, no overflow
5. Production build passes → **MVP deliverable**

### Incremental Delivery

1. Setup + Foundational → Navbar + Footer visible at `/` (skeleton page)
2. Phase 3 (US1) → Full landing page renders — **MVP 🎯**
3. Phase 4 (US2) → Polished package cards, trust stats, fallback confirmed
4. Phase 5 (US3) → Navbar scroll behavior fully tuned
5. Phase 6 (US4) → Mobile experience verified across all breakpoints
6. Phase 7 (Polish) → RTL/shadow/a11y/SEO sweep complete — **Production ready**

---

## Notes

- All tasks follow `- [ ] T### [P?] [Story?] [LABEL?] Description with file path` format
- `[RTL]` label = must enforce RTL logical properties; reviewer checks for physical direction utilities
- `[ARCH]` label = architecture-level change (middleware, route groups); higher review priority
- No test tasks generated — not requested in feature specification
- Phase 1 T001 (middleware change) is the single highest-risk task — test immediately after completion
- `getPublicPackages()` must be the very first file created (T004) — all package display depends on it
- 31 tasks total across 7 phases
