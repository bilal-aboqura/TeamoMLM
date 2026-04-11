# Server Action Contracts: Authentication and Basic Profile (001-auth-profile)

**Phase**: 1 — Interface Contracts  
**Date**: 2026-04-02  
**Branch**: `001-auth-profile`  
**Type**: Next.js Server Actions (no public HTTP API; called from Client Components via `action=` props)

---

## Overview

This feature exposes **3 Server Actions** and **1 Server-side data fetch** (no Route Handlers). All actions are in `app/(auth)/actions.ts`.

---

## Action 1: `registerUser`

**File**: `app/(auth)/actions.ts`  
**Exported as**: `registerUser`  
**Access**: Public (no auth required)

### Input (FormData fields)

| Field | Type | Constraint |
|-------|------|------------|
| `full_name` | string | 2–100 chars |
| `phone_number` | string | 7–20 chars, trimmed |
| `password` | string | min 8 chars |
| `referral_code` | string | non-empty |

### Processing Steps (ordered, fail-fast)
1. Validate input with Zod → if invalid, return field-level errors immediately (no DB hit)
2. Normalize `phone_number` (trim whitespace)
3. Query: `SELECT id, status FROM public.users WHERE referral_code = $1`
   - No row → `{ error: { field: 'referral_code', message: 'كود الإحالة غير صحيح' } }`
   - Row with `status = 'suspended'` → same error (no status leakage)
4. Generate unique referral code for new user (8-char, charset `[A-Z2-9]`, uniqueness-checked)
5. Create auth user: `supabase.auth.admin.createUser({ phone, password })`
   - On auth failure (e.g., phone taken in auth.users) → `{ error: { field: 'phone_number', message: 'رقم الهاتف مستخدم بالفعل' } }`
6. Insert `public.users` row with `invited_by = upline.id`
   - On unique violation (phone_number) → delete auth user (compensate) → return duplicate phone error
7. Establish session: `supabase.auth.signInWithPassword({ phone, password })` → set session cookie
8. Return `{ success: true }` → client redirects to `/dashboard`

### Success Response
```typescript
{ success: true }
```

### Error Response
```typescript
{
  error: {
    field: 'referral_code' | 'phone_number' | 'password' | 'full_name' | 'general',
    message: string  // Arabic string
  }
}
```

---

## Action 2: `loginUser`

**File**: `app/(auth)/actions.ts`  
**Exported as**: `loginUser`  
**Access**: Public (no auth required)

### Input (FormData fields)

| Field | Type | Constraint |
|-------|------|------------|
| `phone_number` | string | 7–20 chars |
| `password` | string | non-empty |

### Processing Steps (ordered, fail-fast)
1. Validate input with Zod → if blank fields, return error
2. Normalize `phone_number`
3. Query `public.login_attempts WHERE phone_number = $1`
   - If `locked_until > now()` → `{ error: { field: 'general', message: 'تم تجاوز عدد المحاولات المسموح بها. يرجى المحاولة بعد 15 دقيقة.' } }`
4. Call `supabase.auth.signInWithPassword({ phone, password })`
5. On auth failure:
   - UPSERT `login_attempts`: increment `attempt_count`, update `last_attempt_at`
   - If `attempt_count >= 5`: set `locked_until = now() + interval '15 minutes'`
   - Return `{ error: { field: 'general', message: 'رقم الهاتف أو كلمة المرور غير صحيحة' } }`
6. On auth success:
   - DELETE or RESET `login_attempts` row for this phone
   - Set session cookie via `@supabase/ssr`
   - Return `{ success: true }` → client redirects to `/dashboard`

### Success Response
```typescript
{ success: true }
```

### Error Response
```typescript
{
  error: {
    field: 'general',
    message: string  // Arabic string
  }
}
```

---

## Action 3: `logoutUser`

**File**: `app/(auth)/actions.ts`  
**Exported as**: `logoutUser`  
**Access**: Authenticated users only

### Processing Steps
1. Call `supabase.auth.signOut()` (server-side, clears cookie)
2. Return `{ success: true }` → client redirects to `/login`

### Success Response
```typescript
{ success: true }
```

---

## Server-Side Data Fetch: `getCurrentUserProfile`

**File**: `app/dashboard/_components/` (called from Server Component)  
**Type**: Async server function (not a Server Action — no form submission)  
**Access**: Authenticated users only (enforced by middleware redirect)

### Returns
```typescript
{
  id: string,
  full_name: string,
  phone_number: string,
  referral_code: string,
  wallet_balance: number,   // USD
  total_earned: number,     // USD
  current_package_level: string | null,
  status: 'active' | 'suspended'
}
```

### Query
```sql
SELECT id, full_name, phone_number, referral_code,
       wallet_balance, total_earned, current_package_level, status
FROM public.users
WHERE id = auth.uid()
LIMIT 1;
```
> RLS enforces user-scoped access — no WHERE clause risk.

---

## Middleware Contract

**File**: `middleware.ts` (project root)

| Route Pattern | Authenticated | Unauthenticated |
|---|---|---|
| `/dashboard/**` | Allow | Redirect → `/login` |
| `/login` | Redirect → `/dashboard` | Allow |
| `/register` | Redirect → `/dashboard` | Allow |
| `/` (root) | Redirect → `/dashboard` | Redirect → `/login` |
| All other routes | Pass through | Pass through |

Middleware uses `createServerClient` from `@supabase/ssr` and calls `supabase.auth.getUser()` (not `getSession()` — `getUser()` validates the JWT server-side on every request, which is the secure pattern).
