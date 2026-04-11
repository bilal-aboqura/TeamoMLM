# Quickstart: Packages & Daily Tasks (002-packages-tasks)

**Branch**: `002-packages-tasks`
**Date**: 2026-04-02
**Prerequisite**: `001-auth-profile` fully deployed and migrations applied.

---

## Environment Requirements

No new environment variables required. This feature uses the same variables as `001-auth-profile`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # server-only
```

---

## Step 1: Apply Database Migrations

Run the 6 new migration files in order (sequential numbering continues from `001-auth-profile`):

```bash
# From repo root — applies all pending migrations
supabase db push

# Or individually via Supabase Dashboard → SQL Editor if using hosted Supabase
```

**Migrations in this feature (apply in order)**:

| File | Creates |
|---|---|
| `20260402000003_create_packages_table.sql` | `public.packages` |
| `20260402000004_create_admin_settings_table.sql` | `public.admin_settings` |
| `20260402000005_create_package_sub_requests_table.sql` | `public.package_subscription_requests` |
| `20260402000006_create_tasks_table.sql` | `public.tasks` |
| `20260402000007_create_task_completion_logs_table.sql` | `public.task_completion_logs` |
| `20260402000008_create_financial_audit_log.sql` | `public.financial_audit_log` |

**Verify**: Check all 6 tables exist in Supabase Dashboard → Table Editor.

---

## Step 2: Create the `proofs` Storage Bucket

Run this in Supabase Dashboard → SQL Editor:

```sql
-- Create private storage bucket for receipt and proof images
INSERT INTO storage.buckets (id, name, public)
VALUES ('proofs', 'proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Block all authenticated user access (service role bypasses RLS)
CREATE POLICY "proofs_no_user_access" ON storage.objects
  FOR ALL TO authenticated USING (false);
```

**Verify**: Dashboard → Storage → Buckets — `proofs` bucket should appear as **Private**.

---

## Step 3: Seed the Packages Table

Insert the 6 package tiers before any user can purchase. Run in SQL Editor:

```sql
-- Seed the 6 TEMO package tiers (values are examples — customize as needed)
INSERT INTO public.packages (name, price, daily_task_count, daily_profit, display_order)
VALUES
  ('باقة A1', 50.00,  3,  0.5000, 1),
  ('باقة A2', 100.00, 5,  1.0000, 2),
  ('باقة A3', 200.00, 8,  2.0000, 3),
  ('باقة B1', 500.00, 10, 5.0000, 4),
  ('باقة B2', 1000.00, 12, 10.0000, 5),
  ('باقة B3', 2000.00, 15, 20.0000, 6);
```

> ⚠️ Adjust `price`, `daily_task_count`, and `daily_profit` to match actual business requirements before go-live.

---

## Step 4: Configure Payment Method

Insert the admin payment details so the purchase modal has data to display:

```sql
INSERT INTO public.admin_settings (payment_method_label, payment_address, is_active)
VALUES ('Vodafone Cash', '01012345678', true);
-- OR for USDT:
-- VALUES ('USDT (TRC-20)', 'TYour...WalletAddress', true);
```

> ⚠️ Only one active payment method is shown. If multiple rows exist, the purchase modal reads the first `is_active = true` row.

---

## Step 5: Seed Initial Tasks

Add at least `MAX(daily_task_count)` tasks to the global pool so the highest-tier users have enough tasks:

```sql
INSERT INTO public.tasks (title, platform_label, action_url, display_order)
VALUES
  ('أعجب بهذا الفيديو على يوتيوب', 'YouTube', 'https://youtube.com/watch?v=example1', 1),
  ('تابع هذا الحساب على تيك توك', 'TikTok', 'https://tiktok.com/@example', 2),
  ('تابع هذه الصفحة على إنستغرام', 'Instagram', 'https://instagram.com/example', 3),
  ('شاهد هذا الفيديو على يوتيوب', 'YouTube', 'https://youtube.com/watch?v=example4', 4),
  ('أعد تغريد هذه التغريدة', 'X (Twitter)', 'https://x.com/example/status/123', 5),
  -- Add more to cover the maximum daily_task_count (15 for B3)...
  ('مثال مهمة 15', 'YouTube', 'https://youtube.com/watch?v=example15', 15);
```

> **Critical**: Ensure active task count ≥ `MAX(daily_task_count)` across all packages, or the highest-tier users will see fewer tasks than expected.

---

## Step 6: Local Development

```bash
npm run dev
```

Navigate to:
- `/dashboard/packages` — verify package grid renders
- `/dashboard/tasks` — verify task list (requires active package on your test account)
- `/dashboard/history` — verify request history view

---

## Admin Notes

### Package Change Timing
Per clarification Q5: if you change a user's active package via admin action, the new `daily_task_count` and per-task reward only take effect **starting the next calendar day**. Best practice: apply package changes after midnight server time to avoid within-day discrepancies.

### Financial Audit Log
`public.financial_audit_log` is created in this migration but will only be populated by the future Admin module when approving/rejecting package requests and task logs. No action needed now.

### Monitoring Pending Records
Monitor pending submissions daily:
```sql
-- Pending package requests
SELECT u.full_name, p.name, r.amount_paid, r.created_at
FROM package_subscription_requests r
JOIN public.users u ON u.id = r.user_id
JOIN public.packages p ON p.id = r.package_id
WHERE r.status = 'pending'
ORDER BY r.created_at ASC;

-- Pending task logs
SELECT u.full_name, t.title, l.reward_amount_snapshot, l.completion_date
FROM task_completion_logs l
JOIN public.users u ON u.id = l.user_id
JOIN tasks t ON t.id = l.task_id
WHERE l.status = 'pending'
ORDER BY l.created_at ASC;
```

---

## Checkpoint Verification

| Check | Command/Action | Expected |
|---|---|---|
| Migrations applied | Check Table Editor | 6 new tables visible |
| `proofs` bucket exists | Storage → Buckets | Private bucket named `proofs` |
| Packages seeded | `SELECT count(*) FROM packages` | Returns 6 |
| Admin settings set | `SELECT * FROM admin_settings` | 1 row with `is_active = true` |
| Tasks seeded | `SELECT count(*) FROM tasks` | ≥ 15 active tasks |
| Packages page loads | `/dashboard/packages` | 6 cards in grid, no errors |
| Purchase flow works | Click "اشتراك", upload image, submit | Row appears in `package_subscription_requests` with `status = 'pending'` |
| Task list loads | `/dashboard/tasks` (active package required) | Correct number of tasks for tier |
| Task proof works | Click "تنفيذ", upload image, submit | Row appears in `task_completion_logs` with `status = 'pending'` |
