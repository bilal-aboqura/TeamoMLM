"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCompetition } from "@/app/admin/actions";

export function CompetitionForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await createCompetition(formData);

    setLoading(false);
    if ("error" in result) {
      setError(result.error);
    } else {
      setSuccess(true);
      (e.target as HTMLFormElement).reset();
      setTimeout(() => setSuccess(false), 3000);
      router.refresh();
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-6 relative overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-400 to-amber-600 opacity-20" />

      <div className="mb-6">
        <h2 className="text-lg font-bold text-slate-900">إضافة مسابقة جديدة</h2>
        <p className="text-sm text-slate-500 mt-1">
          أنشئ مسابقة يومية بجائزة محددة وشروط واضحة
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1.5">
            عنوان المسابقة
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="مثال: مسابقة اليوم — أكمل 5 مهام"
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="start_time" className="block text-sm font-medium text-slate-700 mb-1.5">
              وقت البداية
            </label>
            <input
              id="start_time"
              name="start_time"
              type="datetime-local"
              required
              dir="ltr"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm"
            />
          </div>
          <div>
            <label htmlFor="end_time" className="block text-sm font-medium text-slate-700 mb-1.5">
              وقت النهاية
            </label>
            <input
              id="end_time"
              name="end_time"
              type="datetime-local"
              required
              dir="ltr"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm"
            />
          </div>
        </div>

        <div>
          <label htmlFor="reward" className="block text-sm font-medium text-slate-700 mb-1.5">
            الجائزة
          </label>
          <input
            id="reward"
            name="reward"
            type="text"
            required
            placeholder="مثال: $50 أو باقة A3 مجانية"
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm"
          />
        </div>

        <div>
          <label htmlFor="terms" className="block text-sm font-medium text-slate-700 mb-1.5">
            الشروط والأحكام
          </label>
          <textarea
            id="terms"
            name="terms"
            rows={3}
            placeholder="مثال: أكمل 5 مهام يومية متتالية خلال فترة المسابقة"
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm resize-none"
          />
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3">
            <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-emerald-700 font-medium">تمت إضافة المسابقة بنجاح</p>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-slate-100 mt-6">
          <button
            type="submit"
            disabled={loading}
            className="bg-slate-900 text-white rounded-xl py-3 px-8 text-sm font-bold hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_4px_14px_0_rgba(15,23,42,0.15)] min-w-[140px]"
          >
            {loading ? (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : null}
            {loading ? "جارٍ الحفظ..." : "إضافة المسابقة"}
          </button>
        </div>
      </form>
    </div>
  );
}
