# Quickstart: App Downloads Profit

**Branch**: `013-app-downloads-profit`

## Prerequisites

- Supabase linked project or local Supabase running.
- `npm run dev` running.
- Admin test account with `role = 'admin'`.
- User test account with one qualifying access condition:
  - `leadership_level >= 1`, or
  - `current_package_level IN ('B1','B2','B3')`, or
  - `user_isolated_wallets.app_package_amount IN (200,300,400,500,600)`.

## Apply Migration

```powershell
npx supabase db push
```

Expected new objects:
- `app_profit_offers`
- `app_profit_submissions`
- `user_isolated_wallets`
- `app_profit_withdrawals`
- `app-profit-proofs` private bucket
- App-profit RPC functions

## Manual Test Checklist

1. Admin opens `/admin/app-profits/manage` and creates an active Tapjoy offer.
2. Non-eligible user opens `/dashboard/app-profits` and sees an access-locked state.
3. Eligible user opens `/dashboard/app-profits` and sees the app offer with reward and download link.
4. Eligible user uploads JPEG/PNG/WebP proof and sees status `Under Review`.
5. The same user cannot submit another active proof for the same offer while pending.
6. Admin opens `/admin/app-profits/reviews`, sees signed screenshot preview, and approves the submission.
7. User's `app_profits_balance` increases by the exact offer reward; legacy `wallet_balance` does not change.
8. User opens `/dashboard/app-profits/history` and sees app name, date, screenshot, amount, and Approved status.
9. On a non-Friday, `/dashboard/app-profits/withdraw` shows disabled withdraw UI and server action rejects attempts.
10. On Friday, user submits a withdrawal and admin sees it in `/admin/app-profits/withdrawals`.
11. Admin marks withdrawal paid or rejected; rejected withdrawal refunds `app_profits_balance`.
