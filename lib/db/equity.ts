import { createAdminClient } from "@/lib/supabase/admin";

export const GLOBAL_EQUITY_CAP = 30;
export const USER_EQUITY_CAP = 10;

export type ProfitShareRequestStatus = "pending" | "accepted" | "rejected";

export type ProfitShareRequest = {
  id: string;
  percentage: number;
  price_usd: number;
  sponsor_referral_code: string;
  receipt_url: string;
  status: ProfitShareRequestStatus;
  created_at: string;
  updated_at: string;
};

export async function getTotalSoldEquity(): Promise<number> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("profit_share_requests")
    .select("percentage")
    .eq("status", "accepted");

  if (error) {
    console.error("getTotalSoldEquity error:", error.message);
    return 0;
  }

  return (data ?? []).reduce(
    (total, row) => total + Number(row.percentage ?? 0),
    0
  );
}

export async function getAcceptedEquityForUser(userId: string): Promise<number> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("profit_share_requests")
    .select("percentage")
    .eq("user_id", userId)
    .eq("status", "accepted");

  if (error) {
    console.error("getAcceptedEquityForUser error:", error.message);
    return 0;
  }

  return (data ?? []).reduce(
    (total, row) => total + Number(row.percentage ?? 0),
    0
  );
}

export async function getUserProfitShareRequests(
  userId: string
): Promise<ProfitShareRequest[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("profit_share_requests")
    .select(
      "id, percentage, price_usd, sponsor_referral_code, receipt_url, status, created_at, updated_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getUserProfitShareRequests error:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    percentage: Number(row.percentage),
    price_usd: Number(row.price_usd),
    sponsor_referral_code: row.sponsor_referral_code,
    receipt_url: row.receipt_url,
    status: row.status as ProfitShareRequestStatus,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}
