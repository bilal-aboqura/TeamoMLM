"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Check, Eye, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { LocalDate } from "@/components/ui/LocalDate";
import type { AdminProfitShareRequest } from "@/lib/db/admin-equity";
import { RequestStatusBadge } from "@/app/dashboard/profit-shares/_components/RequestStatusBadge";
import { processPurchaseRequest } from "../actions";

export function AdminRequestsTable({
  requests,
}: {
  requests: AdminProfitShareRequest[];
}) {
  const [selected, setSelected] = useState<AdminProfitShareRequest | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleProcess = (action: "accept" | "reject") => {
    if (!selected) return;
    setActionError(null);
    startTransition(async () => {
      const result = await processPurchaseRequest(selected.id, action);
      if ("error" in result) {
        setActionError(result.error);
        return;
      }
      setSelected(null);
      router.refresh();
    });
  };

  if (requests.length === 0) {
    return (
      <div className="rounded-2xl bg-white px-5 py-12 text-center shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <p className="font-bold text-slate-700">لا توجد طلبات</p>
        <p className="mt-1 text-sm text-slate-400">
          طلبات شراء الأسهم ستظهر هنا عند إرسالها.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl bg-white p-2 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        <div className="overflow-x-auto">
          <table className="w-full text-start">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-start text-xs font-bold text-slate-500">
                  المستخدم
                </th>
                <th className="px-4 py-3 text-start text-xs font-bold text-slate-500">
                  الحصة
                </th>
                <th className="px-4 py-3 text-start text-xs font-bold text-slate-500">
                  السعر
                </th>
                <th className="px-4 py-3 text-start text-xs font-bold text-slate-500">
                  الإحالة
                </th>
                <th className="px-4 py-3 text-start text-xs font-bold text-slate-500">
                  الحالة
                </th>
                <th className="px-4 py-3 text-start text-xs font-bold text-slate-500">
                  التاريخ
                </th>
                <th className="px-4 py-3 text-start text-xs font-bold text-slate-500">
                  الإجراء
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((request) => (
                <tr key={request.id} className="hover:bg-slate-50">
                  <td className="px-4 py-4">
                    <p className="text-sm font-bold text-slate-900">
                      {request.full_name}
                    </p>
                    <p className="mt-1 text-xs text-slate-400" dir="ltr">
                      {request.phone_number}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-slate-900" dir="ltr">
                    {request.percentage}%
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700" dir="ltr">
                    ${request.price_usd.toLocaleString("en-US")}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-500" dir="ltr">
                    {request.sponsor_referral_code}
                  </td>
                  <td className="px-4 py-4">
                    <RequestStatusBadge status={request.status} />
                  </td>
                  <td className="px-4 py-4">
                    <LocalDate
                      iso={request.created_at}
                      className="text-sm text-slate-500"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(request);
                        setActionError(null);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white transition-all hover:bg-slate-700 active:scale-95"
                    >
                      <Eye className="h-3.5 w-3.5" strokeWidth={2} />
                      مراجعة
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
        >
          <div className="w-full overflow-hidden rounded-t-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.2)] sm:max-w-xl sm:rounded-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  إيصال {selected.full_name}
                </h3>
                <p className="mt-1 text-xs text-slate-500" dir="ltr">
                  {selected.percentage}% / ${selected.price_usd.toLocaleString("en-US")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="إغلاق"
                className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="relative h-72 w-full overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                {selected.signed_url ? (
                  <Image
                    src={selected.signed_url}
                    alt={`Receipt for ${selected.full_name}`}
                    fill
                    className="object-contain"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">
                    الصورة غير متاحة
                  </div>
                )}
              </div>

              {actionError ? (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                  {actionError}
                </p>
              ) : null}
            </div>

            <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                disabled={isPending || selected.status !== "pending"}
                onClick={() => handleProcess("accept")}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check className="h-4 w-4" strokeWidth={2} />
                قبول
              </button>
              <button
                type="button"
                disabled={isPending || selected.status !== "pending"}
                onClick={() => handleProcess("reject")}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-bold text-red-700 transition-all hover:bg-red-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="h-4 w-4" strokeWidth={2} />
                رفض
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
