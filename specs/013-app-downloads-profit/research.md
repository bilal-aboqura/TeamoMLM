# Research: App Downloads Profit

**Branch**: `013-app-downloads-profit` | **Date**: 2026-04-25

## Decisions

### D-001: Fully isolated route and table namespace

**Decision**: Use `/dashboard/app-profits` and `/admin/app-profits/*` routes with `app_profit_*` tables and no reads/writes to legacy task tables.

**Rationale**: The client explicitly rejected mixing app downloads with the legacy task system. Dedicated routes and tables prevent accidental coupling and make review/withdrawal logic auditable.

**Alternatives considered**: Reusing `tasks` and `task_completion_logs` was rejected because it caused the exact product confusion this feature is meant to avoid.

### D-002: Access gate source

**Decision**: Gate access using existing `users.leadership_level` and `users.current_package_level`, plus `user_isolated_wallets.app_package_amount` for dedicated app package eligibility.

**Rationale**: Rank and main package already exist. The dedicated app package state needs a standalone app-profit namespace, so it belongs with the isolated app wallet record.

**Alternatives considered**: Adding more fields to `users` was rejected to avoid expanding the global user profile for module-specific state.

### D-003: Isolated wallet table

**Decision**: Create `user_isolated_wallets` with `app_profits_balance`, `other_tasks_balance`, `deposit_balance`, and app-package eligibility fields.

**Rationale**: The client requires app profits to be isolated from deposits and other task wallets. A dedicated row per user makes the separation explicit and supports future additional isolated balances.

**Alternatives considered**: Adding `app_profits_balance` to `users` was rejected because it would keep app-profit money next to existing global wallet fields.

### D-004: Atomic approval RPC

**Decision**: Implement `admin_approve_app_profit_submission(p_submission_id UUID)` as a SECURITY DEFINER RPC that verifies the admin via `auth.uid()`, locks the pending submission, marks it approved, and increments `app_profits_balance` in the same transaction.

**Rationale**: This prevents duplicate credits and preserves balance integrity.

**Alternatives considered**: Sequencing updates in a Server Action was rejected because partial failures and repeated clicks could create inconsistent state.

### D-005: Private proof bucket

**Decision**: Store proofs in a private `app-profit-proofs` bucket with paths `proofs/{user_id}/{uuid}.{ext}`; admins and users view proofs via signed URLs.

**Rationale**: Proof screenshots may contain personal data. Private storage and signed URLs match existing proof-review patterns.

**Alternatives considered**: Public URLs were rejected for privacy and abuse risk.

### D-006: Friday-only withdrawals

**Decision**: Disable withdrawal UI on non-Friday days and enforce the same rule in the Server Action using `new Date().getDay() === 5`.

**Rationale**: UI-only locking is bypassable. Server validation is mandatory for financial requests.

**Alternatives considered**: Database-only validation was deferred because the client explicitly requested the Server Action date check.

### D-007: Withdrawal lifecycle

**Decision**: Use `pending`, `paid`, and `rejected` for app-profit withdrawal statuses. Creating a withdrawal debits/reserves app-profit balance immediately in `user_submit_app_profit_withdrawal`; rejecting refunds it; paying finalizes it.

**Rationale**: Immediate reservation prevents the same balance being requested multiple times before admin review.

**Alternatives considered**: Leaving balance unchanged until payout was rejected because users could submit overlapping requests.
