import Link from "next/link";
import { Sparkles, Layers, Users, ShieldCheck, TrendingUp, CheckCircle } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-slate-950 pt-32 pb-20 px-6">
      {/* Inline styles for custom floating animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes float-up {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
          }
          @keyframes float-down {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(20px); }
          }
          .animate-float-up {
            animation: float-up 6s ease-in-out infinite;
          }
          .animate-float-down {
            animation: float-down 8s ease-in-out infinite;
          }
        `
      }} />

      {/* Glow Orbs */}
      <div className="absolute top-[-10%] end-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/20 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] start-[-10%] w-[400px] h-[400px] rounded-full bg-blue-600/20 blur-[100px] pointer-events-none"></div>

      <div className="relative z-10 max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 items-center">
        
        {/* Logical Start: Content (Right in RTL) */}
        <div className="flex flex-col items-start text-start">
          <span className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-slate-900/50 text-emerald-400 text-sm font-medium mb-8 backdrop-blur-md border border-white/10 shadow-[0_0_15px_rgba(52,211,153,0.1)]">
            <Sparkles className="w-4 h-4" />
            منصة الأرباح والمهام الرائدة
          </span>
          
          <h1 className="text-5xl lg:text-7xl font-extrabold text-white mb-6 leading-tight tracking-tight">
            ابدأ رحلة <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-300">أرباحك</span> اليوم
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 max-w-xl mb-10 leading-relaxed font-light">
            أكمل مهامك اليومية بسهولة واكسب أرباحاً ثابتة. شارك Teamo مع أصدقائك وابنِ فريقك لتحقيق دخل إضافي من خلال نظام الإحالة المتعدد المستويات.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mb-12">
            <Link
              href="/register"
              className="w-full sm:w-auto text-center bg-emerald-600 text-white rounded-xl py-3.5 px-8 text-lg font-semibold hover:bg-emerald-500 transition-all duration-300 ease-out hover:-translate-y-1 active:scale-95 shadow-[0_4px_20px_0_rgba(5,150,105,0.4)]"
              aria-label="ابدأ الآن مجاناً"
            >
              ابدأ الآن مجاناً
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto text-center border border-white/10 text-white rounded-xl py-3.5 px-8 text-lg font-semibold hover:bg-white/5 transition-all duration-300 ease-out hover:-translate-y-1 active:scale-95 backdrop-blur-sm"
              aria-label="تسجيل الدخول"
            >
              تسجيل الدخول
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center gap-6 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-slate-500" />
              <span>6 مستويات إحالة</span>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-800 hidden sm:block"></div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-500" />
              <span>+1000 عضو نشط</span>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-800 hidden sm:block"></div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-slate-500" />
              <span>سحب سريع وآمن</span>
            </div>
          </div>
        </div>

        {/* Logical End: Visual Composition (Left in RTL) */}
        <div className="relative flex justify-center items-center py-10 h-[400px] lg:h-[500px]">
          
          {/* Card 1: Balance Simulation */}
          <div className="absolute top-10 end-4 lg:end-12 w-72 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl animate-float-up z-20">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 py-1 px-2 rounded-full">+12.5%</span>
            </div>
            <p className="text-slate-400 text-sm mb-1">الرصيد المتاح</p>
            <h3 className="text-3xl font-bold text-white">$1,250.00</h3>
          </div>

          {/* Card 2: Task Success Simulation */}
          <div className="absolute bottom-10 start-4 lg:start-0 w-80 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl animate-float-down z-10">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-white mb-1">مهمة مكتملة</h4>
                <p className="text-sm text-slate-400">تم إضافة الأرباح بنجاح إلى محفظتك.</p>
              </div>
            </div>
          </div>
          
          {/* Decorative rings behind cards */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] border border-white/5 rounded-full z-0"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-white/5 rounded-full z-0 transform rotate-45 border-dashed"></div>
        </div>
      </div>
    </section>
  );
}
