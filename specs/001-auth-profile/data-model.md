# Data Model: Authentication and Basic Profile (001-auth-profile)

**Phase**: 1 — Design  
**Date**: 2026-04-02  
**Branch**: `001-auth-profile`

---

## Entity Map

```
auth.users (Supabase-managed)
    │
    │ 1:1 (id → id)
    ▼
public.users
    │
    │ self-referential FK (invited_by → id)
    ▼
public.users (upline/referrer)

public.login_attempts
    (keyed by phone_number — transient, no FK to users)
```

---

## Table: `public.users`

> Extends Supabase Auth. `id` is the canonical identity shared with `auth.users`.

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| `id` | `UUID` | PK, FK → `auth.users(id)` ON DELETE CASCADE | — | Equals `auth.users.id` |
| `full_name` | `TEXT` | NOT NULL, length 2–100 | — | Arabic-friendly; no char restriction |
| `phone_number` | `TEXT` | NOT NULL, UNIQUE | — | Normalized (trimmed). Stored as registered in auth |
| `referral_code` | `TEXT` | NOT NULL, UNIQUE, length = 8 | — | Charset: `[A-Z2-9]` (32 chars), system-generated |
| `invited_by` | `UUID` | FK → `public.users(id)` ON DELETE RESTRICT, NULLABLE | NULL | NULL only for the root/seed admin account |
| `role` | `TEXT` | NOT NULL, CHECK IN ('user','admin') | `'user'` | Mirrors Supabase Auth custom claim |
| `wallet_balance` | `NUMERIC(12,2)` | NOT NULL, CHECK ≥ 0 | `0.00` | USD. Admin-write only via service role |
| `total_earned` | `NUMERIC(12,2)` | NOT NULL, CHECK ≥ 0 | `0.00` | USD. Admin-write only via service role |
| `current_package_level` | `TEXT` | NULLABLE | NULL | NULL = "غير مفعّل" (Inactive) |
| `status` | `TEXT` | NOT NULL, CHECK IN ('active','suspended') | `'active'` | Suspended users cannot be used as referrers |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | Immutable after insert |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | Auto-updated by trigger |

### Indexes
- `UNIQUE (phone_number)` — enforced at DB level (duplicate registration protection)
- `UNIQUE (referral_code)` — enforced at DB level (collision protection)
- `INDEX (invited_by)` — for MLM tree traversal queries

### RLS Policies
```sql
-- Users can read only their own profile
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Users cannot write to this table directly (all writes via server actions with service role)
-- No INSERT / UPDATE / DELETE policies for 'user' role
```

### Constitution Compliance
- ✅ `created_at` + `updated_at` on every row
- ✅ `updated_at` auto-updated by trigger
- ✅ No direct balance writes from user context (RLS blocks it + server actions use service role)
- ✅ Foreign keys with explicit ON DELETE clauses
- ✅ `invited_by` uses RESTRICT (not CASCADE) — financial safety

---

## Table: `public.login_attempts`

> Tracks consecutive failed login attempts per phone number for rate limiting.  
> Accessed exclusively via service role server actions. No RLS required.

| Column | Type | Constraints | Default | Notes |
|--------|------|-------------|---------|-------|
| `phone_number` | `TEXT` | PK | — | Same normalization as `public.users.phone_number` |
| `attempt_count` | `INT` | NOT NULL, CHECK ≥ 0 | `0` | Incremented on each failed login |
| `last_attempt_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | Updated on each attempt |
| `locked_until` | `TIMESTAMPTZ` | NULLABLE | NULL | Set to `now() + '15 minutes'` after 5 failures |
| `created_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | Audit trail |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL | `now()` | Auto-updated by trigger |

---

## Migration Files

Two versioned SQL migration files (append-only, never edited post-merge):

### `supabase/migrations/20260402000001_create_users_table.sql`

```sql
-- ============================================================
-- Migration: Create public.users table
-- Feature: 001-auth-profile
-- ============================================================

-- Auto-update trigger function (reusable across tables)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Users table
CREATE TABLE public.users (
  id                    UUID          PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name             TEXT          NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 100),
  phone_number          TEXT          NOT NULL UNIQUE,
  referral_code         TEXT          NOT NULL UNIQUE CHECK (char_length(referral_code) = 8),
  invited_by            UUID          REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  role                  TEXT          NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  wallet_balance        NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (wallet_balance >= 0),
  total_earned          NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_earned >= 0),
  current_package_level TEXT,
  status                TEXT          NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Auto-update trigger
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes
CREATE INDEX idx_users_invited_by ON public.users(invited_by);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only read their own row
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Comments
COMMENT ON TABLE public.users IS 'Platform user profiles, extending Supabase auth.users.';
COMMENT ON COLUMN public.users.invited_by IS 'UUID of the upline user whose referral code was used. NULL for root/seed admin accounts only.';
COMMENT ON COLUMN public.users.wallet_balance IS 'Available balance in USD. Admin-write only.';
COMMENT ON COLUMN public.users.total_earned IS 'Cumulative earned amount in USD. Admin-write only.';
COMMENT ON COLUMN public.users.referral_code IS 'System-generated 8-char code from charset [A-Z2-9], unique platform-wide.';
```

### `supabase/migrations/20260402000002_create_login_attempts_table.sql`

```sql
-- ============================================================
-- Migration: Create public.login_attempts table
-- Feature: 001-auth-profile
-- ============================================================

CREATE TABLE public.login_attempts (
  phone_number    TEXT        PRIMARY KEY,
  attempt_count   INT         NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_until    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER login_attempts_updated_at
  BEFORE UPDATE ON public.login_attempts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- No RLS — accessed exclusively via service role server actions
COMMENT ON TABLE public.login_attempts IS 'Tracks failed login attempts per phone number for rate limiting. Service role access only.';
COMMENT ON COLUMN public.login_attempts.locked_until IS 'When set and in the future, all login attempts for this phone are rejected.';
```

---

## State Transitions

### User Account Status
```
[created] → active (default on registration)
              │
              ▼ (admin action — future module)
           suspended
              │
              ▼ (admin action — future module)
            active
```

### Login Attempt Counter
```
[no record] → attempt_count = 1 (first failure)
              → attempt_count = 2..4 (further failures)
              → attempt_count = 5 → locked_until = now() + 15min
              → [success at any point] → record deleted / reset
              → [locked_until passes] → accepts attempts again (auto-reset)
```

---

## Validation Rules (Zod Schema — server-side)

```typescript
// Shared validation rules (technology reference for implementation)
const registrationSchema = z.object({
  full_name:     z.string().min(2).max(100),
  phone_number:  z.string().min(7).max(20).transform(s => s.trim()),
  password:      z.string().min(8).max(72),  // bcrypt max
  referral_code: z.string().length(8).regex(/^[A-Z2-9]{8}$/)
                   .or(z.string().min(1)),   // allow pre-filled user-typed values before server validates
});

const loginSchema = z.object({
  phone_number: z.string().min(7).max(20).transform(s => s.trim()),
  password:     z.string().min(1),           // existence only; wrong password handled by Supabase
});
```
