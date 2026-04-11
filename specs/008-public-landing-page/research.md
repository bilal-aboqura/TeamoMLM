# Research: Landing Page & Shared Public UI (Module 008)

## Decision 1: Route Group Strategy for Public Pages

**Decision**: Use a `(public)` route group (`app/(public)/`) with a dedicated `layout.tsx` that wraps all public-facing pages (landing page, auth pages if desired).

**Rationale**: Next.js App Router route groups `(name)` are grouping conventions only — they don't affect the URL path. This lets `app/(public)/layout.tsx` inject `PublicNavbar` + `PublicFooter` without touching the root `app/layout.tsx` (which handles font and `dir="rtl"`). Auth pages already exist at `app/(auth)/` without their own layout, so the public layout only wraps the landing page at `/`.

**Key constraint discovered**: The current `middleware.ts` redirects `/` to `/login` for unauthenticated users and `/dashboard` for authenticated users. This must be changed: unauthenticated users at `/` should see the landing page, not be redirected to `/login`. The middleware must be updated to only redirect authenticated users from `/` → `/dashboard`.

**Alternatives considered**:
- Modifying root `app/layout.tsx` directly → rejected because it would force the Navbar/Footer onto authenticated dashboard pages
- Co-locating landing page at `app/page.tsx` with no route group → accepted for the page itself, but Navbar/Footer need a layout wrapper that doesn't apply globally

---

## Decision 2: PublicNavbar — Scroll-Triggered Glass Effect

**Decision**: `PublicNavbar` is a `"use client"` component. It uses a `useEffect` + `addEventListener('scroll', ...)` to set a boolean state `isScrolled` when `window.scrollY > 64`. This drives a conditional `className` toggling between transparent and `bg-white/80 backdrop-blur-md border-b border-slate-200/50`.

**Rationale**: Scroll event detection requires the browser `window` API — this mandates a Client Component. The scroll threshold of ~64px (8-rem) corresponds to roughly one hero-section heading line, giving a smooth and intentional feel. The transition is driven by Tailwind `transition-all duration-300` applied to the nav element.

**`"use client"` justification**: Required for `window.addEventListener('scroll')` and `useState` — constitutionally mandated justification comment will be included.

**Alternatives considered**:
- CSS `position: sticky` with `@supports` backdrop-filter hack → not reliable for conditional class toggling
- Intersection Observer on Hero section → more elegant but adds complexity for no benefit

---

## Decision 3: PackagesPreview — Server + Static Fallback Pattern

**Decision**: `PackagesPreviewSection` is a Server Component that calls a new `getPublicPackages()` data function using the **anon Supabase client** (not the service-role admin client). If the fetch returns `null` / empty / throws, it falls back to a `STATIC_PACKAGES_FALLBACK` constant array defined in the same `data.ts` file.

**Rationale**: The anon client is appropriate here — anonymous users shouldn't need elevated permissions to read marketing data. The static fallback mirrors seed data, ensuring the section never renders blank. No new RLS policies needed if packages are already readable anonymously (existing policy check: `is_active = true` select is public).

**Column shape needed**: `name`, `price`, `daily_task_count`, `daily_profit`, `display_order` — same shape as the existing `PackageWithStatus` minus the `userStatus` field and `id`. A new read-only type `PublicPackage` is defined.

**Alternatives considered**:
- Using `createAdminClient()` for the fetch → rejected (overkill for public data, service role key must not be used in packages exposed to anonymous SSR)
- Fetching on the client with `useEffect` → rejected (constitution: no client-side Supabase calls for initial data load)

---

## Decision 4: `app/page.tsx` — Landing Page Entry Point

**Decision**: `app/page.tsx` becomes the landing page. It is a Server Component that renders `HeroSection`, `FeaturesSection`, and `PackagesPreviewSection`. The middleware change handles the authenticated user redirect. No need to move `page.tsx` into `(public)/` because the route group layout can be applied via a co-located `layout.tsx` at the `app/` level OR by restructuring into `(public)`.

**Final structure**: `app/(public)/page.tsx` (landing) + `app/(public)/layout.tsx` (wraps with PublicNavbar + PublicFooter). The current `app/(auth)/` pages stay untouched — auth pages keep their own centered full-screen layout without the public navbar.

---

## Decision 5: No DB Migrations Required

**Decision**: No new migrations for this module.

**Rationale**: The `packages` table already exists from Module 002 migrations. The landing page reads from it anonymously (or uses static fallback). No new tables, columns, or RLS policies are introduced. This is confirmed by the spec: "No DB migrations are needed."

---

## Decision 6: Middleware Update Strategy

**Decision**: The `isRoot` block in `middleware.ts` must be updated to: redirect authenticated users to `/dashboard`, but let unauthenticated users pass through to the landing page.

**Current (broken for landing page)**:
```ts
if (isRoot) {
  return NextResponse.redirect(new URL(isAuthed ? '/dashboard' : '/login', request.url));
}
```

**New**:
```ts
if (isRoot && isAuthed) {
  return NextResponse.redirect(new URL('/dashboard', request.url));
}
// Unauthenticated root → pass through to landing page (no redirect)
```

**Impact**: Low risk. Unauthenticated users already had no meaningful destination at `/` (redirected to `/login`). Now they see the landing page. Auth flow is unchanged.
