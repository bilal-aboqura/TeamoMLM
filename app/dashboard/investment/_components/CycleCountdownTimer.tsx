"use client";

import { useEffect, useState } from "react";

function getRemaining(nextCycleAt: string | null) {
  if (!nextCycleAt) return 0;
  return Math.max(0, new Date(nextCycleAt).getTime() - Date.now());
}

function split(ms: number) {
  const seconds = Math.floor(ms / 1000);
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
  };
}

export function CycleCountdownTimer({
  nextCycleAt,
}: {
  nextCycleAt: string | null;
}) {
  const [remaining, setRemaining] = useState(() => getRemaining(nextCycleAt));

  useEffect(() => {
    const interval = window.setInterval(() => {
      setRemaining(getRemaining(nextCycleAt));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [nextCycleAt]);

  const parts = split(remaining);

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">الدورة القادمة</h2>
          <p className="mt-1 text-sm text-slate-500">
            {remaining === 0 ? "تم احتساب الأرباح" : "الأرباح تحتسب كل 7 أيام"}
          </p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            ["D", parts.days],
            ["H", parts.hours],
            ["M", parts.minutes],
            ["S", parts.seconds],
          ].map(([label, value]) => (
            <div key={label} className="min-w-16 rounded-xl bg-slate-50 px-3 py-3 text-center">
              <p className="text-xl font-black text-slate-900" dir="ltr">
                {String(value).padStart(2, "0")}
              </p>
              <p className="mt-1 text-[10px] font-bold text-slate-400">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
