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
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 md:p-8 border border-slate-800 shadow-xl transition-all duration-300">
      {/* Glow / Background Effects */}
      <div className="absolute top-0 end-0 w-full h-[150%] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent pointer-events-none"></div>
      <div className="absolute -top-24 -end-24 w-64 h-64 bg-emerald-500/20 blur-[80px] rounded-full pointer-events-none"></div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 backdrop-blur-md">
              <Coins className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">إجمالي أرباح الإحالات</p>
          </div>
          
          <div className="flex items-baseline gap-1 break-all" dir="ltr">
            <span className="text-2xl font-medium text-emerald-500 mb-1 shrink-0">$</span>
            <span className="text-[clamp(2.5rem,5vw,3.5rem)] leading-none font-bold text-white tracking-tight">
              {totalEarnings.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* The Two Small Inner Inset Blocks */}
        <div className="flex bg-slate-900/50 backdrop-blur-md border border-slate-700/50 rounded-2xl p-2 shrink-0 md:w-auto w-full">
          
          {/* Box 1: Team Size */}
          <div className="flex-1 md:w-28 lg:w-32 flex flex-col items-center justify-center p-3 text-center border-e border-slate-700/50">
            <Users className="w-5 h-5 text-blue-400 mb-1.5" strokeWidth={1.5} />
            <span dir="ltr" className="text-xl lg:text-2xl font-bold text-white leading-tight break-all">
              {totalTeamSize.toLocaleString("en-US")}
            </span>
            <p className="text-[10px] lg:text-xs text-slate-400 mt-1">حجم الفريق</p>
          </div>

          {/* Box 2: Direct */}
          <div className="flex-1 md:w-28 lg:w-32 flex flex-col items-center justify-center p-3 text-center">
            <UserPlus className="w-5 h-5 text-emerald-400 mb-1.5" strokeWidth={1.5} />
            <span dir="ltr" className="text-xl lg:text-2xl font-bold text-white leading-tight break-all">
              {directCount.toLocaleString("en-US")}
            </span>
            <p className="text-[10px] lg:text-xs text-slate-400 mt-1">مباشرين</p>
          </div>

        </div>
      </div>
    </div>
  );
}
