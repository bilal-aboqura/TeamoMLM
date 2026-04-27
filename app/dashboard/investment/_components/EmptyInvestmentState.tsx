"use client";

import { TrendingUp } from "lucide-react";

export function EmptyInvestmentState({
  onDepositClick,
  depositDisabled = false,
}: {
  onDepositClick: () => void;
  depositDisabled?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
        <TrendingUp className="h-7 w-7" strokeWidth={2} />
      </div>
      <h2 className="mt-5 text-xl font-black text-slate-900">
        ابدأ أول دورة استثمار
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
        أودع رأس المال، انتظر مراجعة الإدارة، ثم تابع الأرباح المحسوبة كل 7 أيام.
      </p>
      <button
        type="button"
        disabled={depositDisabled}
        onClick={onDepositClick}
        className="mt-6 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        إيداع رأس المال
      </button>
    </section>
  );
}
