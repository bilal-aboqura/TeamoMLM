"use client";

import { useState, useTransition } from "react";
import { adjustUserBalance } from "@/app/admin/actions";

type UserRow = {
  id: string;
  full_name: string;
  phone_number: string;
  wallet_balance: number;
};

export function AdjustBalancePanel({
  user,
  onClose,
}: {
  user: UserRow;
  onClose: () => void;
}) {
  const [newBalance, setNewBalance] = useState<string>(String(user.wallet_balance));
  const [reason, setReason] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    const numBalance = parseFloat(newBalance);
    if (isNaN(numBalance) || numBalance < 0 || reason.trim().length < 3) return;

    startTransition(async () => {
      const result = await adjustUserBalance(user.id, numBalance, reason.trim());
      if ("success" in result) {
        setToast({ message: "تم تعديل الرصيد بنجاح", type: "success" });
        setTimeout(() => {
          setToast(null);
          onClose();
        }, 2000);
      } else {
        setToast({ message: result.error, type: "error" });
        setTimeout(() => setToast(null), 3000);
      }
    });
  };

  const isFormValid =
    newBalance !== "" &&
    !isNaN(parseFloat(newBalance)) &&
    parseFloat(newBalance) >= 0 &&
    reason.trim().length >= 3;

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 end-0 w-full max-w-sm bg-slate-50 shadow-[0_0_40px_rgba(0,0,0,0.12)] z-50 flex flex-col">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">تعديل الرصيد يدوياً</h3>
            <p className="text-xs text-slate-400 mt-0.5">تحديث رصيد المحفظة مع سجل تدقيق</p>
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

        <div className="flex-1 px-6 py-6 space-y-6 overflow-y-auto">
          <div className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
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

          <div className="p-4 bg-slate-100 border border-slate-100/50 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
             <p className="text-xs text-slate-400 mb-1">الرصيد الحالي (قبل التعديل)</p>
             <p className="text-lg font-black text-slate-900" dir="ltr">
               ${Number(user.wallet_balance).toFixed(2)}
             </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                الرصيد الجديد
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                  dir="ltr"
                  className="w-full border border-slate-200 rounded-xl bg-white px-4 py-3 ps-8 text-sm text-slate-900 font-mono focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-start"
                  placeholder="0.00"
                />
                <span className="absolute start-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium pointer-events-none">
                  $
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                سبب التعديل يدوياً (مطلوب للسجل المالي)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="مثال: تعويض رصيد مفقود بسبب خطأ في الإيداع، أو خصم لعملية مشبوهة..."
                className="w-full border border-slate-200 rounded-xl bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all resize-none"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-5 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={handleSave}
            disabled={isPending || !isFormValid}
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
              "تأكيد وحفظ الرصيد"
            )}
          </button>
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-6 start-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 text-white px-5 py-3 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.15)] text-sm font-medium animate-in fade-in slide-in-from-bottom-2 duration-300 ${toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"}`}>
          {toast.type === "success" ? (
             <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
               <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
             </svg>
          ) : (
             <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
               <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
             </svg>
          )}
          {toast.message}
        </div>
      )}
    </>
  );
}
