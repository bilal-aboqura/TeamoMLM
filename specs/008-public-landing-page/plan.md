# Implementation Plan: Landing Page & Shared Public UI (Module 008)

**Branch**: `008-public-landing-page` | **Date**: 2026-04-07 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/008-public-landing-page/spec.md`

---

## Summary

Build the public-facing landing page at `/` for this Arabic-RTL MLM/tasks platform. The page consists of a scroll-aware glassmorphic `PublicNavbar`, a premium Hero section (dark slate gradient + CSS emerald glow orbs), a 4-card Features section, and a Packages Preview section that fetches live package data with a hardcoded static fallback. The shared `PublicNavbar` and `PublicFooter` are mounted via a `(public)` route group layout. The middleware is updated to allow unauthenticated users to reach `/` instead of redirecting them to `/login`. No database migrations are required.

---

## Technical Context

**Language/Version**: TypeScript 5.x with Next.js 15 (App Router)  
**Primary Dependencies**: Next.js, Tailwind CSS, `@supabase/ssr`, `next/font` (Cairo, already loaded)  
**Storage**: PostgreSQL via Supabase (read-only, existing `packages` table)  
**Testing**: Manual browser verification (RTL layout, scroll behavior, responsive breakpoints, fallback rendering)  
**Target Platform**: Web (mobile-first, 320px → 2560px)  
**Performance Goals**: Above-fold interactive in < 3 seconds on mobile; packages populated in < 2 seconds  
**Constraints**: RTL logical properties only; soft shadows only; no physical directional CSS; no new npm packages; no migrations  
**Scale/Scope**: Single landing page + 2 shared components; ~6 new files total

---

## Constitution Check

| # | Principle | Gate Question | Status |
|---|-----------|---------------|--------|
| I | Architecture & Stack | Next.js App Router, Supabase anon client for read, Tailwind CSS only. No new packages introduced. Cairo font already loaded from root layout. | ✅ PASS |
| II | RTL & UI/UX | All components use RTL logical utilities (`ms-`, `me-`, `ps-`, `pe-`, `text-start`). Dark slate + emerald palette strictly followed. Only permitted soft shadows used. Cairo font inherited. | ✅ PASS |
| III | Data Integrity | No financial records written. No balance mutations. Landing page is read-only. | ✅ N/A (no writes) |
| IV | RBAC | No admin routes added. Middleware updated to allow anonymous `/` access; authenticated users still redirected to `/dashboard`. RLS not changed (packages already readable). | ✅ PASS |
| V | Component Modularity | Each component has single responsibility. All components expected < 200 lines. Server Components by default; `PublicNavbar` is `"use client"` with justified comment. `loading.tsx` + `error.tsx` for `(public)` segment. | ✅ PASS |

> No violations. Complexity Tracking table not required.

---

## Project Structure

### Documentation (this feature)

```text
specs/008-public-landing-page/
├── plan.md                         ← This file
├── research.md                     ← Phase 0 decisions
├── data-model.md                   ← PublicPackage type, static fallback
├── quickstart.md                   ← Developer orientation
├── contracts/
│   └── component-contracts.md      ← Prop types & data function contracts
└── checklists/
    └── requirements.md
```

### Source Code Changes

```text
# MODIFIED
middleware.ts                        ← isRoot redirect logic: authed→/dashboard only
app/(auth)/login/page.tsx            ← No change (stays as-is)
app/(auth)/register/page.tsx         ← No change (stays as-is)

# NEW — Route Group Layout
app/(public)/
├── layout.tsx                       ← Wraps landing page with PublicNavbar + PublicFooter
│                                       [RSC — no "use client"]
├── page.tsx                         ← Landing page entry (replaces/supersedes app/page.tsx)
│                                       [RSC — orchestrates Hero, Features, PackagesPreview]
├── loading.tsx                      ← Suspense fallback for (public) segment
├── error.tsx                        ← Error boundary for (public) segment
└── _components/
    ├── HeroSection.tsx              ← Full-viewport hero with CSS gradient orbs [RSC]
    ├── FeaturesSection.tsx          ← 4-card benefits grid [RSC, static content]
    ├── PackagesPreviewSection.tsx   ← Async RSC: fetches + falls back [RSC]
    └── PackagePreviewCard.tsx       ← Single package display card [RSC]

