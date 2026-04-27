import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUsdtWalletAddress } from "@/lib/db/settings";
import { computeInvestmentSummary } from "@/lib/investment/calc";
import { getTradingReport } from "@/lib/investment/trading-report";
import { InvestmentClientShell } from "./_components/InvestmentClientShell";
import { InvestmentOverviewCards } from "./_components/InvestmentOverviewCards";
import { CycleCountdownTimer } from "./_components/CycleCountdownTimer";
import { TradingReportCard } from "./_components/TradingReportCard";
import { MarkNotificationsRead } from "./_components/MarkNotificationsRead";

export const dynamic = "force-dynamic";

export default async function InvestmentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [accountResult, depositsResult, withdrawalsResult, walletAddress] =
    await Promise.all([
      supabase
        .from("investment_accounts")
        .select(
          "total_capital, withdrawn_profits, last_cycle_start, current_tier_percentage, status"
        )
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("investment_deposits")
        .select("status, rejection_reason, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("investment_withdrawals")
        .select("amount")
        .eq("user_id", user.id)
        .eq("status", "pending"),
      getUsdtWalletAddress(),
    ]);

  const account = accountResult.data
    ? {
        total_capital: Number(accountResult.data.total_capital),
        withdrawn_profits: Number(accountResult.data.withdrawn_profits),
        last_cycle_start: accountResult.data.last_cycle_start,
        current_tier_percentage: accountResult.data.current_tier_percentage
          ? Number(accountResult.data.current_tier_percentage)
          : null,
        status: accountResult.data.status as "active" | "completed",
      }
    : null;

  const pendingWithdrawals = (withdrawalsResult.data ?? []).map((row) => ({
    amount: Number(row.amount),
  }));
  const summary = computeInvestmentSummary(account, pendingWithdrawals);
  const latestDeposit = (depositsResult.data?.[0] ?? null) as {
    status: "pending" | "accepted" | "rejected";
    rejection_reason: string | null;
  } | null;
  const report = summary.tierPercentage
    ? getTradingReport(summary.tierPercentage)
    : null;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 lg:py-12" dir="rtl">
      <MarkNotificationsRead />
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <p className="text-sm font-semibold text-emerald-600">Investment</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">
            الاستثمار ودورات التداول
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            تابع رأس المال، الأرباح المتراكمة، وطلبات السحب من لوحة واحدة.
          </p>
        </header>

        <InvestmentClientShell
          walletAddress={walletAddress}
          summary={summary}
          latestDeposit={latestDeposit}
        >
          <InvestmentOverviewCards summary={summary} />
          <CycleCountdownTimer nextCycleAt={summary.nextCycleAt} />
          {report ? <TradingReportCard report={report} /> : null}
        </InvestmentClientShell>
      </div>
    </div>
  );
}
