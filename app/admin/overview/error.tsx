"use client";

export default function OverviewError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          تعذر تحميل إحصائيات النظرة العامة
        </h2>
        <button
          onClick={reset}
          aria-label="إعادة المحاولة"
          className="bg-slate-900 text-white rounded-xl px-6 py-3 hover:bg-slate-800 active:scale-95 transition-all"
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}
