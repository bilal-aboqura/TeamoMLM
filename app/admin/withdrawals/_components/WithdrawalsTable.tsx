"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveWithdrawal, rejectWithdrawal } from "@/app/admin/actions";

type WithdrawalRequest = {
  id: string;
  amount: number;
  payment_details: string;
  created_at: string;
  full_name: string;
  phone_number: string;
};

function RejectModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.12)] w-full max-w-sm p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-base font-bold text-slate-900 mb-1">
            رفض طلب السحب
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            أدخل سبب الرفض ليتم إعلام المستخدم
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="سبب الرفض..."
            rows={3}
            className="w-full border border-slate-200 rounded-xl bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 outline-none transition-all resize-none"
          />
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={onClose}
              className="flex-1 bg-slate-100 text-slate-700 rounded-xl py-2.5 text-sm font-medium hover:bg-slate-200 transition-all active:scale-95"
            >
              إلغاء
            </button>
            <button
              onClick={() => {
                if (reason.trim()) {
                  onConfirm(reason.trim());
                  setReason("");
                }
              }}
              disabled={!reason.trim()}
              className="flex-1 bg-rose-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-rose-500 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              تأكيد الرفض
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function WithdrawalsTable({
  requests,
}: {
  requests: WithdrawalRequest[];
}) {
  const router = useRouter();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleApprove = (requestId: string) => {
    setProcessingId(requestId);
    startTransition(async () => {
      const result = await approveWithdrawal(requestId);
      if ("success" in result) {
        showToast("تمت الموافقة على طلب السحب بنجاح", "success");
        router.refresh();
      } else {
        showToast(result.error, "error");
      }
      setProcessingId(null);
    });
  };

  const handleReject = (reason: string) => {
    if (!rejectingId) return;
    const requestId = rejectingId;
    setRejectingId(null);
    setProcessingId(requestId);
    startTransition(async () => {
      const result = await rejectWithdrawal(requestId, reason);
      if ("success" in result) {
        showToast("تم رفض طلب السحب وإرجاع الرصيد", "success");
        router.refresh();
      } else {
        showToast(result.error, "error");
      }
      setProcessingId(null);
    });
  };

  if (requests.length === 0) {
    return (
      <div className="bg-slate-50 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-14 text-center">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
          <svg
            className="w-6 h-6 text-emerald-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <p className="text-slate-600 font-medium">كل شيء على ما يرام</p>
        <p className="text-slate-400 text-sm mt-1">
          لا توجد طلبات سحب معلقة حالياً
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-slate-50 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden p-2 sm:p-4">
        <div className="overflow-x-auto pb-4">
          <table className="w-full text-start">
            <thead>
              <tr className="bg-slate-100/50">
                <th className="text-start ps-5 pe-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  المستخدم
                </th>
                <th className="text-start px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">
                  الهاتف
                </th>
                <th className="text-start px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  المبلغ
                </th>
                <th className="text-start px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">
                  تفاصيل الدفع
                </th>
                <th className="text-start px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">
                  التاريخ
                </th>
                <th className="text-start px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  الإجراء
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/50">
              {requests.map((req) => {
                const isProcessing = processingId === req.id;
                return (
                  <tr
                    key={req.id}
                    className="hover:bg-slate-100/50 transition-colors duration-200"
                  >
                    {/* User */}
                    <td className="ps-5 pe-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-slate-600">
                            {req.full_name.charAt(0)}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-slate-900">
                          {req.full_name}
                        </span>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-4 hidden sm:table-cell">
                      <span
                        className="text-sm text-slate-500 font-mono"
                        dir="ltr"
                      >
                        {req.phone_number}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-4">
                      <span
                        className="text-sm font-bold text-slate-900"
                        dir="ltr"
                      >
                        ${Number(req.amount).toFixed(2)}
                      </span>
                    </td>

                    {/* Payment Details */}
                    <td className="px-4 py-4 hidden md:table-cell">
                      <span
                        className="text-sm text-slate-500 font-mono max-w-[180px] truncate block"
                        dir="ltr"
                      >
                        {req.payment_details}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <span className="text-sm text-slate-400">
                        {new Date(req.created_at).toLocaleDateString("ar")}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApprove(req.id)}
                          disabled={isProcessing || isPending}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-500 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_2px_8px_rgba(5,150,105,0.25)]"
                        >
                          {isProcessing && !rejectingId ? (
                            <svg
                              className="animate-spin w-3 h-3"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                          موافقة
                        </button>
                        <button
                          onClick={() => setRejectingId(req.id)}
                          disabled={isProcessing || isPending}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-medium hover:bg-rose-50 hover:text-rose-600 active:scale-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                          رفض
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div className="px-5 py-4 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            {requests.length} طلب معلق
          </p>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 text-[10px] font-semibold">
            قيد المراجعة
          </span>
        </div>
      </div>

      {/* Reject modal */}
      <RejectModal
        open={!!rejectingId}
        onClose={() => setRejectingId(null)}
        onConfirm={handleReject}
      />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 start-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-5 py-3 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.15)] text-sm font-medium animate-in fade-in slide-in-from-bottom-2 duration-300 ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-rose-600 text-white"
          }`}
        >
          {toast.type === "success" ? (
            <svg
              className="w-4 h-4 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg
              className="w-4 h-4 shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {toast.message}
        </div>
      )}
    </>
  );
}
