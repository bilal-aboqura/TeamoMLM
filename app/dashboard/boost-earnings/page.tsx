import Link from "next/link";
import {
  Rocket,
  Download,
  Trash2,
  DollarSign,
  ListChecks,
  TrendingUp,
  ArrowLeft,
  BadgeCheck,
  Star,
  Gift,
} from "lucide-react";

export const metadata = {
  title: "قم بزيادة أرباحك",
};

const steps = [
  {
    icon: <Download className="w-7 h-7" />,
    number: "01",
    title: "حمّل التطبيق",
    description: "اختر من بين مجموعة من التطبيقات المميزة وحمّلها على جهازك بنقرة واحدة.",
  },
  {
    icon: <ListChecks className="w-7 h-7" />,
    number: "02",
    title: "أنجز المهمة",
    description: "أكمل المهمة المطلوبة داخل التطبيق وارفع إثبات التنفيذ للحصول على مكافأتك.",
  },
  {
    icon: <DollarSign className="w-7 h-7" />,
    number: "03",
    title: "اكسب أرباحك",
    description: "تُضاف الأرباح مباشرة إلى رصيدك بعد تأكيد المهمة من قبل النظام.",
  },
  {
    icon: <Trash2 className="w-7 h-7" />,
    number: "04",
    title: "احذف التطبيق",
    description: "بعد تأكيد المهمة، يمكنك حذف التطبيق بحرية تامة والاستمتاع بأرباحك.",
  },
];

const benefits = [
  {
    icon: <TrendingUp className="w-6 h-6 text-emerald-600" />,
    title: "أرباح يومية إضافية",
    description: "زد دخلك اليومي بشكل ملحوظ عبر إتمام مهام التطبيقات المميزة إلى جانب مهامك الاعتيادية.",
  },
  {
    icon: <BadgeCheck className="w-6 h-6 text-blue-600" />,
    title: "مهام بسيطة وسريعة",
    description: "مهام سهلة التنفيذ لا تتطلب خبرة تقنية — حمّل، أكمل، واربح في دقائق معدودة.",
  },
  {
    icon: <Star className="w-6 h-6 text-amber-500" />,
    title: "ترقية أسرع للرتب",
    description: "نشاطك الإضافي يساهم في تسريع ترقيتك لرتب القيادة وزيادة راتبك الدوري.",
  },
  {
    icon: <Gift className="w-6 h-6 text-purple-600" />,
    title: "مكافآت حصرية قادمة",
    description: "شبكة شراكات واسعة مع مزودي CPA عالميين تضمن تدفق مهام جديدة باستمرار.",
  },
];

const partners = [
  { name: "MyLead", color: "from-blue-600 to-blue-500" },
  { name: "CPAlead", color: "from-emerald-600 to-emerald-500" },
  { name: "Adsterra", color: "from-violet-600 to-violet-500" },
  { name: "PropellerAds", color: "from-orange-600 to-orange-500" },
  { name: "Tapjoy", color: "from-cyan-600 to-cyan-500" },
];

export default function BoostEarningsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 md:p-10 text-white">
        <div className="absolute top-0 end-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 start-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-6">
            <Rocket className="w-7 h-7 text-emerald-400" />
          </div>

          <h1 className="text-3xl md:text-4xl font-black mb-3 leading-tight">
            قم بزيادة أرباحك
          </h1>
          <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-lg">
            تمتع بأرباح يومية أكثر مع مهام التطبيقات المميزة!
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/dashboard/packages"
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-6 py-3 text-sm font-bold active:scale-[0.98] transition-all shadow-[0_4px_14px_rgba(5,150,105,0.35)]"
            >
              <span>ترقية الباقة الآن</span>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── How It Works ── */}
      <section>
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-slate-900 mb-1">كيف يعمل النظام؟</h2>
          <p className="text-sm text-slate-500">أربع خطوات بسيطة نحو أرباح إضافية</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {steps.map((step) => (
            <div
              key={step.number}
              className="bg-white rounded-3xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-100 p-6 group hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-shadow duration-300"
            >
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 transition-colors duration-300">
                  {step.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-black text-slate-300 tracking-widest">
                    الخطوة {step.number}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5 mb-1">
                    {step.title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Benefits ── */}
      <section>
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-slate-900 mb-1">لماذا مهام التطبيقات؟</h2>
          <p className="text-sm text-slate-500">مزايا حصرية تضاعف أرباحك اليومية</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="bg-white rounded-3xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-100 p-5"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-3">
                {b.icon}
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">{b.title}</h3>
              <p className="text-[13px] text-slate-500 leading-relaxed">{b.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Upcoming Partners ── */}
      <section>
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-slate-900 mb-1">شركاؤنا القادمون</h2>
          <p className="text-sm text-slate-500">شبكة شراكات عالمية لضمان تدفق المهام</p>
        </div>

        <div className="bg-white rounded-3xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-100 p-6 md:p-8">
          <div className="flex flex-wrap justify-center gap-4">
            {partners.map((p) => (
              <div
                key={p.name}
                className="group relative"
              >
                <div className={`bg-gradient-to-r ${p.color} rounded-2xl px-6 py-3.5 shadow-[0_4px_14px_rgba(0,0,0,0.1)] group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.18)] group-hover:scale-[1.04] transition-all duration-300`}>
                  <span className="text-white text-sm font-bold tracking-wide">
                    {p.name}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              جاري العمل على ربط منصات CPA عالمية لتوفير مهام تطبيقات حصرية بأعلى العوائد
            </p>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="pb-4">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 to-emerald-500 p-8 text-center text-white shadow-[0_8px_30px_rgba(5,150,105,0.25)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.12),transparent_60%)]" />
          <div className="relative">
            <h2 className="text-xl md:text-2xl font-black mb-2">
              مستعد لمضاعفة أرباحك؟
            </h2>
            <p className="text-sm text-emerald-100 mb-6 max-w-md mx-auto">
              قم بالترقية إلى باقة B2 أو أعلى للوصول إلى مهام التطبيقات المميزة وأرباح تصل إلى $41.66 يومياً
            </p>
            <Link
              href="/dashboard/packages"
              className="inline-flex items-center gap-2 bg-white text-emerald-700 rounded-xl px-8 py-3 text-sm font-bold hover:bg-emerald-50 active:scale-[0.98] transition-all shadow-[0_4px_14px_rgba(0,0,0,0.1)]"
            >
              <span>تصفح الباقات</span>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
