"use client";

export default function HistoryError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-md mx-auto px-4 py-6 text-center">
      <h2 className="text-xl font-bold text-slate-900 mb-2">
        تعذر تحميل سجل الطلبات
      </h2>
      <button
        onClick={reset}
        aria-label="إعادة المحاولة"
        className="bg-slate-900 text-white rounded-xl px-6 py-3 hover:bg-slate-800 active:scale-95 transition-all"
      >
        إعادة المحاولة
      </button>
    </div>
  );
}
