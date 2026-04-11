# Data Model: Landing Page & Shared Public UI (Module 008)

> **No new database tables or migrations are required for this module.**
> All data is read-only from existing tables. This document describes the
> **public-facing data shapes** used by the landing page components.

---

## Read-Only Data Types (TypeScript)

### `PublicPackage`

A simplified, read-only view of a subscription package for display on the public landing page. This is a subset of the authenticated `PackageWithStatus` type.

```typescript
export type PublicPackage = {
  name: string;           // Arabic package name, e.g. "باقة A1"
  price: number;          // Deposit/price in local currency (e.g. 50.00)
  daily_task_count: number; // Number of tasks per day (e.g. 3)
  daily_profit: number;   // Daily earning reward (e.g. 0.50)
  display_order: number;  // Sort order for rendering (ascending)
};
```

**Source**: `public.packages` table, columns: `name, price, daily_task_count, daily_profit, display_order`  
**Filter**: `is_active = true`  
**Sort**: `display_order ASC`  
**Auth required**: None (anonymous read)

---

### `StaticPackageFallback` (Constant Array)

A hardcoded fallback mirroring seed data. Used when the Supabase fetch fails or returns empty. Defined as a `const` array of `PublicPackage` in `app/(public)/_data/public-packages.ts`.

```typescript
export const STATIC_PACKAGES_FALLBACK: PublicPackage[] = [
  { name: "باقة A1", price: 50,    daily_task_count: 3,  daily_profit: 0.5,  display_order: 1 },
  { name: "باقة A2", price: 100,   daily_task_count: 5,  daily_profit: 1.0,  display_order: 2 },
  { name: "باقة A3", price: 200,   daily_task_count: 8,  daily_profit: 2.0,  display_order: 3 },
  { name: "باقة B1", price: 500,   daily_task_count: 10, daily_profit: 5.0,  display_order: 4 },
  { name: "باقة B2", price: 1000,  daily_task_count: 12, daily_profit: 10.0, display_order: 5 },
  { name: "باقة B3", price: 2000,  daily_task_count: 15, daily_profit: 20.0, display_order: 6 },
];
```

---

## Existing Tables Referenced (Read-Only)

| Table | Used For | Columns Read | Auth |
|---|---|---|---|
| `public.packages` | PackagesPreview section | `name, price, daily_task_count, daily_profit, display_order` | Anonymous (anon key) |

---

## No New Tables

This module introduces zero database schema changes. The checklist:

- [x] No `CREATE TABLE` statements
- [x] No `ALTER TABLE` statements  
- [x] No new RLS policies
- [x] No new migrations required
