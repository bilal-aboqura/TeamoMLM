"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { LocalDate } from "@/components/ui/LocalDate";
import {
  approveInvestmentWithdrawal,
  rejectInvestmentWithdrawal,
} from "../actions";

export type AdminWithdrawalRow = {
  id: string;
  amount: number;
  status: "pending" | "accepted" | "rejected";
  requestedAt: string;
  rejectionReason: string | null;
  user: { fullName: string; phoneNumber: string };
};

const statusText = {
  pending: "معلق",
  accepted: "مقبول",
  rejected: "مرفوض",
};

export function WithdrawalRequestsTable({
  rows,
}: {
  rows: AdminWithdrawalRow[];
}) {
  const [reasonById, setReasonById] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const run = (row: AdminWithdrawalRow, action: "approve" | "reject") => {
    setError(null);
    setPendingId(row.id);
    startTransition(async () => {
      const result =
        action === "approve"
          ? await approveInvestmentWithdrawal(row.id)
          : await rejectInvestmentWithdrawal(row.id, reasonById[row.id]);
      setPendingId(null);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  if (rows.length === 0) {
    return <p className="rounded-2xl bg-white p-8 text-center text-slate-500">لا توجد طلبات سحب</p>;
  }

  return (
    <>
      {error ? <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      <div className="overflow-x-auto rounded-2xl bg-white p-2 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <table className="w-full text-start">
          <thead className="bg-slate-50">
            <tr>
              {["المستخدم", "المبلغ", "الحالة", "التاريخ", "الإجراء"].map((head) => (
                <th key={head} className="px-4 py-3 text-start text-xs font-bold text-slate-500">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                <td className="px-4 py-4">
                  <p className="text-sm font-bold text-slate-900">{row.user.fullName}</p>
                  <p className="text-xs text-slate-400" dir="ltr">{row.user.phoneNumber}</p>
                </td>
                <td className="px-4 py-4 text-sm font-bold" dir="ltr">${row.amount.toFixed(2)}</td>
                <td className="px-4 py-4 text-sm">{statusText[row.status]}</td>
                <td className="px-4 py-4"><LocalDate iso={row.requestedAt} className="text-sm text-slate-500" /></td>
                <td className="px-4 py-4">
                  {row.status === "pending" ? (
                    <div className="flex min-w-56 items-center gap-2">
                      <input value={reasonById[row.id] ?? ""} onChange={(e) => setReasonById((next) => ({ ...next, [row.id]: e.target.value }))} placeholder="سبب الرفض" className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-xs" />
                      <button disabled={isPending && pendingId === row.id} onClick={() => run(row, "approve")} className="rounded-lg bg-emerald-600 p-2 text-white disabled:opacity-50" aria-label="قبول">
                        <Check className="h-4 w-4" />
                      </button>
                      <button disabled={isPending && pendingId === row.id} onClick={() => run(row, "reject")} className="rounded-lg bg-red-50 p-2 text-red-700 disabled:opacity-50" aria-label="رفض">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : row.rejectionReason ? <span className="text-xs text-slate-500">{row.rejectionReason}</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
