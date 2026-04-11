# Research: Packages & Daily Tasks (002-packages-tasks)

**Phase**: 0 — Research
**Date**: 2026-04-02
**Branch**: `002-packages-tasks`

---

## §1 — Supabase Storage: Private Bucket Pattern for Proof Uploads

**Decision**: Single private bucket named `proofs`, with a path structure of `{bucket}/receipts/{user_id}/{uuid}.jpg` for purchase receipts and `{bucket}/task-proofs/{user_id}/{uuid}.jpg` for task proofs.

**Rationale**:
- A single bucket simplifies RLS policy management. Path prefixes (`receipts/` vs `task-proofs/`) allow per-prefix admin queries without separate bucket overhead.
- Private bucket (no public access) is mandatory per Constitution Principle III: "Direct public bucket access is forbidden for financial proofs."
- Signed URLs with a short TTL (60 seconds) will be generated server-side for admin review — users never get a persistent URL.

**Upload Flow**:
1. Client selects file → passes to Server Action via `FormData`
2. Server Action validates file type (JPEG/PNG) and size (≤ 5 MB) server-side
3. Server Action uses `supabaseAdmin.storage.from('proofs').upload(path, buffer)` with `upsert: false`
4. On success, the returned `path` (not a public URL) is stored in `receipt_url` / `proof_url` column
5. Admin review: Server Action generates `supabaseAdmin.storage.from('proofs').createSignedUrl(path, 60)` on demand

**Alternatives Considered**:
- Two separate buckets (`receipts`, `task-proofs`): rejected — doubles RLS policy boilerplate for no functional gain at this scale.
- Public bucket with randomized filenames: rejected — violates constitution's explicit prohibition.

---

## §2 — File Upload in Server Actions (FormData with Binary)

**Decision**: Use `FormData` natively — Next.js 15 Server Actions accept `FormData` directly including `File` objects. Read file as `ArrayBuffer` via `file.arrayBuffer()`, pass buffer to Supabase Storage upload.

**Rationale**: No additional libraries needed. `@supabase/supabase-js` v2 `storage.upload()` accepts `ArrayBuffer | Blob | File`. This keeps the stack clean (Constitution Principle I: no unapproved dependencies).

**Implementation pattern**:
```typescript
// In Server Action
const file = formData.get('receipt') as File;
// Server-side validation
if (!['image/jpeg', 'image/png'].includes(file.type)) { /* ... */ }
if (file.size > 5 * 1024 * 1024) { /* ... */ }
const buffer = await file.arrayBuffer();
const path = `receipts/${userId}/${crypto.randomUUID()}.${file.type === 'image/jpeg' ? 'jpg' : 'png'}`;
const { error } = await supabaseAdmin.storage.from('proofs').upload(path, buffer, {
  contentType: file.type,
  upsert: false,
});
```

**Alternatives Considered**:
- Client-side upload directly to Supabase Storage using anon key: rejected — exposes bucket write access to client; Constitution Principle III requires server-side control.
- Multipart streaming with a Route Handler: rejected — Server Actions handle this natively in Next.js 15, simpler boundary.

---

## §3 — Daily Task Selection: Deterministic Quantity-Gated Pool

**Decision**: Task selection uses `ORDER BY display_order ASC, id ASC LIMIT {daily_task_count}` from the `tasks` table filtered by `is_active = true`. Selection is deterministic for a given day — no randomization.

**Rationale**:
- Clarification Q2 confirmed: shared global pool, quantity-gated by package tier.
- Deterministic ordering prevents tasks "jumping" between page loads, which would confuse users mid-session.
- `display_order` gives admin control over task priority without randomness.
- The daily reset is implemented by filtering `task_completion_logs` for today's `completion_date = CURRENT_DATE` — tasks with a log entry for the current user TODAY are marked completed regardless of status.

