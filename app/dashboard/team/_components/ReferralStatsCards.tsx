import { Users, UserPlus, Coins, Repeat } from "lucide-react";

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
  const earningsString = totalEarnings.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const earningsChars = earningsString.split('');

  return (
    <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-3xl pb-8 pt-10 px-6 sm:px-10 border border-slate-800 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden flex flex-col w-full max-w-sm mx-auto shadow-2xl">
      
      {/* Top Section */}
      <div className="flex flex-col items-end text-end w-full absolute top-8 end-8">
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-medium text-slate-400 text-center w-min leading-snug">
            إجمالي أرباح الإحالات
          </p>
          <div className="rounded-xl p-2 bg-emerald-950/30 border border-emerald-500/10 flex items-center justify-center shadow-inner">
            <Coins className="w-5 h-5 text-emerald-500" strokeWidth={1.5} />
          </div>
        </div>
      </div>

      {/* Central Metric (Vertical Stack) */}
      <div className="flex flex-col items-end pe-0 w-full mt-28 mb-4">
        <div className="flex items-start">
           <span className="text-emerald-500 text-[1.5rem] font-medium mt-3 shrink-0 ms-1">$</span>
           <div className="flex flex-col items-center leading-[0.85] tracking-tighter" dir="ltr">
             {earningsChars.map((char, i) => (
                <span key={i} className={`text-[4rem] font-black ${char === '.' ? 'text-emerald-500' : 'text-white'}`}>
                  {char}
                </span>
             ))}
           </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="rounded-xl bg-slate-950/60 p-5 mt-auto flex border border-slate-800/80 shadow-md">
        <div className="flex-1 flex flex-col items-center justify-center">
          <UserPlus className="w-5 h-5 text-emerald-500 mb-2" strokeWidth={1.5} />
          <span className="text-2xl font-bold text-white mb-0.5" dir="ltr">{directCount}</span>
          <p className="text-[10px] text-slate-400">مباشرين</p>
        </div>
        <div className="w-[1px] bg-slate-800/80 mx-2 self-stretch"></div>
        <div className="flex-1 flex flex-col items-center justify-center">
          <Users className="w-5 h-5 text-blue-400 mb-2" strokeWidth={1.5} />
          <span className="text-2xl font-bold text-white mb-0.5" dir="ltr">{totalTeamSize}</span>
          <p className="text-[10px] text-slate-400">حجم الفريق</p>
        </div>
      </div>
    </div>
  );
}
