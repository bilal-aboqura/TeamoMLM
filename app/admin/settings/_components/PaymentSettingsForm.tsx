"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePaymentSettings } from "@/app/admin/actions";

export function PaymentSettingsForm({
  initialLabel,
  initialAddress,
}: {
  initialLabel: string;
  initialAddress: string;
}) {
  const router = useRouter();
  const [label, setLabel] = useState(initialLabel);
  const [address, setAddress] = useState(initialAddress);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasChanges = label !== initialLabel || address !== initialAddress;

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await updatePaymentSettings({
        payment_method_label: label,
        payment_address: address,
      });
      if ("success" in result) {
        showToast("تم تحديث معلومات الدفع بنجاح", "success");
        router.refresh();
      } else {
        showToast(result.error, "error");
      }
    });
  };

  const handleReset = () => {
    setLabel(initialLabel);
    setAddress(initialAddress);
  };

  return (
    <>
      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div>
            <label
              htmlFor="payment-label"
              className="text-xs font-medium text-slate-500 mb-1.5 block"
            >
              طريقة الدفع
            </label>
            <input
              id="payment-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="مثال: USDT, Vodafone Cash..."
              className="w-full border border-slate-200 rounded-xl bg-white px-4 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
            />
          </div>
          <div>
            <label
              htmlFor="payment-address"
              className="text-xs font-medium text-slate-500 mb-1.5 block"
            >
              رقم المحفظة / الحساب
            </label>
            <input
              id="payment-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="عنوان المحفظة أو رقم الحساب"
              dir="ltr"
              className="w-full border border-slate-200 rounded-xl bg-white px-4 py-3 text-sm text-slate-900 font-mono focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={isPending || !hasChanges}
            className="flex-1 bg-slate-900 text-white rounded-xl py-3 text-sm font-semibold hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
              "حفظ معلومات الدفع"
            )}
          </button>
          {hasChanges && (
            <button
              onClick={handleReset}
              disabled={isPending}
              className="bg-slate-100 text-slate-700 rounded-xl py-3 px-6 text-sm font-medium hover:bg-slate-200 active:scale-95 transition-all disabled:opacity-50"
            >
              تراجع
            </button>
          )}
        </div>
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 start-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-5 py-3 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.15)] text-sm font-medium animate-in fade-in slide-in-from-bottom-2 duration-300 ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-rose-600 text-white"
          }`}
        >
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
