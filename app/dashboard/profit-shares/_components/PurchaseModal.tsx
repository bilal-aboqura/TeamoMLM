"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Copy, ReceiptText, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  submitPurchaseRequest,
  type PurchaseRequestActionResult,
} from "../actions";
import type { EquityPackage } from "@/lib/validations/equity-schemas";

const initialState: PurchaseRequestActionResult = {
  success: false,
  idle: true,
};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "جارٍ الإرسال..." : "إرسال الطلب"}
    </button>
  );
}

export function PurchaseModal({
  selectedPackage,
  walletAddress,
  onClose,
}: {
  selectedPackage: EquityPackage | null;
  walletAddress: string | null;
  onClose: () => void;
}) {
  const [state, formAction] = useActionState(
    submitPurchaseRequest,
    initialState
  );
  const [receiptName, setReceiptName] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previousSuccess = useRef(false);

  useEffect(() => {
    if ("success" in state && state.success && !previousSuccess.current) {
      previousSuccess.current = true;
      onClose();
      setReceiptName("");
      router.refresh();
    }

    if (!("success" in state && state.success)) {
      previousSuccess.current = false;
    }
  }, [state, onClose, router]);

  if (!selectedPackage) return null;

  const actionError = "error" in state ? state.error.message : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.2)] sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h3 className="text-lg font-black text-slate-900">
              تأكيد شراء حصة
            </h3>
            <p className="mt-1 text-sm text-slate-500" dir="ltr">
              {selectedPackage.label}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="rounded-2xl bg-slate-950 p-4 text-white">
            <p className="text-xs font-medium text-slate-300">
              عنوان الدفع USDT
            </p>
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
                  setTimeout(() => setCopied(false), 1600);
                }}
                aria-label="نسخ عنوان الدفع"
                className="rounded-lg bg-white/10 p-2 text-white transition-colors hover:bg-white/20 disabled:opacity-40"
              >
                <Copy className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
            {copied ? (
              <p className="mt-2 text-xs font-medium text-emerald-300">
                تم النسخ
              </p>
            ) : null}
          </div>

          <form action={formAction} className="space-y-4">
            <input
              type="hidden"
              name="percentage"
              value={selectedPackage.percentage}
            />
            <input
              type="hidden"
              name="priceUsd"
              value={selectedPackage.priceUsd}
            />

            <div>
              <label
                htmlFor="sponsorReferralCode"
                className="block text-sm font-bold text-slate-700"
              >
                كود الإحالة
              </label>
              <input
                id="sponsorReferralCode"
                name="sponsorReferralCode"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                placeholder="مثال: ADM1N000"
                dir="ltr"
              />
            </div>

            <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center transition-colors hover:border-emerald-300 hover:bg-emerald-50/40">
              <input
                ref={fileInputRef}
                type="file"
                name="receipt"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  setFileError(null);
                  if (!file) {
                    setReceiptName("");
                    return;
                  }
                  if (!file.type.startsWith("image/")) {
                    setFileError("يرجى رفع صورة فقط");
                    event.target.value = "";
                    setReceiptName("");
                    return;
                  }
                  setReceiptName(file.name);
                }}
              />
              <ReceiptText
                className="mx-auto h-8 w-8 text-slate-400"
                strokeWidth={2}
              />
              <p className="mt-3 text-sm font-semibold text-slate-700">
                {receiptName || "ارفع صورة إيصال الدفع"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                JPEG أو PNG أو WebP
              </p>
            </label>

            {(fileError || actionError) ? (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                {fileError ?? actionError}
              </p>
            ) : null}

            <SubmitButton disabled={!walletAddress || !receiptName} />
          </form>
        </div>
      </div>
    </div>
  );
}
