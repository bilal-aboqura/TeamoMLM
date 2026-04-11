import { Package } from "lucide-react";

export function PackageStatusBadge({
  currentPackageLevel,
}: {
  currentPackageLevel: string | null;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] h-full flex flex-col justify-center transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] relative overflow-hidden group">
      <div className="absolute top-0 end-0 p-4 opacity-5 pointer-events-none transition-transform duration-500 group-hover:scale-110 group-hover:opacity-10">
        <Package className="w-16 h-16 text-slate-900" strokeWidth={1.5} />
      </div>
      
      <div className="relative z-10">
        <p className="text-slate-400 font-medium text-sm mb-3">حالة الباقة</p>
        {currentPackageLevel ? (
          <div className="flex items-center gap-2">
            <span className="bg-emerald-50 text-emerald-600 rounded-xl px-4 py-2 text-sm font-bold border border-emerald-100 shadow-sm flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {currentPackageLevel}
            </span>
          </div>
        ) : (
          <span className="bg-slate-50 text-slate-500 rounded-xl px-4 py-2 text-sm font-medium border border-slate-200 shadow-sm inline-block">
            غير مفعّل
          </span>
        )}
      </div>
    </div>
  );
}
