// use client - approve/reject actions use transitions and local row feedback.
"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import type { AppProfitSubmission } from "@/lib/app-profits/types";
import { approveAppProfitSubmission, rejectAppProfitSubmission } from "../actions";

export function ReviewsTable({ submissions }: { submissions: AppProfitSubmission[] }) {
  const router = useRouter();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = (id: string, action: () => Promise<{ success: true } | { error: string }>) => {
    setProcessingId(id);
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if ("error" in result) setMessage(result.error);
      else {
        setRejectingId(null);
        setReason("");
        router.refresh();
      }
      setProcessingId(null);
    });
  };

  if (submissions.length === 0) {
    return <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">لا توجد إثباتات تطبيقات للمراجعة</div>;
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
      {message && <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p>}
      <div className="space-y-3">
        {submissions.map((submission) => {
          const disabled = submission.status !== "pending_review" || processingId === submission.id || isPending;
          return (
            <article key={submission.id} className="rounded-xl bg-slate-50 p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <a href={submission.signed_screenshot_url} target="_blank" rel="noopener noreferrer" className="relative h-16 w-16 overflow-hidden rounded-xl bg-slate-100">
                    <Image src={submission.signed_screenshot_url} alt="إثبات التطبيق" fill className="object-cover" unoptimized />
                  </a>
                  <div>
                    <h3 className="font-bold text-slate-900">{submission.offer_title}</h3>
                    <p className="mt-1 text-xs text-slate-500">{submission.user_full_name} · {submission.provider}</p>
                    <p className="mt-1 text-xs font-bold text-emerald-600" dir="ltr">{submission.reward_usd.toFixed(2)} USD</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button disabled={disabled} onClick={() => run(submission.id, () => approveAppProfitSubmission(submission.id))} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white transition-all duration-200 hover:bg-emerald-700 disabled:opacity-50">
                    <CheckCircle className="h-4 w-4" strokeWidth={2} />
                    موافقة
                  </button>
                  <button disabled={disabled} onClick={() => setRejectingId(submission.id)} className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700 transition-all duration-200 hover:bg-red-100 disabled:opacity-50">
                    <XCircle className="h-4 w-4" strokeWidth={2} />
                    رفض
                  </button>
                </div>
              </div>
              {rejectingId === submission.id && (
                <div className="mt-3">
                  <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={2} placeholder="سبب الرفض اختياري" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500" />
                  <button onClick={() => run(submission.id, () => rejectAppProfitSubmission(submission.id, reason))} className="mt-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">تأكيد الرفض</button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
