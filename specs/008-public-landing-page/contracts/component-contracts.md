# Interface Contracts: Landing Page & Shared Public UI (Module 008)

> This module exposes no new API endpoints or RPC functions.
> Contracts here describe the **component interface contracts** (prop types)
> for shared public layout components that other modules may consume.

---

## Component Contracts

### `PublicNavbar` — `components/public/PublicNavbar.tsx`

```typescript
// "use client" — requires window.scrollY for glassmorphic scroll trigger
// No props. Reads no server data. Self-contained scroll-aware nav.
export function PublicNavbar(): JSX.Element
```

**Behaviour**:
- Renders fixed at top of viewport (`position: fixed`, full width)
- `isScrolled` state: `false` → transparent; `true` → `bg-white/80 backdrop-blur-md border-b border-slate-200/50`
- Scroll threshold: `window.scrollY > 64`
- Transition: `transition-all duration-300 ease-out`

---

### `PublicFooter` — `components/public/PublicFooter.tsx`

```typescript
// Server Component. No props.
export function PublicFooter(): JSX.Element
```

**Renders**: Platform name, copyright year (auto-derived), and placeholder links for Privacy Policy, Terms of Service.

---

### `HeroSection` — `app/(public)/_components/HeroSection.tsx`

```typescript
// Server Component. No props.
export function HeroSection(): JSX.Element
```

**Renders**: Full-viewport-height hero with dark slate gradient + CSS animated emerald glow orbs. Contains Arabic headline, subheadline, and two CTA `<Link>` elements.

---

### `FeaturesSection` — `app/(public)/_components/FeaturesSection.tsx`

```typescript
// Server Component. No props. Static content.
export function FeaturesSection(): JSX.Element
```

**Renders**: Section header + 4-card grid. Card data is a hardcoded constant — no fetch.

---

### `PackagesPreviewSection` — `app/(public)/_components/PackagesPreviewSection.tsx`

```typescript
// Server Component. Fetches via getPublicPackages().
export function PackagesPreviewSection(): Promise<JSX.Element>
```

**Internal data flow**:
```
PackagesPreviewSection (Server, async)
  └── calls getPublicPackages() → PublicPackage[]
        ├── tries: supabase anon client → packages table
        └── catch/empty: returns STATIC_PACKAGES_FALLBACK
  └── renders: PackagePreviewCard[] (one per package)
```

---

### `PackagePreviewCard` — `app/(public)/_components/PackagePreviewCard.tsx`

```typescript
type PackagePreviewCardProps = {
  pkg: PublicPackage;
  referralCode?: string; // optional, preserved if in URL
};

// Server Component.
export function PackagePreviewCard({ pkg, referralCode }: PackagePreviewCardProps): JSX.Element
```

---

## Data Function Contract

### `getPublicPackages()` — `app/(public)/_data/public-packages.ts`

```typescript
export async function getPublicPackages(): Promise<PublicPackage[]>
```

**Guarantee**: Never throws, never returns empty array. On any failure → returns `STATIC_PACKAGES_FALLBACK`.

**Implementation contract**:
1. Create anon Supabase client via `createClient()` (server)
2. Query: `SELECT name, price, daily_task_count, daily_profit, display_order FROM packages WHERE is_active = true ORDER BY display_order ASC`
3. If `data` is null, undefined, or length === 0 → return `STATIC_PACKAGES_FALLBACK`
4. If any exception → catch and return `STATIC_PACKAGES_FALLBACK`
