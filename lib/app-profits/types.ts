export type AppProfitStatus =
  | "not_executed"
  | "pending_review"
  | "approved"
  | "rejected";

export type AppProfitSubmissionStatus = Exclude<AppProfitStatus, "not_executed">;

export type AppProfitWithdrawalStatus = "pending" | "paid" | "rejected";

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
  status: AppProfitSubmissionStatus;
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
  status: AppProfitWithdrawalStatus;
  rejection_reason?: string;
  created_at: string;
  reviewed_at?: string;
}

export type ActionResult = { success: true } | { error: string };

export type SubmitProofResult =
  | { success: false; idle: true }
  | { success: true }
  | { error: { field: "offer_id" | "proof" | "general"; message: string } };
