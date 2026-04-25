/**
 * contracts/types.ts
 * Feature: 010-investment-trading-cycles
 *
 * Canonical TypeScript types for the Investment & Trading Cycles module.
 * These types are the source of truth for all Server Actions, RSC props,
 * and client component interfaces in this feature.
 */

// ─────────────────────────────────────────────
// Domain Enums
// ─────────────────────────────────────────────

export type InvestmentDepositStatus = "pending" | "accepted" | "rejected";
export type InvestmentWithdrawalStatus = "pending" | "accepted" | "rejected";
export type InvestmentAccountStatus = "active" | "completed";

// ─────────────────────────────────────────────
// Database Row Types (shape returned from Supabase)
// ─────────────────────────────────────────────

/** Raw row from public.investment_accounts */
export interface InvestmentAccountRow {
  user_id: string;
  total_capital: number;
  withdrawn_profits: number;
  last_cycle_start: string | null; // ISO 8601 UTC
  current_tier_percentage: number | null;
  status: InvestmentAccountStatus;
  created_at: string;
  updated_at: string;
}

/** Raw row from public.investment_deposits */
export interface InvestmentDepositRow {
  id: string;
  user_id: string;
  amount: number;
  tier_percentage: number;
  receipt_url: string;
  status: InvestmentDepositStatus;
  rejection_reason: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Raw row from public.investment_withdrawals */
export interface InvestmentWithdrawalRow {
  id: string;
  user_id: string;
  amount: number;
  status: InvestmentWithdrawalStatus;
  rejection_reason: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Raw row from public.in_app_notifications */
export interface NotificationRow {
  id: string;
  user_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// ─────────────────────────────────────────────
// Computed / View Types (RSC → Client props)
// ─────────────────────────────────────────────

/**
 * Computed investment summary passed from RSC to dashboard UI.
 * All monetary values are floor-rounded to 2 decimal places.
 */
export interface InvestmentSummary {
  /** Total locked capital (never decremented) */
  totalCapital: number;
  /** Total gross profit across all completed cycles */
  grossProfit: number;
  /** Available profit = gross - withdrawn - pending withdrawals */
  availableProfit: number;
  /** Number of complete 7-day cycles elapsed since cycle start */
  cyclesPassed: number;
  /** ISO 8601 UTC timestamp when the next cycle profit is credited */
  nextCycleAt: string | null;
  /** ISO 8601 UTC timestamp of cycle start (for countdown timer prop) */
  cycleStartAt: string | null;
  /** Active tier percentage (e.g. 8 for 8%) */
  tierPercentage: number | null;
  /** Account lifecycle status */
  accountStatus: InvestmentAccountStatus;
  /** True if user has no investment account or all deposits are rejected */
  isEmpty: boolean;
}

/**
 * Enriched deposit row for admin review table.
 * Includes signed URL for receipt preview and resolved user identity.
 */
export interface AdminDepositRow {
  id: string;
  amount: number;
  tierPercentage: number;
  status: InvestmentDepositStatus;
  submittedAt: string;
  signedReceiptUrl: string;
  rejectionReason: string | null;
  user: {
    fullName: string;
    phoneNumber: string;
  };
}

/**
 * Enriched withdrawal row for admin review table.
 */
export interface AdminWithdrawalRow {
  id: string;
  amount: number;
  status: InvestmentWithdrawalStatus;
  requestedAt: string;
  rejectionReason: string | null;
  user: {
    fullName: string;
    phoneNumber: string;
  };
}

// ─────────────────────────────────────────────
// Profit Tier
// ─────────────────────────────────────────────

export interface ProfitTier {
  minAmount: number;
  maxAmount: number | null; // null = no upper bound
  percentage: number;
}

// ─────────────────────────────────────────────
// Trading Report (Static Dummy Data Shape)
// ─────────────────────────────────────────────

export interface TradingReport {
  totalTrades: number;
  won: number;
  lost: number;
  /** Net result percentage — dynamically bound to user's tier percentage */
  netResultPercentage: number;
}

// ─────────────────────────────────────────────
// Server Action Result Types
// ─────────────────────────────────────────────

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { error: string };

export type SubmitDepositResult = ActionResult<{ depositId: string }>;
export type SubmitWithdrawalResult = ActionResult<{ withdrawalId: string }>;
export type AdminActionResult = ActionResult;

// ─────────────────────────────────────────────
// Zod Schema Input Types (inferred in validations/)
// ─────────────────────────────────────────────

export interface SubmitDepositInput {
  amount: number; // >= 100
  receiptUrl: string; // Storage path validated server-side
}

export interface SubmitWithdrawalInput {
  amount: number; // >= 10
}

export interface AdminApproveDepositInput {
  depositId: string; // UUID
}

export interface AdminRejectDepositInput {
  depositId: string; // UUID
  reason?: string;
}

export interface AdminApproveWithdrawalInput {
  withdrawalId: string; // UUID
}

export interface AdminRejectWithdrawalInput {
  withdrawalId: string; // UUID
  reason?: string;
}
