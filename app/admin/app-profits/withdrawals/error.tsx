// use client - Next.js error boundaries require client-side reset.
"use client";

export default function AppProfitWithdrawalsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-2xl bg-white p-8 text-center">
      <h2 className="text-xl font-bold text-slate-900">تعذر تحميل سحوبات التطبيقات</h2>
      <button onClick={reset} className="mt-4 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white">إعادة المحاولة</button>
    </div>
  );
}
