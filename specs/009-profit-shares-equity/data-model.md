# Data Model: Profit Shares & Equity Purchasing

## Entities

### `profit_share_requests` (Supabase PostgreSQL Table)

This table stores all user requests to purchase equity packages.

| Field | Type | Modifiers | Description |
|-------|------|-----------|-------------|
| `id` | `uuid` | Primary Key, Default: `uuid_generate_v4()` | Unique identifier for the request. |
| `user_id` | `uuid` | Foreign Key (`auth.users.id`), Not Null | The user submitting the purchase request. |
| `sponsor_referral_code` | `text` | Not Null | The referral code of the user who referred the buyer. Must NOT be the buyer's own code. |
| `percentage` | `numeric` | Not Null | The equity percentage requested (e.g., 0.25, 1.0, 10.0). |
| `price_usd` | `numeric` | Not Null | The price of the package in USD. |
| `receipt_url` | `text` | Not Null | Path/URL to the uploaded payment screenshot in the `equity-receipts` storage bucket. |
| `status` | `enum` | Default: `'pending'` | Current status of the request: `'pending'`, `'accepted'`, `'rejected'`. |
| `created_at` | `timestamptz` | Default: `now()` | Timestamp of request submission. |
| `updated_at` | `timestamptz` | Default: `now()` | Timestamp of last status change. |

### `platform_settings` (Existing Table)

Requires the following fields to be present or added if they don't exist:

| Field | Type | Modifiers | Description |
|-------|------|-----------|-------------|
| `usdt_wallet_address` | `text` | Nullable | The official platform wallet address shown to users for manual transfers. |

*Note on Global Equity Counter*: The total sold equity is a derived value calculated dynamically via `SUM(percentage) FROM profit_share_requests WHERE status = 'accepted'`.

## Storage Buckets

### `equity-receipts`
- **Purpose**: Stores payment screenshots uploaded by users during the purchase flow.
- **File Types**: Images only (JPEG, PNG, WebP).

## Security & Row Level Security (RLS)

### `profit_share_requests` Table
- **SELECT**: 
  - Users can select rows where `auth.uid() = user_id`.
  - Admins can select all rows.
- **INSERT**: 
  - Users can insert rows where `auth.uid() = user_id`. 
  - *Server-side Validation*: Must verify the 10% per-user cap and remaining global equity before insertion.
- **UPDATE**: 
  - Admins can update all rows (specifically the `status` field).
- **DELETE**: 
  - Restricted for all users (soft delete or no delete policy).

### `equity-receipts` Bucket
- **INSERT**: Authenticated users can upload files.
- **SELECT**: Admins can view files. Submitting users can view their own files.

## Business Rules & Constraints

1. **10% Per-User Cap**: A user cannot hold more than 10% total approved equity across all their accepted requests. This must be validated defensively before inserting a new request.
2. **Global 30% Cap**: The system must reject any admin approval that would cause `SUM(accepted percentages) + new_percentage` to exceed 30%.
3. **Atomic Admin Approval**: Approvals must use an atomic `UPDATE` with `status = 'pending'` in the `WHERE` clause to prevent race conditions.
4. **Referral Validation**: The `sponsor_referral_code` must map to an existing user in the system, and that user cannot be the `user_id` making the purchase.
