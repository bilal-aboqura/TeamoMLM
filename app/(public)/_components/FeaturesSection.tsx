import { Target, Users, Zap, Gem } from "lucide-react";

export default function FeaturesSection() {
  const features = [
    {
      icon: <Target className="w-8 h-8 text-emerald-600" strokeWidth={1.5} />,
      title: "المهام اليومية",
      description: "أكمل مهامك اليومية البسيطة واكسب أرباحاً يومية ثابتة بكل سهولة وسرعة.",
    },
    {
      icon: <Users className="w-8 h-8 text-emerald-600" strokeWidth={1.5} />,
      title: "نظام إحالة من 6 مستويات",
      description: "ادعُ أصدقاءك وابنِ فريقك لتحقيق أرباح متعددة المستويات لضمان دخل مستمر.",
    },
    {
      icon: <Zap className="w-8 h-8 text-emerald-600" strokeWidth={1.5} />,
      title: "سحوبات سريعة وآمنة",
      description: "اسحب أرباحك بسهولة وأمان في أي وقت تشاء عبر طرق دفع متعددة وموثوقة.",
    },
    {
      icon: <Gem className="w-8 h-8 text-emerald-600" strokeWidth={1.5} />,
      title: "باقات VIP حصرية",
      description: "اختر الباقة التي تناسبك وضاعف أرباحك اليومية مع ميزات حصرية مخصصة لك.",
    },
  ];

  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">لماذا Teamo؟</h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            نقدم لك منصة متكاملة تجمع بين سهولة الاستخدام والعوائد المجزية
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:-translate-y-1 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all duration-300"
            >
              <div className="text-4xl mb-6 bg-slate-50 w-16 h-16 rounded-2xl flex items-center justify-center">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">{feature.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
