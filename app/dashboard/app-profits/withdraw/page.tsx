import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getAppProfitAccess, ensureIsolatedWallet } from "@/lib/app-profits/access";
import { WithdrawForm } from "./_components/WithdrawForm";

export const dynamic = "force-dynamic";

export default async function AppProfitWithdrawPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  const access = await getAppProfitAccess(user.id);
  if (!access.allowed) redirect("/dashboard/app-profits");

  await ensureIsolatedWallet(user.id);
  const adminClient = createAdminClient();
  const [{ data: wallet }, { data: withdrawals }] = await Promise.all([
    adminClient
      .from("user_isolated_wallets")
      .select("app_profits_balance")
      .eq("user_id", user.id)
      .maybeSingle(),
    adminClient
      .from("app_profit_withdrawals")
      .select("id, amount, status, rejection_reason, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const isFriday = new Date().getDay() === 5;

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">سحب أرباح التطبيقات</h1>
        <p className="mt-1 text-sm text-slate-500">طلبات السحب تفتح يوم الجمعة فقط</p>
      </div>
      <WithdrawForm balance={Number(wallet?.app_profits_balance ?? 0)} isFriday={isFriday} />
      <div className="space-y-3">
        {(withdrawals ?? []).map((withdrawal) => (
          <div key={withdrawal.id} className="rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900" dir="ltr">{Number(withdrawal.amount).toFixed(2)} USD</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{withdrawal.status}</span>
            </div>
            <p className="mt-2 text-xs text-slate-400">{new Date(withdrawal.created_at).toLocaleDateString("ar-EG")}</p>
            {withdrawal.rejection_reason && <p className="mt-2 text-sm text-red-600">{withdrawal.rejection_reason}</p>}
          </div>
        ))}
      </div>
    </main>
  );
}
