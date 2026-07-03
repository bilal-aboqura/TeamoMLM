"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calendar } from "lucide-react";

export function DateRangeFilter({
  initialFrom = "",
  initialTo = "",
}: {
  initialFrom?: string;
  initialTo?: string;
}) {
  const router = useRouter();
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);

  // Sync local state when the server passes new values after navigation
  useEffect(() => {
    setFrom(initialFrom);
    setTo(initialTo);
  }, [initialFrom, initialTo]);

  const hasFilter = Boolean(from || to);

  const apply = () => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const qs = params.toString();
    router.push(qs ? `/admin/financials?${qs}` : "/admin/financials");
  };

  const clear = () => {
    setFrom("");
    setTo("");
    router.push("/admin/financials");
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 outline-none transition-all";

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-4 h-4 text-slate-400" strokeWidth={2} />
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          تصفية حسب التاريخ
        </span>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
            من تاريخ
          </label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex-1">
          <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
            إلى تاريخ
          </label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={apply}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 active:scale-95 transition-all shadow-[0_4px_14px_0_rgba(5,150,105,0.3)]"
          >
            تطبيق
          </button>
          {hasFilter && (
            <button
              onClick={clear}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all"
            >
              مسح
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
