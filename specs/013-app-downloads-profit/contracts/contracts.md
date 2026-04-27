# Contracts: App Downloads Profit

**Branch**: `013-app-downloads-profit` | **Date**: 2026-04-25

## Types

```typescript
export type AppProfitStatus =
  | "not_executed"
  | "pending_review"
  | "approved"
  | "rejected";

export interface AppProfitOffer {
  id: string;
  title: string;
  download_url: string;
  reward_usd: number;
  provider: string;
  required_tier: string;
  user_status: AppProfitStatus;
  active_submission_id?: string;
}

export interface AppProfitSubmission {
  id: string;
  offer_id: string;
  offer_title: string;
  provider: string;
  user_id: string;
  user_full_name: string;
  screenshot_url: string;
  signed_screenshot_url: string;
  reward_usd: number;
  status: "pending_review" | "approved" | "rejected";
  rejection_reason?: string;
  created_at: string;
}

export interface AppProfitWallet {
  user_id: string;
  app_profits_balance: number;
  app_package_amount: number | null;
}

export interface AppProfitWithdrawal {
  id: string;
  user_id: string;
  user_full_name?: string;
  amount: number;
  status: "pending" | "paid" | "rejected";
  rejection_reason?: string;
  created_at: string;
}
```

## Server Action Results

```typescript
export type ActionResult = { success: true } | { error: string };

export type SubmitProofResult =
  | { success: false; idle: true }
  | { success: true }
  | { error: { field: "offer_id" | "proof" | "general"; message: string } };
```

## Form Inputs

### User proof submission

`submitAppProfitProof(prevState, formData)`

- `offer_id`: UUID
- `proof`: File, JPEG/PNG/WebP, max 10 MB

### User withdrawal

`submitAppProfitWithdrawal(formData)`

- `amount`: positive USD amount
- Must fail on non-Friday server time.

### Admin offer CRUD

`createAppProfitOffer(formData)` / `updateAppProfitOffer(formData)`

- `title`: string
- `download_url`: URL
- `reward_usd`: positive number
- `provider`: string
- `required_tier`: string
- `is_active`: boolean for update/toggle flows

### Admin review

- `approveAppProfitSubmission(submissionId)`
- `rejectAppProfitSubmission(submissionId, reason?)`
- `markAppProfitWithdrawalPaid(withdrawalId)`
- `rejectAppProfitWithdrawal(withdrawalId, reason?)`

## Error Mapping

| Error Code | Arabic Message |
|---|---|
| `unauthenticated` | يرجى تسجيل الدخول أولاً |
| `unauthorized` | غير مصرح لك بهذا الإجراء |
| `access_denied` | هذه الميزة غير متاحة لحسابك حالياً |
| `offer_not_found` | العرض غير متاح |
| `already_submitted` | لديك إثبات معلق أو مقبول لهذا التطبيق |
| `not_pending` | تمت مراجعة هذا الطلب مسبقاً |
| `insufficient_balance` | رصيد أرباح التطبيقات غير كافٍ |
| `not_friday` | السحب من أرباح التطبيقات متاح يوم الجمعة فقط |
