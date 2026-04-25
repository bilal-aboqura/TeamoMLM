"use client";

export default function InvestmentError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12" dir="rtl">
      <div className="mx-auto max-w-xl rounded-2xl border border-red-100 bg-white p-6 text-center shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <h2 className="text-xl font-black text-slate-900">تعذر تحميل الاستثمار</h2>
        <p className="mt-2 text-sm text-slate-500">يرجى المحاولة مرة أخرى.</p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white"
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}
