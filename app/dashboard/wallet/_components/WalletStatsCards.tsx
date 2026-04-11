import { Wallet, ArrowDownLeft, Clock } from "lucide-react";

export function WalletStatsCards({
  availableBalance,
  totalWithdrawn,
  pendingWithdrawals,
}: {
  availableBalance: number;
  totalWithdrawn: number;
  pendingWithdrawals: number;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-center relative">
        {/* Subtle decorative ring */}
        <div className="absolute top-0 end-0 p-6 opacity-10 pointer-events-none">
          <Wallet className="w-32 h-32 text-white" />
        </div>
        
        <p className="text-slate-300 font-medium mb-2 relative z-10">الرصيد المتاح</p>
        <div className="flex items-end justify-center gap-1 relative z-10">
          <span className="text-emerald-400 font-black text-5xl tracking-tight" dir="ltr">
            ${availableBalance.toFixed(2)}
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 divide-s divide-slate-100 p-6 bg-white">
        <div className="text-center px-4">
          <div className="flex items-center justify-center gap-2 text-slate-500 mb-2">
            <ArrowDownLeft className="w-4 h-4 text-rose-500" />
            <span className="text-sm font-medium">إجمالي المسحوب</span>
          </div>
          <span className="text-slate-900 font-bold text-xl" dir="ltr">
            ${totalWithdrawn.toFixed(2)}
          </span>
        </div>
        
        <div className="text-center px-4">
          <div className="flex items-center justify-center gap-2 text-slate-500 mb-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium">قيد المراجعة</span>
          </div>
          <span className="text-slate-900 font-bold text-xl" dir="ltr">
            ${pendingWithdrawals.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
