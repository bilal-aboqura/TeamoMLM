# Server Action Contracts: Packages & Daily Tasks (002-packages-tasks)

**Phase**: 1 — Design
**Date**: 2026-04-02
**Branch**: `002-packages-tasks`

---

## Action 1: `purchasePackage`

**File**: `app/dashboard/packages/actions.ts`
**Directive**: `"use server"`
**Called from**: `PurchaseModal.tsx` (Client Component) via `useFormState`

### Signature
```typescript
export async function purchasePackage(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult>
```

### Processing Flow (7 steps — strict order)

1. **Zod validation** — parse `package_id` (UUID) and `receipt` (File, JPEG/PNG, ≤5 MB) from `formData` using `receiptUploadSchema`. On failure → return `{ error: { field, message } }` with Arabic message.

2. **Auth check** — call `supabase.auth.getUser()` (SSR client). If no session → return `{ error: { field: 'general', message: 'يرجى تسجيل الدخول أولاً' } }`.

3. **Pending-lock check** — query `package_subscription_requests` via admin client:
   ```sql
   SELECT id FROM package_subscription_requests
   WHERE user_id = $1 AND status = 'pending' LIMIT 1
   ```
   If found → return `{ error: { field: 'general', message: 'لديك طلب اشتراك قيد المراجعة بالفعل' } }`.

4. **Package lookup** — query `packages WHERE id = package_id AND is_active = true`. If not found → return `{ error: { field: 'general', message: 'الباقة غير متوفرة' } }`.

5. **Storage upload** — read file as `ArrayBuffer`. Upload to `proofs` bucket at path `receipts/{user_id}/{uuid}.{ext}` using admin client with `upsert: false`. On storage error → return generic Arabic error.

6. **DB insert** — insert into `package_subscription_requests`:
   ```typescript
   {
     user_id: user.id,
     package_id: validatedData.package_id,
     receipt_url: storagePath,       // storage path, not signed URL
     amount_paid: package.price,     // snapshot at submission
     status: 'pending',
   }
   ```
   On DB unique constraint violation (`23505` on partial index) → storage cleanup + return `{ error: ... }`.

7. **Return success** → `{ success: true }`. Client redirects or shows confirmation message.

### Return Type
```typescript
type ActionResult =
  | { success: true }
  | { error: { field: string; message: string } };
```

### Security
- All DB writes use `supabaseAdmin` (service role) — bypasses RLS safely for user-context inserts.
- File type and size validated server-side before storage upload — client-side validation is UX-only.
- `receipt_url` stores the storage path string, never a signed URL (transient links generated on admin demand only).

---

## Action 2: `submitTaskProof`

**File**: `app/dashboard/tasks/actions.ts`
**Directive**: `"use server"`
**Called from**: `TaskExecutionModal.tsx` (Client Component) via `useFormState`

### Signature
```typescript
export async function submitTaskProof(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult>
```

### Processing Flow (8 steps — strict order)

1. **Zod validation** — parse `task_id` (UUID) and `proof` (File, JPEG/PNG, ≤5 MB) using `taskProofUploadSchema`. On failure → return `{ error: { field, message } }`.

2. **Auth check** — `supabase.auth.getUser()`. If no session → Arabic auth error.

3. **Active package check** — query `public.users WHERE id = user.id` for `current_package_level`. If null → return `{ error: { field: 'general', message: 'يجب الاشتراك في باقة لإرسال المهام' } }`.

4. **Package data fetch** — query `packages` to get `daily_profit` and `daily_task_count` for the user's active package. Compute `reward_amount_snapshot = daily_profit / daily_task_count` (4dp precision).

5. **Duplicate-submission check** — query `task_completion_logs`:
   ```sql
   SELECT id FROM task_completion_logs
   WHERE user_id = $1 AND task_id = $2 AND completion_date = CURRENT_DATE LIMIT 1
   ```
   If found → return `{ error: { field: 'general', message: 'لقد أرسلت إثبات هذه المهمة اليوم بالفعل' } }`.

6. **Task validation** — query `tasks WHERE id = task_id AND is_active = true`. If not found → return `{ error: { field: 'general', message: 'المهمة غير متوفرة' } }`.

7. **Storage upload** — read file as `ArrayBuffer`. Upload to `proofs` bucket at path `task-proofs/{user_id}/{uuid}.{ext}`. On error → return generic Arabic error.

8. **DB insert** — insert into `task_completion_logs`:
   ```typescript
   {
     user_id: user.id,
     task_id: validatedData.task_id,
     proof_url: storagePath,
     reward_amount_snapshot: rewardSnapshot,
     completion_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
     status: 'pending',
   }
   ```
   On unique constraint violation (`23505` on `task_logs_one_per_day`) → storage cleanup + return duplicate error.

9. **Return success** → `{ success: true }`. Client marks task as completed in UI.

### Security
- Same `supabaseAdmin` pattern as Action 1.
- `reward_amount_snapshot` calculated server-side from DB — never trusted from client input.
- `completion_date` set server-side — never accepted from FormData.

---

## Data Fetch Contracts (Server Components — Read-Only)

### `getPackagesWithUserStatus(userId: string)`
**Used in**: `app/dashboard/packages/page.tsx`

```typescript
// Returns packages + whether user has pending/active subscription
type PackageWithStatus = {
  id: string;
  name: string;
  price: number;
  daily_task_count: number;
  daily_profit: number;
  display_order: number;
  userStatus: 'none' | 'pending' | 'active';  // derived from package_subscription_requests
};
```

**Query strategy**: Single JOIN between `packages` and `package_subscription_requests` (filtered for `user_id`). Annotates each package with the user's request status if one exists.

---

### `getActivePaymentSetting()`
**Used in**: `app/dashboard/packages/page.tsx` (passed as prop to `PurchaseModal`)

```typescript
type PaymentSetting = {
  payment_method_label: string;
  payment_address: string;
  is_active: boolean;
} | null;
```

**Returns**: The single active admin settings row, or `null` if none configured.

---

### `getDailyTasksWithCompletionStatus(userId: string, dailyTaskCount: number)`
**Used in**: `app/dashboard/tasks/page.tsx`

```typescript
type TaskWithStatus = {
  id: string;
  title: string;
  platform_label: string;
  action_url: string;
  display_order: number;
  completionStatus: 'available' | 'pending' | 'approved' | 'rejected';
  logId: string | null;
};
```

**Query strategy**: `SELECT tasks LEFT JOIN task_completion_logs (user_id, CURRENT_DATE) WHERE tasks.is_active = true ORDER BY display_order ASC, id ASC LIMIT dailyTaskCount`.

---

### `getUserRequestHistory(userId: string)`
**Used in**: `app/dashboard/history/page.tsx`

```typescript
type RequestHistory = {
  packageRequests: PackageSubscriptionRequest[];
  taskLogs: TaskCompletionLog[];
};
```

**Query**: Two parallel fetches on `package_subscription_requests` and `task_completion_logs` for the `user_id`, both ordered by `created_at DESC`.

---

## Middleware Contract (Extension — No Changes)

The existing `middleware.ts` from `001-auth-profile` already protects all `/dashboard/**` routes. No changes required for this feature — middleware gate is inherited.

---

## Storage Path Conventions

| Type | Path Pattern | Example |
|---|---|---|
| Purchase receipt | `receipts/{user_id}/{uuid}.jpg` | `receipts/abc-123/.../receipt.jpg` |
| Task proof | `task-proofs/{user_id}/{uuid}.jpg` | `task-proofs/abc-123/.../proof.png` |

Both stored in the `proofs` private bucket. Signed URLs generated on admin demand (60s TTL).
