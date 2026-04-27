# Quickstart: Apps Offerwall & Tasks System

**Branch**: `012-offerwall-tasks-system`

This is a developer handoff guide. All implementation decisions and rationale are in `research.md` and `data-model.md`. Start here.

---

## Prerequisites

- Supabase local dev running (`supabase start`)
- `npm run dev` running at `localhost:3000`
- Admin test account with `role = 'admin'` in `public.users`

---

## Step 1: Apply the Migration

```bash
# From repo root
supabase db push
# or apply manually:
# psql $DATABASE_URL -f supabase/migrations/20260425000023_offerwall_tasks_system.sql
```

This migration:
1. Adds `description TEXT NOT NULL DEFAULT ''` to `public.tasks`
2. Creates `public.offerwall_submissions` (with unique partial index for active submissions)
3. Creates `public.wallet_transactions`
4. Creates 3 new RPCs: `admin_approve_offerwall_submission`, `admin_reject_offerwall_submission`, `user_submit_offerwall_proof`
5. Adds RLS policies on both new tables

---

## Step 2: Key File Map

```
supabase/migrations/
└── 20260425000023_offerwall_tasks_system.sql   ← NEW: run first

lib/validations/
├── admin-schemas.ts                             ← MODIFY: add description field
└── offerwall-schemas.ts                         ← NEW: offerwallProofUploadSchema

app/admin/tasks/
├── actions.ts                                   ← MODIFY: add description to createTask/updateTask
└── _components/CreateTaskForm.tsx               ← MODIFY: add description textarea
    _components/TaskManagementTable.tsx          ← MODIFY: show description preview column

app/admin/task-submissions/                      ← NEW ROUTE
├── page.tsx                                     ← NEW: Server Component, fetches all submissions
├── loading.tsx                                  ← NEW
├── error.tsx                                    ← NEW
├── actions.ts                                   ← NEW: approveOfferwallSubmission, rejectOfferwallSubmission
└── _components/
    ├── SubmissionsTable.tsx                     ← NEW: table with signed URL preview + approve/reject
    └── SubmissionReviewCard.tsx                 ← NEW: mobile-friendly card variant

app/dashboard/tasks/
├── page.tsx                                     ← MODIFY: offerwall grid with user_status badges
├── actions.ts                                   ← REPLACE: submitOfferwallProof (new logic)
├── data.ts                                      ← MODIFY: add fetchOfferwallTasks(userId)
└── _components/
    ├── TaskCard.tsx                             ← MODIFY: 4-state badge (available/pending/completed/locked)
    ├── TaskDetailModal.tsx                      ← MODIFY: add "Go to App" button + proof upload
    └── OfferwallGrid.tsx                        ← NEW: grid wrapper, replaces old list

app/dashboard/history/
└── _components/TaskLogList.tsx                  ← MODIFY: read from wallet_transactions
```

---

## Step 3: Critical Implementation Notes

### Derived Status Logic (Server Side)

In `data.ts`, fetch user submissions alongside tasks, then compute status:

```typescript
function deriveStatus(
  submissions: { status: string }[]
): "available" | "pending" | "completed" | "locked" {
  if (submissions.some((s) => s.status === "approved")) return "completed";
  if (submissions.some((s) => s.status === "pending"))  return "pending";
  if (submissions.filter((s) => s.status === "rejected").length >= 3) return "locked";
  return "available";
}
```

### Admin Signed URL Generation (15 min TTL)

```typescript
const { data } = await supabase.storage
  .from("proofs")
  .createSignedUrl(submission.screenshot_path, 900); // 900 = 15 minutes
```

### Server Action → RPC Call Pattern

```typescript
// In app/admin/task-submissions/actions.ts
const { error } = await supabaseAdminClient.rpc(
  "admin_approve_offerwall_submission",
  { p_submission_id: submissionId }
);
// RPC uses auth.uid() internally — must pass the USER's JWT, not service role
// Use createClient() (user session), not createAdminClient(), for this RPC call
```

> ⚠️ **Critical**: The 3 new RPCs use `auth.uid()` internally. They MUST be called with the **user's Supabase client** (from `createClient()`), not the service-role admin client. The admin client bypasses RLS and `auth.uid()` returns NULL in that context.

### File Upload → RPC Flow (User Submission)

```
1. Upload file to Supabase Storage (proofs bucket) → get storagePath
2. On upload success: call user_submit_offerwall_proof(task_id, storagePath)
3. On RPC failure: DELETE the uploaded file (cleanup orphan)
4. On RPC success: revalidatePath + return { success: true }
```

---

## Step 4: UI Status Badge Colors

| Status | Tailwind Classes |
|---|---|
| available | `bg-emerald-50 text-emerald-700` |
| pending | `bg-amber-50 text-amber-700` |
| completed | `bg-slate-100 text-slate-600` (with checkmark) |
| locked | `bg-red-50 text-red-700` (with lock icon) |

---

## Step 5: Test Checklist

- [ ] Admin creates a task with `description` and `external_url` → appears on offerwall
- [ ] User opens task modal → sees instructions + "Go to App" button opens external URL
- [ ] User uploads screenshot → submission created as `pending`, task card shows Pending badge
- [ ] User tries to re-submit pending task → form is hidden
- [ ] Admin approves → `wallet_balance` incremented, `wallet_transactions` row inserted, task shows Completed
- [ ] Admin rejects → task reverts to Available for user
- [ ] User resubmits twice more and gets rejected → task shows Locked, no submit form
- [ ] Admin approval failure (e.g., invalid reward) → submission stays Pending, no partial state
- [ ] Screenshot URL in admin review panel is a signed URL (expires, not public)
- [ ] Transaction history shows: "+X.XX USDT · Task Title · Credited"
