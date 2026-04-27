// use client - opens the proof upload modal for one selected app offer.
"use client";

import { ExternalLink } from "lucide-react";
import { useState } from "react";
import type { AppProfitOffer, AppProfitStatus } from "@/lib/app-profits/types";
import { ProofUploadModal } from "./ProofUploadModal";

const statusLabels: Record<AppProfitStatus, string> = {
  not_executed: "لم يتم التنفيذ",
  pending_review: "قيد المراجعة",
  approved: "تم القبول",
  rejected: "مرفوض",
};

const statusClasses: Record<AppProfitStatus, string> = {
  not_executed: "bg-slate-100 text-slate-600",
  pending_review: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
};

export function AppOfferCard({ offer }: { offer: AppProfitOffer }) {
  const [open, setOpen] = useState(false);
  const canSubmit = offer.user_status === "not_executed" || offer.user_status === "rejected";

  return (
    <>
      <article className="rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all duration-200 hover:-translate-y-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-400">{offer.provider}</p>
            <h2 className="mt-1 truncate text-base font-bold text-slate-900">{offer.title}</h2>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${statusClasses[offer.user_status]}`}>
            {statusLabels[offer.user_status]}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-sm font-bold text-emerald-600" dir="ltr">
            +{offer.reward_usd.toFixed(2)} USD
          </span>
          <span className="rounded-lg bg-slate-50 px-2 py-1 text-xs font-medium text-slate-500">
            {offer.required_tier}
          </span>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <a
            href={offer.download_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-95"
          >
            رابط التحميل
            <ExternalLink className="h-4 w-4" strokeWidth={2} />
          </a>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => setOpen(true)}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:bg-emerald-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            رفع إثبات
          </button>
        </div>
      </article>
      <ProofUploadModal offer={offer} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
