# Data Model: App Downloads Profit

**Branch**: `013-app-downloads-profit` | **Date**: 2026-04-25

## Entity Summary

| Entity | Table | Purpose |
|---|---|---|
| App Profit Offer | `public.app_profit_offers` | Admin-managed app download earning offers |
| App Profit Submission | `public.app_profit_submissions` | User screenshot proof and review lifecycle |
| User Isolated Wallet | `public.user_isolated_wallets` | Separate app-profit balance and app package qualification |
| App Profit Withdrawal | `public.app_profit_withdrawals` | Friday-only withdrawal requests reviewed by admin |

## `public.app_profit_offers`

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
title TEXT NOT NULL
download_url TEXT NOT NULL
reward_usd NUMERIC(10,2) NOT NULL CHECK (reward_usd > 0)
provider TEXT NOT NULL
required_tier TEXT NOT NULL DEFAULT 'none'
is_active BOOLEAN NOT NULL DEFAULT true
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Validation**:
- Provider accepts MyLead, CPAlead, Tapjoy, or any non-empty provider label.
- `required_tier` is text to support current tiers and future app package labels.

## `public.app_profit_submissions`

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
offer_id UUID NOT NULL REFERENCES public.app_profit_offers(id) ON DELETE RESTRICT ON UPDATE CASCADE
user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE
screenshot_url TEXT NOT NULL
status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected'))
rejection_reason TEXT
reviewed_at TIMESTAMPTZ
reviewed_by UUID REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Indexes**:
- Unique partial index on `(user_id, offer_id)` where status in `pending_review`, `approved`.
- Admin queue index on pending submissions by `created_at`.
- User history index on `(user_id, created_at DESC)`.

## `public.user_isolated_wallets`

```sql
user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE
app_profits_balance NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (app_profits_balance >= 0)
other_tasks_balance NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (other_tasks_balance >= 0)
deposit_balance NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (deposit_balance >= 0)
app_package_amount NUMERIC(10,2) CHECK (app_package_amount IN (200,300,400,500,600) OR app_package_amount IS NULL)
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

**Access Gate**:
- Rank qualifies when `users.leadership_level >= 1`.
- Main package qualifies when `users.current_package_level` is B1, B2, or B3.
- App package qualifies when `app_package_amount` is 200, 300, 400, 500, or 600.

## `public.app_profit_withdrawals`

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE
amount NUMERIC(12,2) NOT NULL CHECK (amount > 0)
status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','rejected'))
rejection_reason TEXT
reviewed_at TIMESTAMPTZ
reviewed_by UUID REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
```

## RPCs

| Function | Caller | Purpose |
|---|---|---|
| `user_submit_app_profit_proof(p_offer_id, p_screenshot_url)` | User session | Checks access, active offer, duplicate guard, inserts pending submission |
| `admin_approve_app_profit_submission(p_submission_id)` | Admin session | Locks pending submission, approves it, increments `app_profits_balance` |
| `admin_reject_app_profit_submission(p_submission_id, p_reason)` | Admin session | Locks pending submission and rejects it |
| `user_submit_app_profit_withdrawal(p_amount)` | User session | Friday-only validation, locks wallet, debits/reserves amount, inserts pending withdrawal |
| `admin_mark_app_profit_withdrawal_paid(p_withdrawal_id)` | Admin session | Marks pending withdrawal paid |
| `admin_reject_app_profit_withdrawal(p_withdrawal_id, p_reason)` | Admin session | Marks pending withdrawal rejected and refunds app-profit balance |

## RLS

- Offers: authenticated users can select active offers; admins can manage all.
- Submissions: users can select their own; admins can select/update all; inserts happen through RPC.
- Wallets: users can select own wallet; admins can select all; mutations happen through RPC/admin actions.
- Withdrawals: users can select own withdrawals; admins can select/update all; inserts happen through RPC.
