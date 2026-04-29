import { createAdminClient } from "@/lib/supabase/admin";
import {
  isMissingSchema,
  readFinancialControlsFallback,
} from "@/lib/db/financial-controls-fallback";

export type DbTradingReport = {
  totalTrades: number;
  won: number;
  lost: number;
  periodStart: string | null;
  periodEnd: string | null;
  details: string;
};

export async function getCurrentTradingReport(): Promise<DbTradingReport> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("investment_trading_reports")
    .select("total_trades, won_trades, lost_trades, period_start, period_end, details")
    .eq("id", true)
    .maybeSingle();

  if (error && isMissingSchema(error.message)) {
    const fallback = (await readFinancialControlsFallback()).tradingReport;
    if (fallback) return fallback;
  }

  return {
    totalTrades: Number(data?.total_trades ?? 0),
    won: Number(data?.won_trades ?? 0),
    lost: Number(data?.lost_trades ?? 0),
    periodStart: data?.period_start ?? null,
    periodEnd: data?.period_end ?? null,
    details: data?.details ?? "",
  };
}

export async function getManualInvestmentProfitTotal(
  userId: string
): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("investment_manual_profits")
    .select("amount")
    .eq("user_id", userId);

  if (error) return 0;
  return (data ?? []).reduce((total, row) => total + Number(row.amount ?? 0), 0);
}
