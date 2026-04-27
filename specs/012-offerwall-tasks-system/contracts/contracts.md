# Contracts: Apps Offerwall & Tasks System

**Branch**: `012-offerwall-tasks-system` | **Date**: 2026-04-25

These contracts define the TypeScript interfaces shared between Server Components, Server Actions, and Client Components for this feature.

---

## Server Action Contracts

### `submitOfferwallProof(prevState, formData): Promise<SubmitProofResult>`

**Location**: `app/dashboard/tasks/actions.ts`

```typescript
export type SubmitProofResult =
  | { success: false; idle: true }
  | { success: true }
  | { error: { field: "proof" | "task_id" | "general"; message: string } };
```

**FormData keys**:
- `task_id: string` — UUID of the target task
- `proof: File` — image/jpeg, image/png, or image/webp, max 10 MB

**Error codes surfaced** (mapped from RPC exceptions):
- `unauthenticated` → "يرجى تسجيل الدخول أولاً"
- `task_not_found` → "المهمة غير متوفرة"
- `already_submitted` → "لديك طلب معلق أو مكتمل لهذه المهمة"
- `max_attempts_reached` → "وصلت للحد الأقصى من المحاولات لهذه المهمة"

---

### `approveOfferwallSubmission(submissionId): Promise<AdminActionResult>`

**Location**: `app/admin/task-submissions/actions.ts`

```typescript
export type AdminActionResult =
  | { success: true }
  | { error: string };
```

**Error codes surfaced**:
- `unauthenticated` → "غير مصرح"
- `unauthorized` → "غير مصرح لك بهذا الإجراء"
- `not_found` → "الطلب غير موجود"
- `not_pending` → "هذا الطلب تمت مراجعته مسبقاً"
- `invalid_reward` → "مبلغ المكافأة غير صالح"

---

### `rejectOfferwallSubmission(submissionId, reason?): Promise<AdminActionResult>`

**Location**: `app/admin/task-submissions/actions.ts`

**Error codes surfaced**: same set as approve (not_found, not_pending, unauthorized).

---

### `createTask(formData) / updateTask(formData) / toggleTaskStatus(taskId, isActive)`

**Location**: `app/admin/tasks/actions.ts` (extend existing)

**New field added to `createTaskSchema` and `updateTaskSchema`**:
```typescript
description: z.string().min(10, "الوصف قصير جداً").max(2000, "الوصف طويل جداً")
```

---

## Data Shape Contracts

### `OfferwallTask` — passed from Server Component to Client grid

```typescript
export interface OfferwallTask {
  id: string;
  title: string;
  description: string;
  external_url: string;
  reward_amount: number;
  platform_label: string;
  // Derived status for this specific user — computed server-side
  user_status: "available" | "pending" | "completed" | "locked";
  // Only present if user has a pending submission (used to disable re-submit)
  active_submission_id?: string;
}
```

### `OfferwallSubmission` — passed from Server Component to admin review table

```typescript
export interface OfferwallSubmission {
  id: string;
  task_title: string;
  task_reward: number;
  user_full_name: string;
  user_id: string;
  signed_screenshot_url: string; // short-lived, generated server-side
  status: "pending" | "approved" | "rejected";
  rejection_reason?: string;
  created_at: string;
  reviewed_at?: string;
}
```

### `WalletTransaction` — passed to history list component

```typescript
export interface WalletTransaction {
  id: string;
  amount: number;
  transaction_type: "task_reward";
  source_label: string;   // task title snapshot, e.g. "Download App X"
  status: string;         // "Credited"
  created_at: string;
}
```

---

## Zod Validation Schemas

### `offerwallProofUploadSchema` (client + server)

**Location**: `lib/validations/offerwall-schemas.ts`

```typescript
import { z } from "zod";

export const offerwallProofUploadSchema = z.object({
  task_id: z.string().uuid("معرّف المهمة غير صالح"),
  proof: z
    .instanceof(File)
    .refine(
      (f) => ["image/jpeg", "image/png", "image/webp"].includes(f.type),
      "يُسمح فقط بصور JPEG أو PNG أو WebP"
    )
    .refine((f) => f.size <= 10 * 1024 * 1024, "الحجم الأقصى للصورة هو 10 ميجابايت"),
});

export type OfferwallProofUploadInput = z.infer<typeof offerwallProofUploadSchema>;
```

### `createOfferwallTaskSchema` extension to admin-schemas

```typescript
// Add to lib/validations/admin-schemas.ts
export const createTaskSchema = z.object({
  title:              z.string().min(3, "العنوان قصير جداً"),
  description:        z.string().min(10, "الوصف قصير جداً").max(2000),
  platform_label:     z.string().min(1, "تسمية المنصة مطلوبة"),
  action_url:         z.string().url("الرابط غير صالح"),
  reward_amount:      z.coerce.number().positive("المكافأة يجب أن تكون أكبر من صفر"),
  required_vip_level: z.coerce.number().int().min(0).max(6).default(0),
  display_order:      z.coerce.number().int().min(0).default(0),
});
```
