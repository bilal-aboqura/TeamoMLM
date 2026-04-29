import type { TradingReport } from "@/lib/investment/trading-report";

export function TradingReportCard({ report }: { report: TradingReport }) {
  const winRate =
    report.totalTrades > 0 ? Math.round((report.won / report.totalTrades) * 100) : 0;

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">تقرير التداول</h2>
          <p className="mt-1 text-sm text-slate-500">ملخص تجريبي للدورة الحالية</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-600" dir="ltr">
          +{report.netResultPercentage}%
        </span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs text-slate-500">الصفقات</p>
          <p className="mt-2 text-xl font-black text-slate-900">{report.totalTrades}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-4">
          <p className="text-xs text-emerald-700">الرابحة</p>
          <p className="mt-2 text-xl font-black text-emerald-700">{report.won}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs text-slate-500">الخاسرة</p>
          <p className="mt-2 text-xl font-black text-slate-700">{report.lost}</p>
        </div>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${winRate}%` }} />
      </div>
      {(report.periodStart || report.periodEnd || report.details) ? (
        <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          {report.periodStart || report.periodEnd ? (
            <p className="mb-2 font-semibold text-slate-700" dir="ltr">
              {report.periodStart ?? "—"} / {report.periodEnd ?? "—"}
            </p>
          ) : null}
          {report.details ? <p>{report.details}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
