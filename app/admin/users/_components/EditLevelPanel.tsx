"use client";

import { useState, useTransition } from "react";
import { updateUserLevel } from "@/app/admin/actions";

type UserRow = {
  id: string;
  full_name: string;
  phone_number: string;
  wallet_balance: number;
  leadership_level: number | null;
};

const LEVELS = [1, 2, 3, 4, 5, 6];

export function EditLevelPanel({
  user,
  onClose,
}: {
  user: UserRow;
  onClose: () => void;
}) {
  const [level, setLevel] = useState<string>(
    user.leadership_level ? String(user.leadership_level) : ""
  );
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    const levelNum = Number(level);
    if (!level || levelNum < 1 || levelNum > 6) return;

    startTransition(async () => {
      const result = await updateUserLevel(user.id, levelNum);
      if ("success" in result) {
        setToast("تم تحديث مستوى القيادة بنجاح");
        setTimeout(() => {
          setToast(null);
          onClose();
        }, 2000);
      }
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 end-0 w-full max-w-sm bg-slate-50 shadow-[0_0_40px_rgba(0,0,0,0.12)] z-50 flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">تعديل مستوى القيادة</h3>
            <p className="text-xs text-slate-400 mt-0.5">تحديث المستوى التحويلي للمستخدم</p>
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* User Info */}
        <div className="flex-1 px-6 py-6 space-y-6 overflow-y-auto">
          {/* Avatar + basic info */}
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-slate-600">
                {user.full_name.charAt(0)}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{user.full_name}</p>
              <p className="text-xs text-slate-400 mt-0.5" dir="ltr">{user.phone_number}</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-slate-100 border border-slate-100/50 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <p className="text-xs text-slate-400 mb-1">الرصيد الحالي</p>
              <p className="text-lg font-black text-emerald-600" dir="ltr">
                ${Number(user.wallet_balance).toFixed(2)}
              </p>
            </div>
            <div className="p-4 bg-slate-100 border border-slate-100/50 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <p className="text-xs text-slate-400 mb-1">المستوى الحالي</p>
              {user.leadership_level ? (
                <p className="text-lg font-black text-slate-900">
                  قائد {user.leadership_level}
                </p>
              ) : (
                <p className="text-lg font-black text-slate-400">عضو</p>
              )}
            </div>
          </div>

          {/* Level selector */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              اختر مستوى القيادة الجديد
            </label>
            <div className="grid grid-cols-3 gap-2">
              {LEVELS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setLevel(String(n))}
                  className={`py-3 rounded-xl text-sm font-bold transition-all duration-150 active:scale-95 ${
                    level === String(n)
                      ? "bg-slate-900 text-white shadow-[0_4px_12px_rgba(15,23,42,0.2)]"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  قائد {n}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              اختر رتبة القيادة للمستخدم (قائد 1–6)
            </p>
          </div>

          {/* Clear option */}
          {level && (
            <button
              type="button"
              onClick={() => setLevel("")}
              className="w-full py-2.5 rounded-xl text-sm text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors border border-dashed border-slate-200"
            >
              إلغاء التحديد
            </button>
          )}
        </div>

        {/* Footer action */}
        <div className="px-6 py-5 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={handleSave}
            disabled={isPending || !level}
            className="w-full bg-slate-900 text-white rounded-xl py-3 text-sm font-semibold hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                جاري الحفظ...
              </>
            ) : (
              "حفظ التعديلات"
            )}
          </button>
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 start-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-[0_4px_20px_rgba(5,150,105,0.4)] text-sm font-medium animate-in fade-in slide-in-from-bottom-2 duration-300">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {toast}
        </div>
      )}
    </>
  );
}
