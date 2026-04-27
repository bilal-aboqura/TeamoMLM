import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAppProfitDashboard } from "./data";
import { AccessLockedState } from "./_components/AccessLockedState";
import { AppOfferList } from "./_components/AppOfferList";

export const dynamic = "force-dynamic";

export default async function AppProfitsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { access, wallet, offers } = await getAppProfitDashboard(user.id);

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6" dir="rtl">
      <div className="rounded-2xl bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <p className="text-sm font-medium text-slate-400">رصيد محفظة أرباح التطبيقات</p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">الربح بالتطبيقات</h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/dashboard/app-profits/history"
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-emerald-200 hover:text-emerald-700"
              >
                سجل تطبيقاتي
              </Link>
              <Link
                href="/dashboard/app-profits/withdraw"
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:border-emerald-200 hover:text-emerald-700"
              >
                السحب الأسبوعي
              </Link>
            </div>
          </div>
          <span className="text-xl font-bold text-emerald-600" dir="ltr">
            {wallet.app_profits_balance.toFixed(2)} USD
          </span>
        </div>
      </div>

      {access.allowed ? <AppOfferList offers={offers} /> : <AccessLockedState />}
    </main>
  );
}
