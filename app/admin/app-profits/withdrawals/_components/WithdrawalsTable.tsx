// use client - payout actions use transitions and local rejection input.
"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AppProfitWithdrawal } from "@/lib/app-profits/types";
import { markAppProfitWithdrawalPaid, rejectAppProfitWithdrawal } from "../actions";

export function WithdrawalsTable({ withdrawals }: { withdrawals: AppProfitWithdrawal[] }) {
  const router = useRouter();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = (action: () => Promise<{ success: true } | { error: string }>) => {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if ("error" in result) setMessage(result.error);
      else {
        setRejectingId(null);
        setReason("");
        router.refresh();
      }
    });
  };

  if (withdrawals.length === 0) {
    return <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">لا توجد طلبات سحب تطبيقات</div>;
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
      {message && <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p>}
      <div className="space-y-3">
        {withdrawals.map((withdrawal) => (
          <article key={withdrawal.id} className="rounded-xl bg-slate-50 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="font-bold text-slate-900">{withdrawal.user_full_name ?? "غير متوفر"}</h3>
                <p className="mt-1 text-xs text-slate-400">{new Date(withdrawal.created_at).toLocaleDateString("ar-EG")}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-emerald-600" dir="ltr">{withdrawal.amount.toFixed(2)} USD</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{withdrawal.status}</span>
                {withdrawal.status === "pending" && (
                  <>
                    <button disabled={isPending} onClick={() => run(() => markAppProfitWithdrawalPaid(withdrawal.id))} className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">تم الدفع</button>
                    <button disabled={isPending} onClick={() => setRejectingId(withdrawal.id)} className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700 disabled:opacity-50">رفض</button>
                  </>
                )}
              </div>
            </div>
            {rejectingId === withdrawal.id && (
              <div className="mt-3">
                <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={2} placeholder="سبب الرفض اختياري" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <button onClick={() => run(() => rejectAppProfitWithdrawal(withdrawal.id, reason))} className="mt-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">تأكيد الرفض</button>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
