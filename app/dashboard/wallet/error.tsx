"use client";

export default function WalletError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <p className="text-slate-900 font-bold text-lg mb-2">
          حدث خطأ في تحميل المحفظة
        </p>
        <button
          onClick={reset}
          aria-label="إعادة المحاولة"
          className="bg-slate-900 text-white rounded-xl px-6 py-2 text-sm font-bold hover:bg-slate-800 active:scale-95 transition-all duration-200"
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}
