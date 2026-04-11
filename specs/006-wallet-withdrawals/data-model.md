# Data Model — Wallet & Withdrawals (006)

**Branch**: `006-wallet-withdrawals` | **Date**: 2026-04-06

---

## New Table: `public.withdrawal_requests`

```sql
CREATE TABLE public.withdrawal_requests (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID          NOT NULL REFERENCES public.users(id)
                                  ON DELETE RESTRICT ON UPDATE CASCADE,
  amount          NUMERIC(12,2) NOT NULL CHECK (amount >= 1.00),
  payment_details TEXT          NOT NULL CHECK (char_length(payment_details) BETWEEN 1 AND 200),
  status          TEXT          NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT         NULL,
  reviewed_at     TIMESTAMPTZ   NULL,
  reviewed_by     UUID          NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);
```

### Indexes
- `idx_withdrawal_requests_user_id` on `(user_id, created_at DESC)` — supports user history query (FR-014)
- Partial index on `(created_at ASC) WHERE status = 'pending'` — supports admin pending queue (future)

### RLS Policy
- `withdrawal_requests_select_own`: `FOR SELECT USING (auth.uid() = user_id)` — users see only their own
- No user-level INSERT/UPDATE/DELETE policy — all writes go through DEFINER functions or admin service role

---

## Modified Table: `public.financial_audit_log`

The `record_type` CHECK constraint must be extended to include `'withdrawal_request'`:

```sql
-- Drop old constraint
ALTER TABLE public.financial_audit_log
  DROP CONSTRAINT financial_audit_log_record_type_check;

-- Re-add with withdrawal_request included
ALTER TABLE public.financial_audit_log
  ADD CONSTRAINT financial_audit_log_record_type_check
  CHECK (record_type IN (
    'package_subscription_request',
    'task_completion_log',
    'withdrawal_request'
  ));
```

---

## Modified Table: `public.users`

No schema changes needed. The existing `wallet_balance NUMERIC(12,2) CHECK (wallet_balance >= 0)` constraint is the final safety net per FR-021. No new columns.

---

## New RPC Functions

### `public.user_submit_withdrawal(p_user_id UUID, p_amount NUMERIC, p_payment_details TEXT)`

- **Security**: `SECURITY DEFINER`  
- **Called from**: User-facing Server Action via `createAdminClient().rpc(...)`  
- **Steps**:
  1. `SELECT status, wallet_balance FROM users WHERE id = p_user_id FOR UPDATE` — row-level lock prevents concurrent race
  2. Check `status = 'active'` → RAISE if not (maps to FR-026)
  3. Check `wallet_balance >= p_amount` → RAISE if not (maps to FR-008 server-side guard)
  4. `UPDATE users SET wallet_balance = wallet_balance - p_amount WHERE id = p_user_id`
  5. `INSERT INTO withdrawal_requests ...` returning `id`
- **Returns**: `UUID` (new withdrawal request id)
- **Error signals**: `'suspended'`, `'insufficient_balance'`

### `public.admin_approve_withdrawal(p_request_id UUID, p_admin_id UUID)`

- **Security**: `SECURITY DEFINER`  
- **Called from**: Admin Server Action (Module 005 extension, future)
- **Steps**:
  1. `SELECT user_id, amount, status FROM withdrawal_requests WHERE id = p_request_id FOR UPDATE`
  2. Check `status = 'pending'` → RAISE `'not_pending'` if not
  3. `UPDATE withdrawal_requests SET status = 'approved', reviewed_at = now(), reviewed_by = p_admin_id`
  4. `INSERT INTO financial_audit_log (..., 'withdrawal_request', 'pending', 'approved', ...)`
- **Returns**: `VOID`

### `public.admin_reject_withdrawal(p_request_id UUID, p_admin_id UUID, p_reason TEXT)`

- **Security**: `SECURITY DEFINER`  
- **Called from**: Admin Server Action (Module 005 extension, future)
- **Steps**:
  1. `SELECT user_id, amount, status FROM withdrawal_requests WHERE id = p_request_id FOR UPDATE`
  2. Check `status = 'pending'` → RAISE `'not_pending'` if not
  3. `UPDATE withdrawal_requests SET status = 'rejected', rejection_reason = p_reason, reviewed_at, reviewed_by`
  4. `UPDATE users SET wallet_balance = wallet_balance + v_amount WHERE id = v_user_id` (refund per spec Assumption)
  5. `INSERT INTO financial_audit_log (..., 'withdrawal_request', 'pending', 'rejected', ...)`
- **Returns**: `VOID`

---

## State Transition Diagram

```
[User submits]
      │
      ▼
  [pending]  ◄── default on creation + balance deducted
      │
      ├──[admin_approve]──► [approved]  (balance stays deducted)
      │
      └──[admin_reject]───► [rejected]  (balance REFUNDED to user)
```

**Terminal states**: `approved` and `rejected` are immutable — no transitions out of them.

---

## Entity Relationships

```
public.users
  │
  ├── withdrawal_requests.user_id        (1 user → N withdrawal requests)
  └── withdrawal_requests.reviewed_by   (1 admin → N reviewed requests)

public.withdrawal_requests
  └── financial_audit_log.record_id     (1 request → N audit entries, typically 1)
```
