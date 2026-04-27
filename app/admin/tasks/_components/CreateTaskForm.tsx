"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTask } from "../actions";
import { VIP_LEVELS } from "@/lib/constants/packages";

export function CreateTaskForm() {
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
    const result = await createTask(formData);

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
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-6 mb-8 relative overflow-hidden">
      {/* Decorative top border line */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600 opacity-20"></div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">إضافة مهمة جديدة</h2>
          <p className="text-sm text-slate-500 mt-1">
            أضف مهمة يومية يقوم بها المستخدمون لكسب المكافآت
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Title */}
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            عنوان المهمة
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="مثال: أعجب بهذا الفيديو على يوتيوب"
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm"
          />
        </div>

        {/* Platform Label & Action URL */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="platform_label"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              المنصة
            </label>
            <input
              id="platform_label"
              name="platform_label"
              type="text"
              required
              placeholder="مثال: YouTube, TikTok, Instagram"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="action_url"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              رابط المهمة (URL)
            </label>
            <input
              id="action_url"
              name="action_url"
              type="url"
              required
              dir="ltr"
              placeholder="https://youtube.com/watch?v=..."
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm"
            />
          </div>
        </div>

        {/* Reward Amount, VIP Level & Display Order */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="reward_amount"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              المكافأة (USD){" "}
              <span className="text-slate-400 font-normal">(اختياري)</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 end-4 flex items-center text-slate-400 text-sm font-medium pointer-events-none">
                $
              </span>
              <input
                id="reward_amount"
                name="reward_amount"
                type="number"
                step="0.01"
                min="0"
                dir="ltr"
                placeholder="0.00"
                className="w-full px-4 pe-8 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm font-mono"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              فارغ = تُحسب من الباقة تلقائياً
            </p>
          </div>

          <div>
            <label
              htmlFor="required_vip_level"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              مستوى VIP المطلوب
            </label>
            <select
              id="required_vip_level"
              name="required_vip_level"
              defaultValue="0"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2394a3b8%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[position:left_0.75rem_center] bg-no-repeat"
            >
              {VIP_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="display_order"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              ترتيب العرض
            </label>
            <input
              id="display_order"
              name="display_order"
              type="number"
              min="0"
              defaultValue="0"
              dir="ltr"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm"
            />
          </div>
        </div>

        {/* Error / Success Feedback */}
        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mt-2">
            <svg
              className="w-4 h-4 text-red-500 mt-0.5 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 mt-2">
            <svg
              className="w-4 h-4 text-emerald-600 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-emerald-700 font-medium">
              تمت إضافة المهمة بنجاح وتحديث لوحة المهام اليومية
            </p>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-slate-100 mt-6">
          <button
            type="submit"
            disabled={loading}
            className="bg-slate-900 text-white rounded-xl py-3 px-8 text-sm font-bold hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_4px_14px_0_rgba(15,23,42,0.15)] min-w-[140px]"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                جارٍ الحفظ...
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                إضافة المهمة
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
