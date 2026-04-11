"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { distributeSalariesAction } from "@/app/admin/actions";

export function SalariesDashboard() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    promoted: number;
    rewards_paid: number;
    salaries_paid: number;
    total_reward: number;
    total_salary: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDistribute = () => {
    const confirmed = window.confirm(
      "هل أنت متأكد من تريد توزيع رواتب القادة؟ سيتم تقييم الترقيات ومنح المكافآت والرواتب المستحقة."
    );
    if (!confirmed) return;

    setResult(null);
    setError(null);

    startTransition(async () => {
      const res = await distributeSalariesAction();
      if ("success" in res) {
        setResult(res.data);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              توزيع الرواتب والمكافآت
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              يقيّم الترقيات، يمنح مكافآت الترقية لمرة واحدة، ويوزع الرواتب لكل 15 يوم
            </p>
          </div>

          <button
            onClick={handleDistribute}
            disabled={isPending}
            className="bg-emerald-600 text-white rounded-xl px-6 py-3 text-sm font-bold hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_4px_14px_rgba(5,150,105,0.2)]"
          >
            {isPending ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                جارٍ التوزيع...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                توزيع رواتب القادة (كل 15 يوم)
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-rose-50 border border-rose-100 rounded-2xl px-5 py-4">
          <svg className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-rose-700 font-medium">{error}</p>
        </div>
      )}

      {result && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <h4 className="text-sm font-bold text-emerald-800">تم التوزيع بنجاح</h4>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-3 border border-emerald-100">
              <p className="text-xs text-slate-500">ترقيات جديدة</p>
              <p className="text-lg font-black text-slate-900">{result.promoted}</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-emerald-100">
              <p className="text-xs text-slate-500">مكافآت تُمنح</p>
              <p className="text-lg font-black text-emerald-600">
                {result.rewards_paid} <span className="text-xs font-medium text-slate-400">(${Number(result.total_reward).toFixed(2)})</span>
              </p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-emerald-100">
              <p className="text-xs text-slate-500">رواتب تُوزع</p>
              <p className="text-lg font-black text-blue-600">
                {result.salaries_paid} <span className="text-xs font-medium text-slate-400">(${Number(result.total_salary).toFixed(2)})</span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
