# Quickstart: Landing Page & Shared Public UI (Module 008)

## What This Module Does

Implements the public-facing landing page at `/`. Unauthenticated visitors see a premium Arabic RTL marketing page — not the login redirect they previously received. The module adds a scroll-aware navbar, a CSS-animated hero, a features section, and a live packages preview with static fallback.

## Files To Work On (in order)

| Order | File | Type | Action |
|-------|------|------|--------|
| 1 | `middleware.ts` | Modify | Change `isRoot` to only redirect authenticated users |
| 2 | `app/(public)/_data/public-packages.ts` | NEW | `PublicPackage` type + `STATIC_PACKAGES_FALLBACK` + `getPublicPackages()` |
| 3 | `components/public/PublicNavbar.tsx` | NEW | Client component with scroll listener |
| 4 | `components/public/PublicFooter.tsx` | NEW | RSC footer |
| 5 | `app/(public)/layout.tsx` | NEW | Route group layout wrapping Navbar + Footer |
| 6 | `app/(public)/_components/HeroSection.tsx` | NEW | Hero with CSS gradient/orbs |
| 7 | `app/(public)/_components/FeaturesSection.tsx` | NEW | 4 feature cards |
| 8 | `app/(public)/_components/PackagePreviewCard.tsx` | NEW | Single package card |
| 9 | `app/(public)/_components/PackagesPreviewSection.tsx` | NEW | Async RSC orchestrator |
| 10 | `app/(public)/page.tsx` | NEW | Landing page entry (RSC) |
| 11 | `app/(public)/loading.tsx` | NEW | Suspense fallback |
| 12 | `app/(public)/error.tsx` | NEW | Error boundary |
| 13 | `app/page.tsx` | DELETE | Superseded by `app/(public)/page.tsx` |

## Key Decisions

- **No migrations** — reads existing `packages` table with anon key
- **Static fallback** — `getPublicPackages()` never throws, never returns empty
- **Middleware change** — unauthenticated users at `/` now reach the landing page
- **`(public)` route group** — URL stays at `/`, layout only wraps public pages
- **`PublicNavbar` is `"use client"`** — needs `window.scrollY` — justified comment required

## RTL Constitution Rules (Critical)

✅ Use these:
- `ms-`, `me-` (margin start/end)
- `ps-`, `pe-` (padding start/end)
- `text-start`, `text-end`
- `start-0`, `end-0` (inset)
- `rounded-s-*`, `rounded-e-*`

❌ Never use these:
- `ml-`, `mr-`, `pl-`, `pr-`
- `text-left`, `text-right`
- `left-0`, `right-0` (for logical positioning)
- `shadow-lg`, `shadow-xl` (heavy shadows forbidden)

✅ Permitted shadows:
- `shadow-[0_2px_10px_rgba(0,0,0,0.02)]`
- `shadow-[0_4px_20px_rgba(0,0,0,0.02)]`
- `shadow-sm`

## Local Dev

```bash
npm run dev
# Navigate to http://localhost:3000 (or your dev port)
# You should see the landing page — NOT a redirect to /login
```

## Verify Fallback

To test the static fallback without disabling DB:

```typescript
// Temporarily in getPublicPackages(), return STATIC_PACKAGES_FALLBACK directly
// and confirm all 6 package cards render — then revert
```
