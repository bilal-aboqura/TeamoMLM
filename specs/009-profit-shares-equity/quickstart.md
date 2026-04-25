# Quickstart: Profit Shares & Equity Purchasing

## 1. Setup Supabase Storage

1. Go to your Supabase Dashboard.
2. Navigate to **Storage** -> **New Bucket**.
3. Create a bucket named `equity-receipts`.
4. Set it to **Public** if receipts need to be easily viewable by admins, or configure RLS if they should be strictly protected.
5. Create RLS policies for `equity-receipts`:
   - `INSERT`: Authenticated users can insert.
   - `SELECT`: Only the owner (user who uploaded) or users with `role = 'admin'` can view.

## 2. Setup Database Tables

Execute the following SQL in the Supabase SQL Editor:

```sql
CREATE TYPE profit_share_status AS ENUM ('pending', 'accepted', 'rejected');

CREATE TABLE profit_share_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    sponsor_referral_code TEXT NOT NULL,
    percentage NUMERIC NOT NULL,
    price_usd NUMERIC NOT NULL,
    receipt_url TEXT NOT NULL,
    status profit_share_status DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- RLS Policies
ALTER TABLE profit_share_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own requests"
ON profit_share_requests FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own requests"
ON profit_share_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Note: Admin policies assume you have a way to identify admins (e.g., custom claims or an admins table)
-- Example assuming an `admins` table:
CREATE POLICY "Admins can view all requests"
ON profit_share_requests FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));

CREATE POLICY "Admins can update requests"
ON profit_share_requests FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));
```

## 3. Verify Admin Settings Table

Ensure your existing `platform_settings` table contains `usdt_wallet_address`. If not, add it:

```sql
ALTER TABLE platform_settings ADD COLUMN usdt_wallet_address TEXT;
```
