// use client — modal state, image error, useTransition for approve/reject
"use client";

import { useState, useTransition } from "react";
import Image from "next/image";

export function ProofViewerModal({
  open,
  imageUrl,
  title,
  onClose,
  onApprove,
  onReject,
}: {
  open: boolean;
  imageUrl: string;
  title: string;
  onClose: () => void;
  onApprove: () => Promise<{ success: true } | { error: string }>;
  onReject: (reason: string) => Promise<{ success: true } | { error: string }>;
}) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [reason, setReason] = useState("");
  const [imageError, setImageError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  const handleApprove = () => {
    setActionError(null);
    startTransition(async () => {
      const result = await onApprove();
      if ("error" in result) {
        setActionError(result.error);
      } else {
        onClose();
      }
    });
  };

  const handleReject = () => {
    if (!reason.trim()) return;
    setActionError(null);
    startTransition(async () => {
      const result = await onReject(reason.trim());
      if ("error" in result) {
        setActionError(result.error);
      } else {
        onClose();
      }
    });
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-50 w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.2)] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">مراجعة الإثبات المرفوع</p>
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Image */}
        <div className="flex-1 overflow-y-auto px-6 pt-5 pb-3 space-y-4">
          {imageError ? (
            <div className="bg-slate-50 rounded-xl p-10 text-center border border-slate-100">
              <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-slate-500 text-sm font-medium">الصورة غير متاحة</p>
              <p className="text-slate-400 text-xs mt-1">قد يكون الرابط منتهي الصلاحية</p>
            </div>
          ) : (
            <div className="relative w-full h-64 bg-slate-50 rounded-xl overflow-hidden border border-slate-100">
              <Image
                src={imageUrl}
                alt={title}
                fill
                className="object-contain"
                onError={() => setImageError(true)}
                unoptimized
              />
            </div>
          )}

          {/* Error feedback */}
          {actionError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-red-700" role="alert">{actionError}</p>
            </div>
          )}

          {/* Reject form */}
          {showRejectForm && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                سبب الرفض
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="اكتب سبب رفض هذا الإثبات..."
                className="w-full border border-slate-200 rounded-xl p-3.5 text-sm resize-none focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder-slate-400"
                rows={3}
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
          {!showRejectForm ? (
            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                disabled={isPending}
                className="flex-1 bg-emerald-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_4px_14px_0_rgba(5,150,105,0.3)]"
              >
                {isPending ? (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {isPending ? "جارٍ المعالجة..." : "موافقة"}
              </button>
              <button
                onClick={() => setShowRejectForm(true)}
                disabled={isPending}
                className="flex-1 bg-red-50/50 border border-red-200 text-red-600 rounded-xl py-3 text-sm font-semibold hover:bg-red-50 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                رفض
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectForm(false);
                  setReason("");
                }}
                className="px-4 py-3 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100/50 border border-slate-200 hover:bg-slate-100 active:scale-[0.98] transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={handleReject}
                disabled={isPending || !reason.trim()}
                className="flex-1 bg-red-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : null}
                {isPending ? "جارٍ المعالجة..." : "تأكيد الرفض"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
