// use client - Next.js error boundaries require client-side reset.
"use client";

export default function AppProfitsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md px-4 py-10 text-center" dir="rtl">
      <h2 className="text-xl font-bold text-slate-900">تعذر تحميل الربح بالتطبيقات</h2>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-95"
      >
        إعادة المحاولة
      </button>
    </div>
  );
}
