// use client - Next.js error boundaries require client-side reset.
"use client";

export default function AppProfitHistoryError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md px-4 py-10 text-center" dir="rtl">
      <h2 className="text-xl font-bold text-slate-900">تعذر تحميل سجل التطبيقات</h2>
      <button onClick={reset} className="mt-4 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white">إعادة المحاولة</button>
    </div>
  );
}
