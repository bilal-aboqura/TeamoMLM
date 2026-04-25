"use client";

import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";

const GLOBAL_EQUITY_CAP = 30;

type ProgressResponse = {
  soldEquity: number;
  cap: number;
  remainingEquity: number;
};

export function ProgressBar({
  initialSoldEquity,
}: {
  initialSoldEquity: number;
}) {
  const [progress, setProgress] = useState<ProgressResponse>({
    soldEquity: initialSoldEquity,
    cap: GLOBAL_EQUITY_CAP,
    remainingEquity: Math.max(0, GLOBAL_EQUITY_CAP - initialSoldEquity),
  });

  useEffect(() => {
    let cancelled = false;

    async function refreshProgress() {
      try {
        const response = await fetch("/api/equity/progress", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const next = (await response.json()) as ProgressResponse;
        if (!cancelled) setProgress(next);
      } catch {}
    }

    const interval = window.setInterval(refreshProgress, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const percentage = Math.min(
    100,
    Math.max(0, (progress.soldEquity / progress.cap) * 100)
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <TrendingUp className="h-5 w-5" strokeWidth={2} />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">تقدم بيع الأسهم</h2>
            <p className="text-sm text-slate-500">
              يتم تحديث المؤشر تلقائياً كل 15 ثانية.
            </p>
          </div>
        </div>
        <div className="text-start sm:text-end">
          <p className="text-2xl font-black text-slate-900" dir="ltr">
            {progress.soldEquity.toFixed(2)}%
          </p>
          <p className="text-xs font-medium text-slate-500" dir="ltr">
            of {progress.cap}% sold
          </p>
        </div>
      </div>

      <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-500">
        <span dir="ltr">{progress.remainingEquity.toFixed(2)}% available</span>
        <span dir="ltr">{percentage.toFixed(1)}%</span>
      </div>
    </section>
  );
}
