import { createAdminClient } from "@/lib/supabase/admin";
import type { AppProfitWithdrawal } from "@/lib/app-profits/types";
import { WithdrawalsTable } from "./_components/WithdrawalsTable";

export const dynamic = "force-dynamic";

export default async function AppProfitWithdrawalsPage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("app_profit_withdrawals")
    .select("id, user_id, amount, status, rejection_reason, created_at, reviewed_at, users(full_name)")
    .order("created_at", { ascending: false });

  const withdrawals: AppProfitWithdrawal[] = (data ?? []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    user_full_name: (row.users as unknown as { full_name: string } | null)?.full_name ?? "غير متوفر",
    amount: Number(row.amount),
    status: row.status as AppProfitWithdrawal["status"],
    rejection_reason: row.rejection_reason ?? undefined,
    created_at: row.created_at,
    reviewed_at: row.reviewed_at ?? undefined,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">سحوبات أرباح التطبيقات</h1>
        <p className="mt-1 text-sm text-slate-500">مراجعة طلبات سحب محفظة أرباح التطبيقات</p>
      </div>
      <WithdrawalsTable withdrawals={withdrawals} />
    </div>
  );
}
