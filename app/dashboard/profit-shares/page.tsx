import { redirect } from "next/navigation";
import { PackageGrid } from "./_components/PackageGrid";
import { ProgressBar } from "./_components/ProgressBar";
import { RequestHistory } from "./_components/RequestHistory";
import { createClient } from "@/lib/supabase/server";
import {
  GLOBAL_EQUITY_CAP,
  getTotalSoldEquity,
  getUserProfitShareRequests,
} from "@/lib/db/equity";
import { getUsdtWalletAddress } from "@/lib/db/settings";

export const dynamic = "force-dynamic";

export default async function ProfitSharesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [totalSoldEquity, walletAddress, requests] = await Promise.all([
    getTotalSoldEquity(),
    getUsdtWalletAddress(),
    getUserProfitShareRequests(user.id),
  ]);

  const remainingEquity = Math.max(0, GLOBAL_EQUITY_CAP - totalSoldEquity);
  const fullySubscribed = remainingEquity <= 0;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 lg:py-12" dir="rtl">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-3">
          <p className="text-sm font-semibold text-emerald-600">
            Profit Shares
          </p>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-black text-slate-900">
                حصص الأرباح وشراء الأسهم
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                اختر باقة الأسهم المناسبة، ارفع إيصال الدفع، وتابع حالة طلبك من نفس الصفحة.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <p className="text-xs font-medium text-slate-500">
                المتاح حالياً
              </p>
              <p className="mt-1 text-2xl font-black text-slate-900" dir="ltr">
                {remainingEquity.toFixed(2)}%
              </p>
            </div>
          </div>
        </header>

        <ProgressBar initialSoldEquity={totalSoldEquity} />

        {fullySubscribed ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800">
            <p className="font-bold">تم الاكتتاب بالكامل</p>
            <p className="mt-1 text-sm">
              وصلت حصص الأرباح المتاحة إلى الحد الأقصى الحالي 30%.
            </p>
          </div>
        ) : null}

        <PackageGrid
          remainingEquity={remainingEquity}
          walletAddress={walletAddress}
          disabled={fullySubscribed}
        />

        <RequestHistory requests={requests} />
      </div>
    </div>
  );
}
