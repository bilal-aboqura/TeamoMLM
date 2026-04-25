"use client";

export default function AdminInvestmentsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="rounded-2xl bg-white p-8 text-center">
      <h2 className="text-xl font-bold text-slate-900">تعذر تحميل الاستثمارات</h2>
      <button type="button" onClick={reset} className="mt-5 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white">
        إعادة المحاولة
      </button>
    </div>
  );
}
