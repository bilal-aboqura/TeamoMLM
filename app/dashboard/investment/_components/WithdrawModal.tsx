"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { submitInvestmentWithdrawal } from "../actions";
import type { InvestmentActionResult } from "@/lib/validations/investment-schemas";

const initialState: InvestmentActionResult<{ withdrawalId: string }> = {
  success: false,
  idle: true,
};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white transition-all hover:bg-slate-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "جارٍ الإرسال..." : "إرسال طلب السحب"}
    </button>
  );
}

export function WithdrawModal({
  open,
  onClose,
  availableProfit,
}: {
  open: boolean;
  onClose: () => void;
  availableProfit: number;
}) {
  const [state, formAction] = useActionState(submitInvestmentWithdrawal, initialState);
  const [amount, setAmount] = useState("");
  const router = useRouter();
  const numericAmount = Number(amount);
  const clientError =
    amount && numericAmount < 10
      ? "الحد الأدنى للسحب هو 10 USDT"
      : amount && numericAmount > availableProfit
        ? "المبلغ يتجاوز رصيدك المتاح"
        : null;

  useEffect(() => {
    if ("success" in state && state.success) {
      setAmount("");
      onClose();
      router.refresh();
    }
  }, [state, onClose, router]);

  if (!open) return null;

  const actionError = "error" in state ? state.error.message : null;
  const disabled = availableProfit <= 0 || !!clientError || !amount;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full rounded-t-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.2)] sm:max-w-md sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h3 className="text-lg font-black text-slate-900">سحب الأرباح</h3>
            <p className="mt-1 text-sm text-slate-500" dir="ltr">
              Available: {availableProfit.toFixed(2)} USDT
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="إغلاق" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <form action={formAction} className="space-y-4 px-6 py-5">
          {availableProfit <= 0 ? (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              الأرباح تُحتسب كل 7 أيام
            </p>
          ) : null}
          <input name="amount" value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="10" step="0.01" placeholder="40.00" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" dir="ltr" />
          {(clientError || actionError) ? (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {clientError ?? actionError}
            </p>
          ) : null}
          <SubmitButton disabled={disabled} />
        </form>
      </div>
    </div>
  );
}
