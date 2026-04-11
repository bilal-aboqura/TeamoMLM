# Quickstart: Authentication and Basic Profile (001-auth-profile)

**Date**: 2026-04-02 | **Branch**: `001-auth-profile`

---

## Prerequisites

- Node.js 18+
- A Supabase project (URL + anon key + service role key)
- Next.js project initialized with Tailwind CSS and Cairo/Tajawal font configured

---

## Environment Variables

Add to `.env.local` (never commit):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # Server-side only
```

---

## Supabase Configuration

In **Supabase Dashboard → Auth Settings**:
- **JWT expiry**: `604800` (7 days = 7 × 86400 seconds)
- **Phone provider**: Enable phone sign-in (password-based, no OTP required for this feature)
- **Disable email confirmations** for development (enable in production)

---

## Database Migrations

Run in order from `supabase/migrations/`:

```bash
# Apply both migrations
supabase db push
# or for local dev:
supabase migration up
```

Files to apply:
1. `20260402000001_create_users_table.sql`
2. `20260402000002_create_login_attempts_table.sql`

---

## Source Code Structure

```text
app/
├── (auth)/
│   ├── login/
│   │   ├── page.tsx           # Server Component — login page
│   │   ├── loading.tsx        # Loading state
│   │   └── error.tsx          # Error boundary
│   ├── register/
│   │   ├── page.tsx           # Server Component — reads searchParams.ref
│   │   ├── loading.tsx
│   │   └── error.tsx
│   └── actions.ts             # Server Actions: registerUser, loginUser, logoutUser
│
├── dashboard/
│   ├── page.tsx               # Server Component — fetches user profile
│   ├── loading.tsx
│   ├── error.tsx
│   └── _components/
│       ├── BalanceCard.tsx        # Displays wallet_balance + total_earned (RSC)
│       ├── PackageStatusBadge.tsx # Displays current_package_level (RSC)
│       ├── ReferralTool.tsx       # Referral code + copy button (Client Component)
│       └── LogoutButton.tsx       # Triggers logoutUser action (Client Component)
│
├── layout.tsx                 # Root layout — dir="rtl" lang="ar" Cairo font
│
middleware.ts                  # Route protection + session refresh
│
lib/
├── supabase/
│   ├── client.ts              # Browser client (anon key)
│   ├── server.ts              # Server client factory (cookies)
│   └── admin.ts               # Service role client (server-only)
├── auth/
│   ├── generate-referral-code.ts  # 8-char code generator with uniqueness check
│   └── rate-limit.ts              # login_attempts table helpers
└── validations/
    └── auth-schemas.ts            # Zod schemas for registerUser + loginUser

components/
└── (empty for this feature — all components are page-scoped in _components/)

supabase/
└── migrations/
    ├── 20260402000001_create_users_table.sql
    └── 20260402000002_create_login_attempts_table.sql
```

---

## Key Implementation Notes

### 1. Root Layout Must Set RTL
```tsx
// app/layout.tsx
<html lang="ar" dir="rtl">
```

### 2. `$` Symbol in RTL — Wrap in LTR Span
```tsx
<span dir="ltr" className="font-mono text-emerald-500 font-bold text-3xl">
  ${balance.toFixed(2)}
</span>
```

### 3. Referral Code Generation Helper
```typescript
// lib/auth/generate-referral-code.ts
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 chars, no 0/O/I/l/1
export async function generateUniqueReferralCode(supabase: SupabaseClient): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = Array.from({ length: 8 }, () =>
      CHARSET[Math.floor(Math.random() * CHARSET.length)]
    ).join('');
    const { data } = await supabase.from('users').select('id').eq('referral_code', code).maybeSingle();
    if (!data) return code;
  }
  throw new Error('Failed to generate unique referral code after 5 attempts');
}
```

### 4. Middleware (Session Refresh)
```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // ... create supabase client, call getUser(), handle redirects
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
```

### 5. Server Action Pattern
```typescript
// app/(auth)/actions.ts
'use server';

export async function registerUser(formData: FormData): Promise<ActionResult> {
  const supabaseAdmin = createAdminClient(); // service role
  // ... validate → check referral code → create auth user → insert profile
}
```
