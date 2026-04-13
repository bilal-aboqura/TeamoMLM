"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { submitWithdrawal } from "../actions";
import { type WithdrawalActionResult } from "@/lib/validations/wallet-schemas";

const initialState: WithdrawalActionResult = { success: false, idle: true };

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-label="إرسال طلب السحب"
      className="w-full bg-slate-900 text-white rounded-xl py-3 font-bold hover:bg-slate-800 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? "جارٍ الإرسال..." : "إرسال طلب السحب"}
    </button>
  );
}

export function WithdrawalForm({
  isSuspended,
  availableBalance,
}: {
  isSuspended: boolean;
  availableBalance: number;
}) {
  const [state, formAction] = useActionState(submitWithdrawal, initialState);
  const [toast, setToast] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const error = "error" in state ? state.error : null;
  const isZeroBalance = availableBalance === 0;
  const isBelowMinimum = availableBalance < 10;

  useEffect(() => {
    if ("success" in state && state.success === true) {
      formRef.current?.reset();
      setToast("تم إرسال طلب السحب بنجاح");
      setTimeout(() => setToast(null), 5000);
      router.refresh();
    }
    // Clear stale client-side blur errors whenever the server returns any new response
    if ("error" in state || ("success" in state && state.success === true)) {
      setClientError(null);
    }
  }, [state, router]);

  if (isSuspended) {
    return (
      <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200">
        <p className="text-amber-800 text-sm font-medium">
          حسابك موقوف. لا يمكنك تقديم طلبات سحب.
        </p>
      </div>
    );
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (isNaN(val) || val <= 0) {
      setClientError("الحد الأدنى للسحب هو 10 دولار");
      return;
    }
    if (val < 10) {
      setClientError("الحد الأدنى للسحب هو 10 دولار");
      return;
    }
    if (val > availableBalance) {
      setClientError("المبلغ يتجاوز رصيدك المتاح");
      return;
    }
    const decimals = e.target.value.includes(".")
      ? e.target.value.split(".")[1]
      : "";
    if (decimals.length > 2) {
      setClientError("المبلغ يجب أن يحتوي على خانتين عشريتين كحد أقصى");
      return;
    }
    setClientError(null);
  };

  return (
    <>
      <form ref={formRef} action={formAction} className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">
        <h2 className="text-lg font-bold text-slate-900">طلب سحب جديد</h2>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="amount" className="block text-sm text-slate-500">
              المبلغ (دولار) — الحد الأدنى $10
            </label>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full shadow-sm">
              عمولة السحب صفر
            </span>
          </div>
          <input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="10"
            inputMode="decimal"
            placeholder="0.00"
            onBlur={handleBlur}
            aria-label="مبلغ السحب"
            className="w-full border-0 bg-slate-50 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white outline-none transition-all"
          />
        </div>

        <div>
          <label htmlFor="payment_details" className="block text-sm text-slate-500 mb-1">
            تفاصيل الدفع
          </label>
          <textarea
            id="payment_details"
            name="payment_details"
            rows={3}
            maxLength={200}
            placeholder="أدخل تفاصيل وسيلة الدفع الخاصة بك"
            aria-label="تفاصيل الدفع"
            className="w-full border-0 bg-slate-50 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white outline-none transition-all resize-none"
          />
        </div>

        {(clientError || error) && (
          <p
            className="text-sm text-red-600 text-center"
            aria-live="polite"
            role="alert"
          >
            {clientError ?? error?.message}
          </p>
        )}

        {isZeroBalance && (
          <p className="text-sm text-slate-500 text-center">
            لا يوجد رصيد متاح للسحب
          </p>
        )}

        <SubmitButton disabled={isZeroBalance || isBelowMinimum} />

        {isBelowMinimum && !isZeroBalance && (
          <p className="text-xs text-amber-600 text-center">
            رصيدك أقل من الحد الأدنى للسحب ($10)
          </p>
        )}
      </form>

      {toast && (
        <div className="fixed bottom-6 inset-x-0 mx-auto w-fit bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-sm z-50">
          {toast}
        </div>
      )}
    </>
  );
}