# NEW — Shared Public Components (used across all public pages)
components/public/
├── PublicNavbar.tsx                 ← Scroll-triggered glass effect ["use client"]
└── PublicFooter.tsx                 ← Branding + links [RSC]

# NEW — Data Layer
app/(public)/_data/
└── public-packages.ts              ← getPublicPackages() + STATIC_PACKAGES_FALLBACK + PublicPackage type
```

> **Note on `app/page.tsx`**: The current `app/page.tsx` contains only a boilerplate redirect. It will be deleted; the landing page moves to `app/(public)/page.tsx`. The `(public)` route group keeps the URL at `/`.

---

## Implementation Phases

### Phase 1 — Middleware Fix (Unblock Landing Page)

**File**: `middleware.ts`

**Change**: Update the `isRoot` block to only redirect authenticated users:

```typescript
// BEFORE:
if (isRoot) {
  return NextResponse.redirect(new URL(isAuthed ? '/dashboard' : '/login', request.url));
}

// AFTER:
if (isRoot && isAuthed) {
  // Authenticated users are redirected away from the marketing landing page
  return NextResponse.redirect(new URL('/dashboard', request.url));
}
// Unauthenticated users at / → fall through to landing page (no redirect)
```

**Risk**: Low. Unauthenticated users currently had no content at `/` (immediately redirected). This simply lets them land on the new page.

---

### Phase 2 — Shared Components (`components/public/`)

#### `PublicNavbar.tsx`

- `"use client"` — justified: requires `window.scrollY` (scroll event listener) and `useState`
- Fixed positioning, full-width, `z-50`
- RTL layout: logo on the `end` side (right in LTR = left in RTL… wait — logo should be on the start side in RTL)
  - In RTL: `start` = right side of viewport. Logo goes to `start`. Auth CTAs go to `end` (left).
  - Use `flex flex-row-reverse` or logical `justify-start` / `justify-end` with appropriate flex directions for RTL.
  - **Critical RTL detail**: In Arabic reading order, logo is at the right (start), nav links at the left (end). `dir="rtl"` on `<html>` handles this natively with `flex` — no need for `flex-row-reverse`.
- Scroll threshold state toggle:
  - `isScrolled = false`: `bg-transparent`
  - `isScrolled = true`: `bg-white/80 backdrop-blur-md border-b border-slate-200/50`
  - Transition: `transition-all duration-300 ease-out` on the `<nav>` element
- Over the dark Hero: text must remain readable → Navbar text: `isScrolled ? "text-slate-900" : "text-white"` transition
- Logo: text-based (platform name "TEMO") in `font-bold text-xl`; emerald dot accent

#### `PublicFooter.tsx`

- RSC. No data fetch.
- Background: `bg-slate-900` (dark, contrasts with page)
- Content: platform name, current year copyright, Privacy/Terms links
- Layout: centered, `py-8 px-6`
- Text: `text-slate-400` for secondary, `text-white` for branding

---

### Phase 3 — Route Group & Layout (`app/(public)/`)

#### `app/(public)/layout.tsx`

- RSC. Wraps `{children}` between `<PublicNavbar />` and `<PublicFooter />`
- `<main>` wrapper with `min-h-screen` to push footer to bottom

#### `app/(public)/page.tsx`

- RSC. Composes: `<HeroSection />`, `<FeaturesSection />`, `<PackagesPreviewSection />`
- No data fetching at this level — each section is self-contained
- SEO metadata: title `"TEMO | ابدأ رحلة أرباحك اليوم"`, description in Arabic

#### `app/(public)/loading.tsx`

- Full-page skeleton or spinner for Suspense fallback

#### `app/(public)/error.tsx`

- `"use client"` error boundary with Arabic retry message

---

### Phase 4 — Page Sections (`app/(public)/_components/`)

#### `HeroSection.tsx`

- Full viewport height: `min-h-screen`
- Background: `bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900`
- CSS glow orbs: absolutely positioned `<div>` elements with `rounded-full bg-emerald-500/20 blur-3xl animate-pulse`
  - Two orbs: one large (top-end corner), one medium (bottom-start corner)
  - Use logical inset utilities: `inset-inline-end`, or Tailwind `end-0`, `start-0`, `top-0`, `bottom-0`
- Content (centered, `z-10` relative): 
  - Eyebrow badge: `text-emerald-400 text-sm font-medium` — e.g., "منصة الأرباح والمهام"
  - H1: `text-4xl md:text-6xl font-bold text-white leading-tight` — "ابدأ رحلة أرباحك اليوم"
  - Sub: `text-lg text-slate-300 max-w-xl` — explaining daily tasks + referral earnings model
  - CTA row: Primary (`bg-emerald-600 ... hover:bg-emerald-500`) → `/register`; Secondary ghost (`border border-white/20 text-white hover:bg-white/10`) → `/login`
  - Stat badges: 3 small trust indicators (e.g., "6 مستويات إحالة", "+1000 عضو نشط", "سحب سريع")
- Padding top: `pt-24` to clear the fixed Navbar height

#### `FeaturesSection.tsx`

- Section padding: `py-20 px-6`
- Section heading: `text-2xl font-bold text-slate-900 text-center` — "لماذا TEMO؟"
- 4-card grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12`
- Each card: `bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:-translate-y-1 transition-all duration-300`
- Card content: icon (emoji or SVG), Arabic title `font-semibold text-slate-900`, Arabic description `text-sm text-slate-500 leading-relaxed`
- 4 cards:
  1. **المهام اليومية** — أكمل مهامك اليومية البسيطة واكسب أرباحاً يومية ثابتة
  2. **نظام إحالة من 6 مستويات** — ادعُ أصدقاءك وابنِ فريقك لتحقيق أرباح متعددة المستويات
  3. **سحوبات سريعة وآمنة** — اسحب أرباحك بسهولة وأمان في أي وقت تشاء
  4. **باقات VIP حصرية** — اختر الباقة التي تناسبك وضاعف أرباحك اليومية

