import { createAdminClient } from "@/lib/supabase/admin";
import {
  isMissingSchema,
  readFinancialControlsFallback,
} from "@/lib/db/financial-controls-fallback";

export const GLOBAL_EQUITY_CAP = 30;

export type ProfitShareRequestStatus = "pending" | "accepted" | "rejected";

export type ProfitShareRequest = {
  id: string;
  percentage: number;
  price_usd: number;
  sponsor_referral_code: string | null;
  buyer_email: string | null;
  buyer_phone: string | null;
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

export async function getManualSoldEquity(): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profit_share_settings")
    .select("manual_sold_percentage")
    .eq("id", true)
    .maybeSingle();

  if (error) {
    if (!isMissingSchema(error.message)) {
      console.error("getManualSoldEquity error:", error.message);
    }
    const fallback = await readFinancialControlsFallback();
    return Number(fallback.manualSoldPercentage ?? 0);
  }

  return Number(data?.manual_sold_percentage ?? 0);
}

export async function getEquityProgress() {
  const [acceptedSoldEquity, manualSoldEquity] = await Promise.all([
    getTotalSoldEquity(),
    getManualSoldEquity(),
  ]);
  const soldEquity = Math.min(
    GLOBAL_EQUITY_CAP,
    acceptedSoldEquity + manualSoldEquity
  );

  return {
    acceptedSoldEquity,
    manualSoldEquity,
    soldEquity,
    cap: GLOBAL_EQUITY_CAP,
    remainingEquity: Math.max(0, GLOBAL_EQUITY_CAP - soldEquity),
  };
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
      "id, percentage, price_usd, sponsor_referral_code, buyer_email, buyer_phone, receipt_url, status, created_at, updated_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error && isMissingSchema(error.message)) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("profit_share_requests")
      .select(
        "id, percentage, price_usd, sponsor_referral_code, receipt_url, status, created_at, updated_at"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (fallbackError) {
      console.error("getUserProfitShareRequests error:", fallbackError.message);
      return [];
    }

    return (fallbackData ?? []).map((row) => ({
      id: row.id,
      percentage: Number(row.percentage),
      price_usd: Number(row.price_usd),
      sponsor_referral_code: row.sponsor_referral_code ?? null,
      buyer_email: null,
      buyer_phone: null,
      receipt_url: row.receipt_url,
      status: row.status as ProfitShareRequestStatus,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  if (error) {
    console.error("getUserProfitShareRequests error:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    percentage: Number(row.percentage),
    price_usd: Number(row.price_usd),
    sponsor_referral_code: row.sponsor_referral_code ?? null,
    buyer_email: row.buyer_email ?? null,
    buyer_phone: row.buyer_phone ?? null,
    receipt_url: row.receipt_url,
    status: row.status as ProfitShareRequestStatus,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}
