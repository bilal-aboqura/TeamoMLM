import { TrendingUp } from "lucide-react";

export function BalanceCard({
  walletBalance,
  totalEarned,
}: {
  walletBalance: number;
  totalEarned: number;
}) {
  return (
    <div className="bg-white rounded-2xl p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] h-full flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] relative overflow-hidden group">
      {/* Decorative gradient orb */}
      <div className="absolute -top-24 -end-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700 pointer-events-none" />
      
      <div className="space-y-6 relative z-10">
        <div>
          <p className="text-slate-500 font-medium text-sm mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            الرصيد المتاح
          </p>
          <span
            dir="ltr"
            className="font-mono text-slate-900 font-bold text-4xl block tracking-tight"
          >
            ${walletBalance.toFixed(2)}
          </span>
        </div>
        
        <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-slate-400 font-medium text-sm mb-1">إجمالي الأرباح</p>
            <span
              dir="ltr"
              className="font-mono text-emerald-600 font-bold text-xl block"
            >
              +${totalEarned.toFixed(2)}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center shadow-inner">
            <TrendingUp className="w-6 h-6 text-emerald-500" strokeWidth={2} />
          </div>
        </div>
      </div>
    </div>
  );
}
