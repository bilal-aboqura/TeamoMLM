# Research: Authentication and Basic Profile (001-auth-profile)

**Phase**: 0 — Pre-Design Research  
**Date**: 2026-04-02  
**Branch**: `001-auth-profile`

---

## 1. Authentication Strategy: Phone + Password via Supabase Auth

### Decision
Use Supabase Auth with **phone number stored as the login identifier**. Supabase Auth natively supports phone-based auth via OTP, but since password recovery via OTP is out of scope (per spec Assumptions), we use a **custom approach**: store the phone number as the user's "email" field in `auth.users` (formatted as `phone@temo.internal` or use a dedicated phone column) combined with a password.

**Preferred approach after research**: Use Supabase Auth's **email+password sign-up** where the "email" field stores the phone number in a canonical form (e.g., `+962799123456`). Supabase Auth does support phone sign-in with OTP natively, but since we do NOT want OTP (password-based only), the cleanest constitution-compliant path is:
- Store phone as `phone` field in `auth.users` (Supabase supports this without OTP if configured)
- Use `supabase.auth.signInWithPassword({ phone, password })` 
- Supabase supports this natively — **no workaround needed**.

### Rationale
Supabase Auth's `signInWithPassword` accepts `{ phone, password }` directly. This avoids the "phone-as-email" hack. The `auth.users` table then holds `phone` natively.

### Alternatives Considered
- **Email field to store phone**: Rejected — misleading schema, brittle, breaks if Supabase validates email format.
- **Custom JWT auth**: Rejected — constitution forbids third-party auth libraries.
- **OTP SMS flow**: Out of scope per spec; password reset feature deferred.

---

## 2. Referral Code Validation Flow (Critical MLM Business Logic)

### Decision
The referral code validation MUST be a **server-side check performed before** calling `supabase.auth.signUp()`. The flow is:

```
Server Action: registerUser(formData)
  1. Validate all fields with Zod schema
  2. Query: SELECT id FROM public.users WHERE referral_code = $1 AND status = 'active'
  3. If no rows → return error { field: 'referral_code', message: 'كود الإحالة غير صحيح' }
  4. Store upline_user_id from result
  5. Call supabase.auth.admin.createUser({ phone, password }) [server-side only]
  6. On auth success → INSERT INTO public.users (id, full_name, phone_number, referral_code, invited_by, ...) VALUES (auth_user.id, ...)
  7. On any failure → delete auth user if created (compensating transaction)
```

### Why `auth.admin.createUser` instead of `signUp`
- `supabase.auth.signUp()` from the client can be intercepted and the referral code pre-check bypassed.
- Using the **Service Role** server-only admin client ensures the user is only created after the referral code is validated server-side.
- The Server Action runs exclusively on the server — no client bundle exposure.

### Alternatives Considered
- **DB trigger on `auth.users` insert**: Rejected — triggers cannot easily return user-facing Arabic error messages and can't abort the auth creation cleanly.
- **Client-side pre-check + server sign-up**: Rejected — TOCTOU race condition; constitution forbids trusting client-side validation.

---

## 3. Rate Limiting: Failed Login Cooldown

### Decision
Implement account-level rate limiting via a **`login_attempts` table** in PostgreSQL:

```sql
CREATE TABLE public.login_attempts (
  phone_number TEXT NOT NULL,
  attempt_count INT NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ DEFAULT now(),
  locked_until TIMESTAMPTZ,
  PRIMARY KEY (phone_number)
);
```

**Flow in Server Action `loginUser(formData)`:**
1. Query `login_attempts` for the phone number.
2. If `locked_until > now()` → reject immediately with Arabic cooldown message.
3. Call `supabase.auth.signInWithPassword({ phone, password })`.
4. On failure → increment `attempt_count`. If count reaches 5 → set `locked_until = now() + interval '15 minutes'`.
5. On success → DELETE or reset the `login_attempts` row.

### Rationale
- No Redis in the approved stack — PostgreSQL is the only persistence layer.
- A dedicated table avoids polluting `public.users` with transient state.
- Supabase's built-in rate limiting applies to OTP/magic-link flows, not password sign-in with custom phone auth.

### Alternatives Considered
- **Middleware IP-rate-limiting**: Rejected — IP-based limits don't track per-account brute force; a single attacker can rotate IPs.
- **Supabase built-in limits**: Partially applicable but insufficient for the 5-attempt account-level requirement.

---

## 4. Session Management: 7-Day Sliding Window

### Decision
Supabase Auth JWTs have a configurable expiry (set to **7 days** in Supabase Dashboard → Auth Settings → JWT expiry). The `@supabase/ssr` package handles automatic token refresh via cookies on every server request — this implements the "sliding window" behaviour natively.

**Configuration needed**: Supabase project settings → Auth → `JWT expiry = 604800` (7 days in seconds).

### Implementation
- Use `createServerClient` from `@supabase/ssr` in `middleware.ts` to refresh the session cookie on every request automatically.
- No custom session logic required — Supabase SSR handles it.

### Alternatives Considered
- **Manual cookie refresh**: Unnecessary complexity — `@supabase/ssr` does this.
- **Shorter JWT + refresh tokens only**: Would require custom refresh logic; Supabase handles this automatically.

---

## 5. Referral Code Generation

### Decision
Generate an 8-character code from charset `[A-Z2-9]` (excluding `0, O, I, l, 1`):
- Charset: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (32 characters)
- 8 characters = 32^8 = ~1.1 trillion combinations — collision-proof at any realistic scale
- Generation: loop with uniqueness check against `public.users.referral_code`
- Max 5 regeneration attempts before raising a server error (astronomically unlikely to fail)

### Rationale
32-char alphabet × 8 positions provides uniqueness headroom well beyond the platform's realistic user count. The exclusion of ambiguous chars (per clarification Q4) makes codes human-readable when shared in WhatsApp messages or screenshots.

---

## 6. `public.users` ↔ `auth.users` Relationship

### Decision
**Pattern**: `public.users.id` is a UUID primary key that equals `auth.users.id`. No auto-increment surrogate key.

A **PostgreSQL function + trigger** on `auth.users` INSERT is used to create the matching `public.users` row for the seed/root admin account. For regular registration, the Server Action creates both records in sequence (auth first, then public profile).

### RLS Policy Strategy
- `public.users`: Users can only SELECT their own row (`auth.uid() = id`). No user can UPDATE balance columns — those are admin-only via service role.
- `public.login_attempts`: No RLS needed (server-side only, accessed via service role).

---

## 7. `?ref=CODE` URL Parameter Auto-Fill

### Decision
The registration page (`/register`) is a **Server Component** that reads `searchParams.ref` and passes it as a prop to the `RegistrationForm` Client Component. The Client Component initializes the referral code field value from the prop.

```tsx
// app/(auth)/register/page.tsx (Server Component)
export default function RegisterPage({ searchParams }: { searchParams: { ref?: string } }) {
  return <RegistrationForm initialReferralCode={searchParams.ref ?? ''} />
}
```

This is cleaner than reading query params client-side and avoids a flash of empty → filled state.

---

## 8. Dollar Currency Formatting in RTL Context

### Decision
The `$` symbol is a LTR character. In an RTL layout, `$12.50` should ALWAYS render with `$` to the LEFT of the number. This is enforced by wrapping the amount in a `<span dir="ltr">` element, which is the ONLY justified use of inline `dir="ltr"` per the constitution (scoped to numeric display, not layout).

```tsx
<span dir="ltr" className="font-mono text-emerald-500 text-3xl font-bold">
  $0.00
</span>
```
