import { redirect } from "next/navigation";
import { PackageGrid } from "./_components/PackageGrid";
import { ProgressBar } from "./_components/ProgressBar";
import { RequestHistory } from "./_components/RequestHistory";
import { createClient } from "@/lib/supabase/server";
import {
  getEquityProgress,
  getUserProfitShareRequests,
} from "@/lib/db/equity";
import { getPaymentTarget } from "@/lib/db/payment-targets";

export const dynamic = "force-dynamic";

export default async function ProfitSharesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: profile }, progress, paymentTarget, requests] =
    await Promise.all([
      supabase
        .from("users")
        .select("phone_number")
        .eq("id", user.id)
        .maybeSingle(),
      getEquityProgress(),
      getPaymentTarget("profit_shares"),
      getUserProfitShareRequests(user.id),
    ]);

  const fullySubscribed = progress.remainingEquity <= 0;

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
                امتلك حصتك من أرباح الموقع
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                لا تشتري منتجًا ماديًا، بل تمتلك نسبة ثابتة من أرباح المنتجات المستقبلية داخل الموقع وتُسجل باسمك داخل النظام.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <p className="text-xs font-medium text-slate-500">
                المتاح حالياً
              </p>
              <p className="mt-1 text-2xl font-black text-slate-900" dir="ltr">
                {progress.remainingEquity.toFixed(2)}%
              </p>
            </div>
          </div>
        </header>

        <ProgressBar initialSoldEquity={progress.soldEquity} />

        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-600 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <h2 className="mb-3 text-xl font-black text-slate-900">
            كيف يعمل نظام حصص الأرباح؟
          </h2>
          <p>
            الموقع يحقق أرباحًا من بيع المنتجات ونظام العمولة، ويتم تخصيص 30% من صافي الأرباح لتوزيعها على أصحاب النسب. كل شخص يحصل على أرباح شهرية حسب النسبة التي يمتلكها.
          </p>
          <p className="mt-3">
            إذا امتلكت 1% فأنت تحصل على 1% من الأرباح الشهرية المخصصة لأصحاب النسب. تبدأ الأرباح عند تشغيل وبيع المنتجات داخل الموقع أو بعد اكتمال بيع النسب المعروضة.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              "النسبة التي تشتريها ثابتة لك",
              "الأرباح تعتمد على أداء الموقع وليست ثابتة",
              "يمكن بيع أو نقل النسبة لاحقًا بإشراف الإدارة",
            ].map((item) => (
              <div
                key={item}
                className="rounded-xl bg-slate-50 px-4 py-3 font-semibold text-slate-700"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        {fullySubscribed ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800">
            <p className="font-bold">تم بيع النسب المتاحة حاليًا</p>
            <p className="mt-1 text-sm">
              الصفحة تبقى مفتوحة، ويمكن للإدارة تعديل النسب المتاحة أو استقبال إعادة بيع لاحقًا.
            </p>
          </div>
        ) : null}

        <PackageGrid
          remainingEquity={progress.remainingEquity}
          paymentTarget={paymentTarget}
          defaultPhone={profile?.phone_number ?? ""}
          disabled={fullySubscribed}
        />

        <RequestHistory requests={requests} />
      </div>
    </div>
  );
}
