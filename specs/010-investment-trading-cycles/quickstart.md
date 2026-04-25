# Quickstart: Investment & Trading Cycles Module

**Feature**: 010-investment-trading-cycles  
**Date**: 2026-04-25

---

## Manual Verification Scenarios

Use these to validate the feature end-to-end after implementation. No automated test runner required.

---

### Scenario 1 — Happy Path: Full Deposit → Cycle → Withdrawal

**Setup**: Use a test user with no existing investment account.

1. Navigate to `/dashboard/investment` as the test user.
2. **Expected**: Empty state card with CTA to make first deposit.
3. Click "Deposit" button → Deposit Modal opens.
4. **Expected**: Tier table shows all 5 tiers; admin USDT wallet address visible with copy button.
5. Enter amount: **500** (qualifies for 8% tier).
6. Upload a valid image file as payment screenshot.
7. Submit — **Expected**: Success toast; modal closes; dashboard shows "طلب معلق للمراجعة".

---

**Admin Review**:

8. Log in as admin → Navigate to `/admin/investments` → "Deposit Requests" tab.
9. **Expected**: Row visible for test user: amount=$500, tier=8%, status=Pending.
10. Click screenshot thumbnail → **Expected**: Full image opens in lightbox modal.
11. Click "قبول" (Approve).
12. **Expected**: Row moves to Approved section. Test user's account status flips to Active.

---

**Dashboard After Approval**:

13. Log in as test user → `/dashboard/investment`.
14. **Expected**:
    - Capital Balance: **$500.00**
    - Total Earned Profit: **$0.00** (no full cycle yet)
    - Available to Withdraw: **$0.00**
    - Countdown timer visible, counting down from ~7 days.
    - Trading Report section visible.

---

**Simulate Cycle Completion** (manually update DB for testing):
```sql
UPDATE investment_accounts
SET last_cycle_start = now() - interval '7 days 1 minute'
WHERE user_id = '<test-user-id>';
```

15. Refresh `/dashboard/investment`.
16. **Expected**:
    - Total Earned Profit: **$40.00** (floor(500 × 8/100, 2) = $40.00)
    - Available to Withdraw: **$40.00**
    - Countdown timer reset to ~7 days.

---

**Withdrawal**:

17. Click "Withdraw" → Enter amount: **$40**.
18. Submit — **Expected**: Available balance shows $0.00 (pending); withdrawal visible in admin.

19. Admin: Navigate to `/admin/investments` → "Withdrawal Requests" tab.
20. **Expected**: Row for test user: amount=$40, status=Pending.
21. Click "قبول" (Approve).
22. **Expected**: User's `withdrawn_profits` = 40; Available = $0.00.

---

### Scenario 2 — Deposit Rejection & Retry

1. Submit a deposit with amount **$200**.
2. Admin: Reject with reason "الصورة غير واضحة".
3. **Expected**: User's dashboard shows rejection status + rejection reason. In-app notification visible.
4. User submits a NEW deposit (previous rejection allows this).
5. **Expected**: New pending deposit appears; admin can review and approve.

---

### Scenario 3 — Validation Guards

| Action | Input | Expected Result |
|--------|-------|-----------------|
| Deposit | Amount = 50 | Error: "الحد الأدنى للإيداع هو 100 USDT" |
| Deposit | No image uploaded | Error: Upload required |
| Deposit (2nd simultaneous) | While first is pending | Error: "لديك طلب إيداع معلق بالفعل" |
| Withdrawal | Amount = 5 | Error: "الحد الأدنى للسحب هو 10 USDT" |
| Withdrawal | Amount > available | Error: "المبلغ يتجاوز رصيدك المتاح" |

---

### Scenario 4 — Multi-Cycle Profit Accumulation

```sql
-- Simulate 3 completed cycles for a $2000 deposit at 12%
UPDATE investment_accounts
SET last_cycle_start = now() - interval '21 days 1 minute'
WHERE user_id = '<test-user-id>';
```

**Expected**:
- profit_per_cycle = floor(2000 × 12/100 × 100) / 100 = **$240.00**
- cycles_passed = 3
- gross_profit = **$720.00**
- Total Earned Profit displayed: **$720.00**

---

### Scenario 5 — Notification System

1. Admin approves a deposit → User logs in.
2. **Expected**: Notification badge in top app bar shows unread count ≥ 1.
3. User clicks notification → Badge clears (mark as read).

1. Admin rejects a withdrawal → User logs in.
2. **Expected**: New notification present with rejection message.

---

### Scenario 6 — Admin Filter

1. Navigate to `/admin/investments` → Deposit Requests tab.
2. Filter by "مقبول" (Accepted).
3. **Expected**: Only accepted deposits shown; pending/rejected hidden.
4. Switch to "Withdrawal Requests" tab.
5. **Expected**: Tab state persists correctly via URL param or state.

---

## Floor Rounding Verification

```
$333 × 5%  = 16.65  → floor(16.65) = $16.65 ✓
$1234 × 8% = 98.72  → floor(98.72) = $98.72 ✓
$1111 × 12% = 133.32 → floor(133.32) = $133.32 ✓
$7777 × 18% = 1399.86 → floor(1399.86) = $1399.86 ✓
$10001 × 25% = 2500.25 → floor(2500.25) = $2500.25 ✓
```

All results are exact to 2dp — no rounding artifacts expected. The edge cases that matter are amounts producing 3+ decimal place intermediates:
```
$333.33 × 5% = 16.6665 → floor(16.6665 * 100) / 100 = $16.66 ✓ (not $16.67)
```
