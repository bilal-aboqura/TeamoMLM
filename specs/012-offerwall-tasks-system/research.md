# Research: Apps Offerwall & Tasks System

**Branch**: `012-offerwall-tasks-system` | **Date**: 2026-04-25

## Existing Infrastructure Audit

### Database Tables (Relevant)

| Table | Status | Notes |
|---|---|---|
| `public.tasks` | ✅ Exists | Has `id`, `title`, `platform_label`, `action_url`, `reward_amount`, `required_vip_level`, `display_order`, `is_active`. **Missing**: `description` (rich text). |
| `public.task_completion_logs` | ✅ Exists | Has `id`, `user_id`, `task_id`, `proof_url`, `reward_amount_snapshot`, `completion_date`, `status`, `rejection_reason`, `reviewed_at`, `reviewed_by`. **Constraint**: Unique on `(user_id, task_id, completion_date)` — one submission per day per task (not per-lifecycle). Needs re-modelling for the offerwall use-case. |
| `public.users` | ✅ Exists | `wallet_balance NUMERIC` column carries the balance. Non-negative CHECK constraint in place. |
| `public.financial_audit_log` | ✅ Exists | `record_id`, `record_type`, `old_status`, `new_status`, `changed_by`, `changed_at`. Used for all status transitions. |
| `wallet_transactions` | ❌ Does NOT exist | Must be created. Used for user-facing transaction history display. |

### Existing Storage

- **Bucket**: `proofs` — existing bucket used for all proof uploads (deposits, tasks). Path convention: `task-proofs/{user_id}/{uuid}.{ext}`.
- **Decision**: Reuse the existing `proofs` bucket with the same path convention. Renamed conceptually to `task-proofs/` sub-path. The bucket is assumed private (signed URL pattern already in use in `admin/tasks/page.tsx`).

### Existing RPC Functions

| Function | Pattern | Decision |
|---|---|---|
| `admin_approve_task(p_log_id, p_admin_id)` | Atomic: approve log + credit wallet + audit | **Replace** with new version using `auth.uid()` role-check (per wallet security hardening pattern in migration 011). |
| `admin_reject_task(p_log_id, p_admin_id, p_reason)` | Atomic: reject log + audit | **Replace** with new version using `auth.uid()` role-check. |

**Pattern adopted**: All new RPCs will use `SECURITY DEFINER`, derive caller identity from `auth.uid()`, verify `role = 'admin'` from `public.users`, and use `FOR UPDATE` locks for concurrency safety — matching the pattern established in migration `20260406000011`.

### Existing Server Actions

- `app/admin/tasks/actions.ts` — CRUD actions (`createTask`, `updateTask`, `toggleTaskStatus`) — **extend** to add `description` field.
- `app/dashboard/tasks/actions.ts` — `submitTaskProof` action — **replace entirely** with new offerwall-aware logic (no daily reset, per-lifecycle duplicate check, 3-attempt cap).
- `app/dashboard/tasks/page.tsx` + `data.ts` — **extend** to show offerwall grid with per-user status badges.

---

## Decision Log

### D-001: Schema Strategy — Extend vs. New Table

- **Decision**: Extend `public.tasks` (add `description TEXT NOT NULL`) rather than creating a new table. The offerwall and daily tasks share the same core entity. The `required_vip_level` and `display_order` fields remain for backward compatibility.
- **Rationale**: No migration risk; existing admin CRUD is preserved. Only additive changes.
- **Alternative Rejected**: A new `offerwall_tasks` table would duplicate ~90% of the schema and create JOIN complexity.

### D-002: Schema Strategy — Submissions Table

- **Decision**: **Add `offerwall_submissions` as a new dedicated table** rather than repurposing `task_completion_logs`.
- **Rationale**: `task_completion_logs` has a `completion_date DATE` unique constraint designed for daily-reset tasks. The offerwall model is per-lifecycle (no daily reset), needs a 3-attempt rejection counter, and tracks a separate wallet transaction reference. Mixing both models in one table would require nullable columns, partial index gymnastics, and ambiguous semantics.
- **`task_completion_logs` preserved** for the existing daily task system.

### D-003: Wallet Transaction Log

- **Decision**: Create `public.wallet_transactions` table with columns: `id`, `user_id`, `amount`, `transaction_type` (e.g., `'task_reward'`), `source_label` (task title snapshot), `status` (`'Credited'`), `created_at`.
- **Rationale**: FR-019 mandates per-transaction display showing Amount + Task Title + Status. A dedicated table is cleaner than querying `financial_audit_log` (which is append-only and holds `record_id` references, not human-readable labels).

### D-004: Attempt Cap Enforcement

- **Decision**: Enforce the 3-rejection cap at the RPC level via a COUNT query on `offerwall_submissions` where `status = 'rejected'` AND `user_id = X` AND `task_id = Y`. The UI derives "Locked" status from this count; the DB enforces it in the submission insert RPC.
- **Computed status** (Available / Pending / Completed / Locked) is derived client-side from the user's submissions array — no extra column needed on `offerwall_submissions`.

### D-005: Signed URL TTL

- **Decision**: 15 minutes (900 seconds) for admin screenshot review. Matches the established 300-second pattern in the existing codebase, extended to 15 min for admin usability.
- **Rationale**: Short enough to prevent link sharing; long enough for the admin to open and review a submission without re-loading.

### D-006: Storage Bucket

- **Decision**: Reuse existing `proofs` bucket. New uploads go to path `task-proofs/{user_id}/{uuid}.{ext}` — same convention already in use.
- **Rationale**: Avoids creating a new bucket and storage policy. The bucket is already private with signed URL access.

### D-007: Admin Submission Review — Separate Page

- **Decision**: Create `/admin/task-submissions` as a **separate** Next.js route (not merged into `/admin/tasks`).
- **Rationale**: The user requested it as a separate page (FR-012). Keeps the admin tasks page focused on CRUD and the submissions page focused on review.

### D-008: Transaction History Integration

- **Decision**: The `wallet_transactions` table feeds both the admin submission approval (insert on approve) and the user's history tab (`/dashboard/history`). The `TaskLogList` component (`app/dashboard/history/_components/TaskLogList.tsx`) already exists — it will be updated to read from `wallet_transactions` filtered by `transaction_type = 'task_reward'`.