**Task "active for day" query pattern**:
```sql
SELECT t.id, t.title, t.platform_label, t.action_url, t.display_order,
       tcl.id AS log_id, tcl.status AS completion_status
FROM tasks t
LEFT JOIN task_completion_logs tcl
  ON tcl.task_id = t.id
  AND tcl.user_id = auth.uid()
  AND tcl.completion_date = CURRENT_DATE
WHERE t.is_active = true
ORDER BY t.display_order ASC, t.id ASC
LIMIT {user.active_package.daily_task_count};
```

**Alternatives Considered**:
- Random daily shuffle (seeded by date): rejected — harder to test deterministically; admin has no control over which tasks appear first.
- Per-tier task assignment (exclusive): rejected per clarification Q2.

---

## §4 — Pending-Lock Check: Single Active Request Per User

**Decision**: The duplicate-pending block (FR-012) is enforced at the application layer in the Server Action using a pre-insert `SELECT COUNT(*) WHERE user_id = X AND status = 'pending'` before attempting the insert. A partial unique index on `(user_id)` WHERE `status = 'pending'` is added at the DB layer as a second guard.

**Rationale**:
- `rejected` records must not block re-submission (clarification Q3), so a simple `UNIQUE(user_id)` on the table would be incorrect.
- A PostgreSQL partial unique index (`CREATE UNIQUE INDEX ... WHERE status = 'pending'`) enforces the constraint at DB level — catching race conditions that the application check cannot.
- Application-level check runs first and returns a user-friendly Arabic error before hitting the DB constraint.

**Partial index**:
```sql
CREATE UNIQUE INDEX pkg_sub_requests_one_pending_per_user
  ON package_subscription_requests (user_id)
  WHERE status = 'pending';
```

**Alternatives Considered**:
- Application-only check: rejected — race condition possible under concurrent submissions.
- `UNIQUE(user_id)` on the whole table: rejected — would block re-submission after rejection.

---

## §5 — Mid-Day Package Change: Task Snapshot Strategy

**Decision**: The daily task list uses the package that was active at **query time** (`public.users.current_package_level` → JOIN `packages`). Since clarification Q5 established that package changes take effect the **next calendar day**, the Server Component for the tasks page reads the current package and applies its `daily_task_count`. If admin changes the package mid-day, the RSC would reflect the new count on the next full page load — which is acceptable since the spec says "next-day effect applies starting at midnight." We add a note in the quickstart that admins should apply package changes after midnight to avoid a within-day discrepancy on page refresh.

**Rationale**: No additional complexity (no "start of day snapshot" table needed). The spec does not require the task count to be frozen server-side at midnight — only that the new count is not required to be used until the next day. Serving the new package count on a post-midnight refresh is compliant.

**Alternatives Considered**:
- Store a `daily_task_snapshot` column on `public.users` stamped at midnight: rejected — adds complexity and a cron job dependency that is out of scope for this module.

---

## §6 — `financial_audit_log` Requirement (Constitution Principle III)

**Decision**: Constitution Principle III mandates that every status change on financial records inserts a row into `financial_audit_log`. Since **admin approval/rejection of package requests and task logs** is out of scope for this module (handled in the future Admin module), the `financial_audit_log` table will be **created in this migration** (so the schema is ready) but only populated by admin Server Actions in a future feature. User-facing actions in this module only create `pending` records — no status transitions occur here.

**Schema for audit log** (created now, populated later):
```sql
CREATE TABLE public.financial_audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id   UUID        NOT NULL,
  record_type TEXT        NOT NULL CHECK (record_type IN ('package_subscription_request', 'task_completion_log')),
  old_status  TEXT,
  new_status  TEXT        NOT NULL,
  changed_by  UUID        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- No RLS needed — admin-write only via service role
COMMENT ON TABLE public.financial_audit_log IS 'Immutable audit trail for all financial record status changes. Admin-write only.';
```

**Alternatives Considered**:
- Defer `financial_audit_log` creation to the Admin module: rejected — Constitution requires it to exist before any financial records are created; better to create it now so future migrations can reference it.
