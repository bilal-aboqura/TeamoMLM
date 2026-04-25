/**
 * contracts/server-actions.ts
 * Feature: 010-investment-trading-cycles
 *
 * Server Action interface contracts.
 * Each action follows the established TEMO pattern:
 *   - verifyAdmin() or getUser() at the top
 *   - Zod schema validation before any DB write
 *   - Supabase RPC for all atomic financial mutations
 *   - revalidatePath() on success
 */

import type {
  SubmitDepositResult,
  SubmitWithdrawalResult,
  AdminActionResult,
} from "./types";

// ─────────────────────────────────────────────
// User-Facing Actions
// File: app/dashboard/investment/actions.ts
// ─────────────────────────────────────────────

/**
 * USER ACTION: Submit an investment deposit request.
 *
 * Flow:
 *  1. Validate user is authenticated (createClient → getUser)
 *  2. Zod-validate: amount >= 100, receiptUrl is non-empty string
 *  3. Resolve tier percentage from INVESTMENT_TIERS constant
 *  4. Call RPC: user_submit_investment_deposit(user_id, amount, tier_pct, receipt_url)
 *     - RPC checks: no existing pending/accepted deposit
 *     - RPC inserts into investment_deposits
 *  5. revalidatePath('/dashboard/investment')
 *
 * RPC: public.user_submit_investment_deposit
 * Returns: { depositId: string }
 * Errors: 'already_active' | 'below_minimum' | 'invalid_tier'
 */
export declare function submitInvestmentDeposit(
  _prevState: SubmitDepositResult,
  formData: FormData
): Promise<SubmitDepositResult>;

/**
 * USER ACTION: Submit an investment profit withdrawal request.
 *
 * Flow:
 *  1. Validate user is authenticated
 *  2. Zod-validate: amount >= 10
 *  3. Call RPC: user_submit_investment_withdrawal(user_id, amount)
 *     - RPC computes available_profit inline (gross - withdrawn - pending)
 *     - RPC checks: amount <= available_profit
 *     - RPC inserts into investment_withdrawals
 *  4. revalidatePath('/dashboard/investment')
 *
 * RPC: public.user_submit_investment_withdrawal
 * Returns: { withdrawalId: string }
 * Errors: 'below_minimum' | 'insufficient_profit' | 'no_active_investment'
 */
export declare function submitInvestmentWithdrawal(
  _prevState: SubmitWithdrawalResult,
  formData: FormData
): Promise<SubmitWithdrawalResult>;

// ─────────────────────────────────────────────
// Admin Actions
// File: app/admin/investments/actions.ts
// ─────────────────────────────────────────────

/**
 * ADMIN ACTION: Approve a pending investment deposit.
 *
 * Flow:
 *  1. verifyAdmin() — server-side role check via createAdminClient
 *  2. Zod-validate: depositId is UUID
 *  3. Call RPC: admin_approve_investment_deposit(request_id, admin_id)
 *     - RPC: SET status = 'accepted', reviewed_at = now(), reviewed_by = admin_id
 *     - RPC: UPSERT investment_accounts (add capital, set last_cycle_start = now(), set tier)
 *     - RPC: INSERT financial_audit_log (record_type = 'investment_deposit')
 *     - RPC: INSERT in_app_notifications for the user
 *  4. revalidatePath('/admin/investments')
 *
 * RPC: public.admin_approve_investment_deposit
 * Errors: 'not_pending' | 'not_found'
 */
export declare function approveInvestmentDeposit(
  depositId: string
): Promise<AdminActionResult>;

/**
 * ADMIN ACTION: Reject a pending investment deposit.
 *
 * Flow:
 *  1. verifyAdmin()
 *  2. Zod-validate: depositId UUID, reason optional string
 *  3. Call RPC: admin_reject_investment_deposit(request_id, admin_id, reason)
 *     - RPC: SET status = 'rejected', rejection_reason, reviewed_at, reviewed_by
 *     - RPC: INSERT financial_audit_log
 *     - RPC: INSERT in_app_notifications for the user
 *  4. revalidatePath('/admin/investments')
 *
 * RPC: public.admin_reject_investment_deposit
 * Errors: 'not_pending' | 'not_found'
 */
export declare function rejectInvestmentDeposit(
  depositId: string,
  reason?: string
): Promise<AdminActionResult>;

/**
 * ADMIN ACTION: Approve a pending investment withdrawal.
 *
 * Flow:
 *  1. verifyAdmin()
 *  2. Zod-validate: withdrawalId UUID
 *  3. Call RPC: admin_approve_investment_withdrawal(request_id, admin_id)
 *     - RPC: SET status = 'accepted', reviewed_at, reviewed_by
 *     - RPC: UPDATE investment_accounts SET withdrawn_profits += amount
 *     - RPC: INSERT financial_audit_log (record_type = 'investment_withdrawal')
 *     - RPC: INSERT in_app_notifications for the user
 *  4. revalidatePath('/admin/investments')
 *
 * RPC: public.admin_approve_investment_withdrawal
 * Errors: 'not_pending' | 'not_found'
 */
export declare function approveInvestmentWithdrawal(
  withdrawalId: string
): Promise<AdminActionResult>;

/**
 * ADMIN ACTION: Reject a pending investment withdrawal.
 *
 * Flow:
 *  1. verifyAdmin()
 *  2. Zod-validate: withdrawalId UUID, reason optional
 *  3. Call RPC: admin_reject_investment_withdrawal(request_id, admin_id, reason)
 *     - RPC: SET status = 'rejected', rejection_reason, reviewed_at, reviewed_by
 *     - RPC: INSERT financial_audit_log
 *     - RPC: INSERT in_app_notifications for the user
 *     - NOTE: No balance change — amount was never deducted (reserved at read-time only)
 *  4. revalidatePath('/admin/investments')
 *
 * RPC: public.admin_reject_investment_withdrawal
 * Errors: 'not_pending' | 'not_found'
 */
export declare function rejectInvestmentWithdrawal(
  withdrawalId: string,
  reason?: string
): Promise<AdminActionResult>;
