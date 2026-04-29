// use client — file upload state, modal open/close, useActionState/useFormStatus
"use client";

import { X } from "lucide-react";

import { useState, useEffect, useRef, useActionState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  purchasePackage,
  type PackageActionResult,
} from "../actions";
import type { PackageWithStatus, PaymentSetting } from "../data";
import { compressImage } from "@/lib/utils/compress-image";

const ACCEPTED_TYPES = ["image/jpeg", "image/png"];

const initialState: PackageActionResult = { success: false, idle: true };

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-label="إرسال طلب الاشتراك"
      className="w-full bg-emerald-600 text-white rounded-xl py-3 font-bold hover:bg-emerald-700 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? "جارٍ الإرسال..." : "إرسال الطلب"}
    </button>
  );
}

export function PurchaseInline({
  pkg,
  paymentSetting,
}: {
  pkg: PackageWithStatus;
  paymentSetting: PaymentSetting;
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [compressedFile, setCompressedFile] = useState<File | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [state, formAction] = useActionState(purchasePackage, initialState);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const compressedInputRef = useRef<HTMLInputElement>(null);
  const prevSuccessRef = useRef(false);

  const error = "error" in state ? state.error : null;

  useEffect(() => {
    if ("success" in state && state.success === true && !prevSuccessRef.current) {
      prevSuccessRef.current = true;
      setOpen(false);
      setFile(null);
      setCompressedFile(null);
      router.refresh();
    }
    if (!("success" in state && state.success === true)) {
      prevSuccessRef.current = false;
    }
  }, [state, router]);

  const processFile = async (raw: File) => {
    setDropError(null);
    setFile(raw);
    setIsCompressing(true);
    try {
      const compressed = await compressImage(raw);
      setCompressedFile(compressed);
      const dt = new DataTransfer();
      dt.items.add(compressed);
      if (compressedInputRef.current) {
        compressedInputRef.current.files = dt.files;
      }
    } catch {
      setDropError("فشل في ضغط الصورة، يرجى المحاولة مرة أخرى");
      setFile(null);
      setCompressedFile(null);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      processFile(selected);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (!dropped) return;
    if (!ACCEPTED_TYPES.includes(dropped.type)) {
      setDropError("يرجى رفع صورة فقط (JPEG أو PNG)");
      return;
    }
    processFile(dropped);
  };

  return (
    <>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          aria-label={`اشتراك في ${pkg.name}`}
          className="w-full bg-emerald-600 text-white rounded-xl py-3 font-bold hover:bg-emerald-700 active:scale-95 transition-all duration-200"
        >
          اشتراك
        </button>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-2 mb-2 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-3">
            <h2 className="text-sm font-bold text-slate-900">
              تأكيد الاشتراك: {pkg.name}
            </h2>
            <button
              onClick={() => setOpen(false)}
              aria-label="إلغاء الاشتراك"
              className="text-slate-400 hover:text-slate-600 font-bold"
            >
              <X className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>

            <div className="mb-4">
              <p className="text-slate-600 text-sm">
                المبلغ:{" "}
                <span dir="ltr" className="font-bold text-slate-900">
                  ${pkg.price.toFixed(2)}
                </span>
              </p>
            </div>

            {paymentSetting ? (
              <div className="bg-slate-900 text-white rounded-xl p-4 mb-4">
                <p className="text-slate-300 text-sm mb-1">
                  {paymentSetting.label}
                </p>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono flex-1 break-all">
                    {paymentSetting.address}
                  </code>
                  <button
                    onClick={async () => {
                      try {
                        if (navigator.clipboard?.writeText) {
                          await navigator.clipboard.writeText(
                            paymentSetting.address
                          );
                        } else {
                          const ta = document.createElement("textarea");
                          ta.value = paymentSetting.address;
                          ta.style.position = "fixed";
                          ta.style.opacity = "0";
                          document.body.appendChild(ta);
                          ta.select();
                          document.execCommand("copy");
                          document.body.removeChild(ta);
                        }
                      } catch {}
                    }}
                    aria-label="نسخ عنوان الدفع"
                    className="text-xs bg-slate-700 px-2 py-1 rounded-lg hover:bg-slate-600 transition-all active:scale-95"
                  >
                    نسخ
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <p className="text-sm text-amber-800">
                  معلومات الدفع غير متوفرة حالياً، يرجى التواصل مع الدعم
                </p>
              </div>
            )}

            <form action={formAction}>
              <input type="hidden" name="package_id" value={pkg.id} />

              {/* Semantic <label> wraps hidden input — no div role="button" hack needed */}
              <label
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 mb-4 cursor-pointer block ${
                  isDragging
                    ? "border-emerald-500 bg-emerald-50/70 scale-[1.01]"
                    : "border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/50"
                }`}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                aria-label="رفع صورة التحويل"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleFileChange}
                  className="hidden"
                  aria-label="رفع صورة التحويل"
                />
                <input
                  ref={compressedInputRef}
                  type="file"
                  name="receipt"
                  className="hidden"
                  tabIndex={-1}
                  aria-hidden="true"
                />
                {file ? (
                  <div>
                    <p className="text-sm text-slate-900 font-medium">
                      {file.name}
                    </p>
                    {isCompressing ? (
                      <p className="text-xs text-amber-600 mt-1">جارٍ ضغط الصورة...</p>
                    ) : compressedFile ? (
                      <p className="text-xs text-slate-500 mt-1">
                        {(compressedFile.size / 1024 / 1024).toFixed(2)} MB
                        {compressedFile.size < file.size && (
                          <span className="text-emerald-600 ms-1">
                            (تم الضغط من {(file.size / 1024 / 1024).toFixed(1)} MB)
                          </span>
                        )}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500 mt-1">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-slate-500 text-sm">
                      اضغط أو اسحب صورة التحويل هنا
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      JPEG أو PNG — يتم ضغط الصور الكبيرة تلقائياً
                    </p>
                  </div>
                )}
              </label>

              {(dropError || error) && (
                <p
                  className="text-sm text-red-600 text-center mb-3"
                  aria-live="polite"
                  role="alert"
                >
                  {dropError ?? error?.message}
                </p>
              )}

              <SubmitButton disabled={isCompressing || !compressedFile} />
            </form>
        </div>
      )}
    </>
  );
}
