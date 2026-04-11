import { Users, UserPlus, Coins } from "lucide-react";

export function ReferralStatsCards({
  directCount,
  totalTeamSize,
  totalEarnings,
}: {
  directCount: number;
  totalTeamSize: number;
  totalEarnings: number;
}) {
  if (directCount === 0 && totalTeamSize === 0 && totalEarnings === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <div className="mb-4 flex justify-center">
          <Users className="w-12 h-12 text-slate-200" strokeWidth={1.5} />
        </div>
        <p className="text-slate-700 font-semibold mb-2">
          ليس لديك أعضاء في فريقك بعد
        </p>
        <a
          href="#invite-link"
          className="inline-block bg-emerald-600 text-white rounded-xl px-6 py-3 font-bold shadow-[0_4px_14px_0_rgba(5,150,105,0.39)] hover:bg-emerald-700 active:scale-95 transition-all duration-200"
        >
          ابدأ بدعوة أصدقائك
        </a>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 min-w-0">
      {/* Card 1: Direct Referrals */}
      <div className="relative overflow-hidden bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm transition-all duration-300 hover:shadow-md hover:border-emerald-200 group">
        <div className="absolute top-0 end-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -me-10 -mt-10 opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">الإحالات المباشرة</p>
            <span dir="ltr" className="text-[clamp(1.5rem,4vw,1.875rem)] leading-tight font-bold text-slate-900 block break-all">
              {directCount.toLocaleString("en-US")}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-inner">
            <UserPlus className="w-6 h-6" strokeWidth={1.5} />
          </div>
        </div>
      </div>

      {/* Card 2: Team Size */}
      <div className="relative overflow-hidden bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm transition-all duration-300 hover:shadow-md hover:border-blue-200 group">
        <div className="absolute top-0 end-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -me-10 -mt-10 opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">حجم الفريق بالكامل</p>
            <span dir="ltr" className="text-[clamp(1.5rem,4vw,1.875rem)] leading-tight font-bold text-slate-900 block break-all">
              {totalTeamSize.toLocaleString("en-US")}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-inner">
            <Users className="w-6 h-6" strokeWidth={1.5} />
          </div>
        </div>
      </div>

      {/* Card 3: Earnings (Premium Highlight) */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-slate-800 shadow-xl transition-all duration-300 hover:-translate-y-1">
        <div className="absolute top-0 end-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent pointer-events-none"></div>
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">أرباح الإحالات المستلمة</p>
            <div className="flex items-baseline gap-1 break-all" dir="ltr">
              <span className="text-xl font-medium text-emerald-500 mb-1 shrink-0">$</span>
              <span className="text-[clamp(1.5rem,4vw,2rem)] leading-tight font-bold text-white tracking-tight">
                {totalEarnings.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-800/50 border border-slate-700/50 text-emerald-400 flex items-center justify-center shrink-0 backdrop-blur-md relative z-10">
            <Coins className="w-6 h-6" strokeWidth={1.5} />
          </div>
        </div>
      </div>
    </div>
  );
}
