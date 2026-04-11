import { Users } from "lucide-react";

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
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 min-w-0">
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all duration-200 hover:-translate-y-1">
        <span dir="ltr" className="text-[clamp(1.25rem,4vw,1.875rem)] leading-tight font-bold text-emerald-600 block break-all">
          {directCount.toLocaleString("en-US")}
        </span>
        <p className="text-sm text-slate-500 mt-1">الإحالات المباشرة</p>
      </div>
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all duration-200 hover:-translate-y-1">
        <span dir="ltr" className="text-[clamp(1.25rem,4vw,1.875rem)] leading-tight font-bold text-emerald-600 block break-all">
          {totalTeamSize.toLocaleString("en-US")}
        </span>
        <p className="text-sm text-slate-500 mt-1">حجم الفريق</p>
      </div>
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all duration-200 hover:-translate-y-1">
        <span dir="ltr" className="text-[clamp(1.25rem,4vw,1.875rem)] leading-tight font-bold text-emerald-600 block break-all">
          ${totalEarnings.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <p className="text-sm text-slate-500 mt-1">أرباح الإحالات</p>
      </div>
    </div>
  );
}
