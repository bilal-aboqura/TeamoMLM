// use client - manages file input, modal visibility, and useActionState.
"use client";

import { ImageUp, X } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import type { AppProfitOffer, SubmitProofResult } from "@/lib/app-profits/types";
import { submitAppProfitProof } from "../actions";

const initialState: SubmitProofResult = { success: false, idle: true };

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-emerald-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "جاري الإرسال..." : "إرسال الإثبات"}
    </button>
  );
}

export function ProofUploadModal({
  offer,
  open,
  onClose,
}: {
  offer: AppProfitOffer;
  open: boolean;
  onClose: () => void;
}) {
  const [state, formAction] = useActionState(submitAppProfitProof, initialState);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const error = "error" in state ? state.error : null;

  useEffect(() => {
    if ("success" in state && state.success) {
      setSelectedFile(null);
      onClose();
      router.refresh();
    }
  }, [state, onClose, router]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full rounded-t-2xl bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.12)] sm:max-w-md sm:rounded-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{offer.title}</h2>
            <p className="mt-1 text-sm font-bold text-emerald-600" dir="ltr">
              +{offer.reward_usd.toFixed(2)} USD
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <form action={formAction}>
          <input type="hidden" name="offer_id" value={offer.id} />
          <label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-6 text-center transition-all duration-200 hover:border-emerald-500 hover:bg-emerald-50/50">
            <input
              ref={inputRef}
              type="file"
              name="proof"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            />
            <ImageUp className="mx-auto h-8 w-8 text-slate-300" strokeWidth={1.8} />
            <p className="mt-3 text-sm font-medium text-slate-700">
              {selectedFile ? selectedFile.name : "اضغط لاختيار صورة الإثبات"}
            </p>
            <p className="mt-1 text-xs text-slate-400">JPEG أو PNG أو WebP، حتى 10 ميجابايت</p>
          </label>

          {error && (
            <p className="mt-3 text-center text-sm font-medium text-red-600" role="alert">
              {error.message}
            </p>
          )}

          <div className="mt-4">
            <SubmitButton disabled={!selectedFile} />
          </div>
        </form>
      </div>
    </div>
  );
}
