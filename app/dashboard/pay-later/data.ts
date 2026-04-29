import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentTarget, type PaymentTarget } from "@/lib/db/payment-targets";

export type PayLaterPackage = {
  id: string;
  name: string;
  price: number;
  daily_task_count: number;
  daily_profit: number;
  display_order: number;
};

export type PayLaterDebt = {
  id: string;
  from_package_name: string;
  to_package_name: string;
  upgrade_amount: number;
  repayment_fee_pct: number;
  repayment_fee_amount: number;
  penalty_amount: number;
  locked_profit: number;
  amount_paid: number;
  status: "active" | "pending_review" | "overdue" | "paid" | "cancelled";
  upgraded_at: string;
  due_at: string;
  paid_at: string | null;
  repayment_submitted_at: string | null;
};

export type PayLaterDashboardData = {
  currentPackage: PayLaterPackage | null;
  nextPackage: PayLaterPackage | null;
  walletBalance: number;
  approvedWorkDays: number;
  manualEligible: boolean;
  eligible: boolean;
  recentUpgradeBlocked: boolean;
  activeDebt: PayLaterDebt | null;
  latestDebt: PayLaterDebt | null;
  paymentTarget: PaymentTarget | null;
};

export async function getPayLaterDashboardData(
  userId: string
): Promise<PayLaterDashboardData> {
  const supabase = createAdminClient();

  await supabase.rpc("process_overdue_pay_later_debts");

  const [
    { data: profile },
    { data: packages },
    { data: logs },
    { data: debts },
    paymentTarget,
  ] =
    await Promise.all([
      supabase
        .from("users")
        .select(
          "wallet_balance, current_package_level, pay_later_manual_eligible"
        )
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("packages")
        .select(
          "id, name, price, daily_task_count, daily_profit, display_order"
        )
        .eq("is_active", true)
        .order("display_order", { ascending: true }),
      supabase
        .from("task_completion_logs")
        .select("completion_date")
        .eq("user_id", userId)
        .eq("status", "approved"),
      supabase
        .from("pay_later_debts")
        .select(
          "id, from_package_name, to_package_name, upgrade_amount, repayment_fee_pct, repayment_fee_amount, penalty_amount, locked_profit, amount_paid, status, upgraded_at, due_at, paid_at, repayment_submitted_at"
        )
        .eq("user_id", userId)
        .order("upgraded_at", { ascending: false }),
      getPaymentTarget("pay_later"),
    ]);

  const packageRows = (packages ?? []).map((pkg) => ({
    ...pkg,
    price: Number(pkg.price),
    daily_profit: Number(pkg.daily_profit),
  }));

  const currentPackage =
    packageRows.find((pkg) => pkg.name === profile?.current_package_level) ??
    null;

  const nextPackage = currentPackage
    ? packageRows.find(
        (pkg) => pkg.display_order === currentPackage.display_order + 1
      ) ?? null
    : null;

  const approvedWorkDays = new Set(
    (logs ?? []).map((log) => log.completion_date)
  ).size;

  const activeDebt =
    ((debts ?? []).find((debt) =>
      ["active", "pending_review", "overdue"].includes(debt.status)
    ) as PayLaterDebt | undefined) ?? null;

  const latestDebt = ((debts ?? [])[0] as PayLaterDebt | undefined) ?? null;

  const recentUpgradeBlocked = Boolean(
    latestDebt &&
      new Date(latestDebt.upgraded_at).getTime() >=
        Date.now() - 30 * 24 * 60 * 60 * 1000
  );

  const manualEligible = Boolean(profile?.pay_later_manual_eligible);

  return {
    currentPackage,
    nextPackage,
    walletBalance: Number(profile?.wallet_balance ?? 0),
    approvedWorkDays,
    manualEligible,
    eligible:
      Boolean(currentPackage) &&
      Boolean(nextPackage) &&
      !activeDebt &&
      !recentUpgradeBlocked &&
      (approvedWorkDays >= 30 || manualEligible),
    recentUpgradeBlocked,
    activeDebt,
    latestDebt,
    paymentTarget,
  };
}
