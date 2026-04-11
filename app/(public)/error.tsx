"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Public area error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">عذراً، حدث خطأ ما</h2>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
          نعتذر عن هذا الخلل. يرجى المحاولة مرة أخرى أو العودة للصفحة الرئيسية.
        </p>
        <button
          onClick={reset}
          className="w-full bg-slate-900 text-white rounded-xl py-3 px-6 hover:bg-slate-800 transition-all active:scale-95"
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}
