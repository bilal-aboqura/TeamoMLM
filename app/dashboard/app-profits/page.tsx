import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  DollarSign,
  Download,
  Gift,
  ListChecks,
  Rocket,
  Star,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAppProfitDashboard } from "./data";
import { AccessLockedState } from "./_components/AccessLockedState";
import { AppOfferList } from "./_components/AppOfferList";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "قم بزيادة أرباحك",
};

const steps = [
  {
    icon: <Download className="h-7 w-7" />,
    number: "01",
    title: "حمّل التطبيق",
    description: "اختر من بين مجموعة من التطبيقات المميزة وحمّلها على جهازك بنقرة واحدة.",
  },
  {
    icon: <ListChecks className="h-7 w-7" />,
    number: "02",
    title: "أنجز المهمة",
    description: "أكمل المهمة المطلوبة داخل التطبيق وارفع إثبات التنفيذ للحصول على مكافأتك.",
  },
  {
    icon: <DollarSign className="h-7 w-7" />,
    number: "03",
    title: "اكسب أرباحك",
    description: "تُضاف الأرباح مباشرة إلى رصيدك بعد تأكيد المهمة من قبل النظام.",
  },
  {
    icon: <Trash2 className="h-7 w-7" />,
    number: "04",
    title: "احذف التطبيق",
    description: "بعد تأكيد المهمة، يمكنك حذف التطبيق بحرية تامة والاستمتاع بأرباحك.",
  },
];

const benefits = [
  {
    icon: <TrendingUp className="h-6 w-6 text-emerald-600" />,
    title: "أرباح يومية إضافية",
    description: "زد دخلك اليومي بشكل ملحوظ عبر إتمام مهام التطبيقات المميزة إلى جانب مهامك الاعتيادية.",
  },
  {
    icon: <BadgeCheck className="h-6 w-6 text-blue-600" />,
    title: "مهام بسيطة وسريعة",
    description: "مهام سهلة التنفيذ لا تتطلب خبرة تقنية؛ حمّل، أكمل، واربح في دقائق معدودة.",
  },
  {
    icon: <Star className="h-6 w-6 text-amber-500" />,
    title: "ترقية أسرع للرتب",
    description: "نشاطك الإضافي يساهم في تسريع ترقيتك لرتب القيادة وزيادة راتبك الدوري.",
  },
  {
    icon: <Gift className="h-6 w-6 text-purple-600" />,
    title: "مكافآت حصرية قادمة",
    description: "شبكة شراكات واسعة مع مزودي CPA عالميين تضمن تدفق مهام جديدة باستمرار.",
  },
];

export default async function AppProfitsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { access, wallet, offers } = await getAppProfitDashboard(user.id);

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-6" dir="rtl">
      <section className="space-y-4">
        <div className="overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
          <div className="bg-gradient-to-l from-emerald-600 to-teal-500 px-5 py-5 text-white">
            <p className="text-sm font-semibold text-emerald-50">رصيد محفظة أرباح التطبيقات</p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-2xl font-black">الربح بالتطبيقات</h1>
                <p className="mt-1 text-sm text-emerald-50">
                  حمّل التطبيقات المتاحة وارفع إثبات التنفيذ من نفس الصفحة.
                </p>
              </div>
              <span className="text-3xl font-black" dir="ltr">
                {wallet.app_profits_balance.toFixed(2)} USD
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 p-4">
            <Link
              href="/dashboard/app-profits/history"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
            >
              سجل تطبيقاتي
            </Link>
            <Link
              href="/dashboard/app-profits/withdraw"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
            >
              السحب الأسبوعي
            </Link>
          </div>
        </div>

        {access.allowed ? <AppOfferList offers={offers} /> : <AccessLockedState />}
      </section>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-white md:p-10">
        <div className="relative">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/20">
            <Rocket className="h-7 w-7 text-emerald-400" />
          </div>

          <h1 className="mb-3 text-3xl font-black leading-tight md:text-4xl">
            قم بزيادة أرباحك
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-slate-300 md:text-lg">
            تمتع بأرباح يومية أكثر مع مهام التطبيقات المميزة!
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/dashboard/packages"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-[0_4px_14px_rgba(5,150,105,0.35)] transition-all hover:bg-emerald-500 active:scale-[0.98]"
            >
              <span>ترقية الباقة الآن</span>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-6 text-center">
          <h2 className="mb-1 text-xl font-bold text-slate-900">كيف يعمل النظام؟</h2>
          <p className="text-sm text-slate-500">أربع خطوات بسيطة نحو أرباح إضافية</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {steps.map((step) => (
            <div
              key={step.number}
              className="group rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-shadow duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-600 transition-colors duration-300 group-hover:border-emerald-600 group-hover:bg-emerald-600 group-hover:text-white">
                  {step.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-black tracking-widest text-slate-300">
                    الخطوة {step.number}
                  </span>
                  <h3 className="mb-1 mt-0.5 text-base font-bold text-slate-900">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-500">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-6 text-center">
          <h2 className="mb-1 text-xl font-bold text-slate-900">لماذا مهام التطبيقات؟</h2>
          <p className="text-sm text-slate-500">مزايا حصرية تضاعف أرباحك اليومية</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-slate-50">
                {benefit.icon}
              </div>
              <h3 className="mb-1 text-sm font-bold text-slate-900">{benefit.title}</h3>
              <p className="text-[13px] leading-relaxed text-slate-500">{benefit.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="pb-4">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 to-emerald-500 p-8 text-center text-white shadow-[0_8px_30px_rgba(5,150,105,0.25)]">
          <div className="relative">
            <h2 className="mb-2 text-xl font-black md:text-2xl">
              مستعد لمضاعفة أرباحك؟
            </h2>
            <p className="mx-auto mb-6 max-w-md text-sm text-emerald-100">
              قم بالترقية إلى باقة B2 أو أعلى للوصول إلى مهام التطبيقات المميزة وأرباح تصل إلى $41.66 يومياً
            </p>
            <Link
              href="/dashboard/packages"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3 text-sm font-bold text-emerald-700 shadow-[0_4px_14px_rgba(0,0,0,0.1)] transition-all hover:bg-emerald-50 active:scale-[0.98]"
            >
              <span>تصفح الباقات</span>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}
