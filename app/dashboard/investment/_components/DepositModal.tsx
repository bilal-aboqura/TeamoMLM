"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Copy, ReceiptText, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { INVESTMENT_TIERS, resolveTier } from "@/lib/investment/tiers";
import { submitInvestmentDeposit } from "../actions";
import type { InvestmentActionResult } from "@/lib/validations/investment-schemas";

const initialState: InvestmentActionResult<{ depositId: string }> = {
  success: false,
  idle: true,
};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "جارٍ الإرسال..." : "إرسال طلب الإيداع"}
    </button>
  );
}

export function DepositModal({
  open,
  onClose,
  walletAddress,
}: {
  open: boolean;
  onClose: () => void;
  walletAddress: string | null;
}) {
  const [state, formAction] = useActionState(submitInvestmentDeposit, initialState);
  const [amount, setAmount] = useState("");
  const [receiptName, setReceiptName] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const tier = resolveTier(Number(amount));

  useEffect(() => {
    if ("success" in state && state.success) {
      setAmount("");
      setReceiptName("");
      setClientError(null);
      onClose();
      router.refresh();
    }
  }, [state, onClose, router]);

  if (!open) return null;

  const actionError = "error" in state ? state.error.message : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.2)] sm:max-w-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h3 className="text-lg font-black text-slate-900">إيداع رأس المال</h3>
            <p className="mt-1 text-sm text-slate-500">اختر المبلغ وارفع إيصال التحويل</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <form action={formAction} className="space-y-5 px-6 py-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
            {INVESTMENT_TIERS.map((item) => (
              <div key={item.percentage} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-lg font-black text-emerald-600" dir="ltr">
                  {item.percentage}%
                </p>
                <p className="mt-1 text-xs text-slate-500" dir="ltr">
                  ${item.minAmount}{item.maxAmount ? ` - $${item.maxAmount}` : "+"}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl bg-slate-950 p-4 text-white">
            <p className="text-xs text-slate-300">عنوان الدفع USDT</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 break-all text-sm" dir="ltr">
                {walletAddress ?? "Payment address is not configured"}
              </code>
              <button
                type="button"
                disabled={!walletAddress}
                onClick={async () => {
                  if (!walletAddress) return;
                  await navigator.clipboard.writeText(walletAddress);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="rounded-lg bg-white/10 p-2 hover:bg-white/20 disabled:opacity-40"
                aria-label="نسخ عنوان الدفع"
              >
                <Copy className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
            {copied ? <p className="mt-2 text-xs text-emerald-300">تم النسخ</p> : null}
          </div>

          <label className="block text-sm font-bold text-slate-700" htmlFor="amount">
            المبلغ
          </label>
          <input
            id="amount"
            name="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            min="100"
            step="0.01"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            placeholder="500"
            dir="ltr"
          />
          {tier ? <p className="text-sm font-semibold text-emerald-600">النسبة المختارة: {tier}%</p> : null}

          <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center hover:border-emerald-300 hover:bg-emerald-50/40">
            <input
              type="file"
              name="receipt"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                setClientError(null);

                if (!file) {
                  setReceiptName("");
                  return;
                }

                if (!file.type.startsWith("image/")) {
                  setReceiptName("");
                  setClientError("يرجى رفع صورة فقط");
                  return;
                }

                setReceiptName(file.name);
              }}
            />
            <ReceiptText className="mx-auto h-8 w-8 text-slate-400" strokeWidth={2} />
            <p className="mt-3 break-words text-sm font-semibold text-slate-700">
              {receiptName || "ارفع صورة إيصال الدفع"}
            </p>
          </label>

          {clientError || actionError ? (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {clientError ?? actionError}
            </p>
          ) : null}
          <SubmitButton disabled={!walletAddress || !receiptName} />
        </form>
      </div>
    </div>
  );
}
