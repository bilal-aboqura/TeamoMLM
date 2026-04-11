"use client";

export default function SettingsError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="text-center py-16">
      <h2 className="text-lg font-bold text-slate-900 mb-2">حدث خطأ</h2>
      <p className="text-sm text-slate-500 mb-4">
        {error.message || "تعذّر تحميل الإعدادات"}
      </p>
      <button
        onClick={reset}
        className="bg-slate-900 text-white rounded-xl py-2 px-6 text-sm font-medium hover:bg-slate-800 active:scale-95 transition-all"
      >
        إعادة المحاولة
      </button>
    </div>
  );
}