#### `PackagesPreviewSection.tsx`

- `async` RSC. Calls `getPublicPackages()`.
- Section padding: `py-20 px-6 bg-slate-50`
- Section heading + subtext
- Grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12`
- End-of-grid CTA: "سجّل الآن وابدأ الربح" → `/register`

#### `PackagePreviewCard.tsx`

- Receives `PublicPackage` prop
- Card: `bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]`
- Highlight feature: First paid package (price > 0) marked with an emerald badge "الأكثر شعبية"
- Display: name (bold), price (emerald, large), daily tasks count, daily profit amount
- Bottom CTA: Ghost button → `/register` (or `/register?ref=...` if referral code available)

---

### Phase 5 — Data Layer (`app/(public)/_data/`)

#### `public-packages.ts`

- Exports: `PublicPackage` type, `STATIC_PACKAGES_FALLBACK` constant, `getPublicPackages()` function
- Uses `createClient()` from `@/lib/supabase/server` (anon client, no service role)
- try/catch wraps the full fetch; empty result also returns fallback
- No `userId` parameter needed — pure anonymous read

---

### Phase 6 — Cleanup

- Delete `app/page.tsx` (old boilerplate redirect — superseded by `app/(public)/page.tsx`)
- Verify no other files reference the old `app/page.tsx` in a way that would conflict

---

## Complexity Tracking

> No constitution violations. No entries required.

---

## Verification Plan

### Manual Tests

1. **Unauthenticated flow**: Navigate to `/` → landing page renders (not redirected to `/login`)
2. **Authenticated flow**: Log in → manually navigate to `/` → should redirect to `/dashboard`
3. **Navbar scroll**: Scroll down past 64px → glass effect activates smoothly; scroll back up → returns to transparent
4. **Hero**: CSS orbs visible and animated; no horizontal overflow; text legible on dark background
5. **Features section**: 4 cards render in 1-col (mobile) / 2-col (tablet) / 4-col (desktop)
6. **Packages section**: Renders all 6 packages from DB (or static fallback); 1-col → 2-col → 3-col breakpoints
7. **CTA routing**: All buttons/links lead to correct routes (`/register`, `/login`)
8. **RTL audit**: Inspect all padding/margin in DevTools — no `left`/`right` physical properties
9. **Shadow audit**: Inspect all cards — no `shadow-lg` or `shadow-xl` classes present
10. **Mobile viewport (390px)**: No horizontal scrollbar; all text legible; CTAs tappable

### Automated Verification

- `npx next build` — zero TypeScript errors
- No `console.error` in browser when packages fetch is tested with DB offline (static fallback kicks in silently)
