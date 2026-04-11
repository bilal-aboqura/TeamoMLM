// use client — useActionState/useFormStatus, file state, modal open/close
"use client";

import { X, ExternalLink } from "lucide-react";

import { useState, useEffect, useRef, useActionState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  submitTaskProof,
  type TaskActionResult,
} from "../actions";
import type { TaskWithStatus } from "../data";

const ACCEPTED_TYPES = ["image/jpeg", "image/png"];

const initialState: TaskActionResult = { success: false, idle: true };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="رفع الإثبات"
      className="w-full bg-emerald-600 text-white rounded-xl py-3 font-bold hover:bg-emerald-700 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? "جارٍ الإرسال..." : "إرسال الإثبات"}
    </button>
  );
}

export function TaskExecutionModal({
  task,
  rewardPerTask,
}: {
  task: TaskWithStatus;
  rewardPerTask: number;
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dropError, setDropError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [state, formAction] = useActionState(submitTaskProof, initialState);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const error = "error" in state ? state.error : null;

  useEffect(() => {
    if ("success" in state && state.success === true) {
      setOpen(false);
      setFile(null);
      router.refresh();
    }
  }, [state, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setDropError(null);
      setFile(selected);
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
    if (dropped.size > 5 * 1024 * 1024) {
      setDropError("حجم الصورة يجب أن لا يتجاوز 5 ميغابايت");
      return;
    }
    setDropError(null);
    setFile(dropped);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={`تنفيذ ${task.title}`}
        className="bg-slate-900 text-white rounded-xl px-4 py-2 text-sm font-bold hover:bg-slate-800 active:scale-95 transition-all duration-200"
      >
        تنفيذ
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                {task.title}
              </h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="إغلاق"
                className="text-slate-400 hover:text-slate-600 text-xl"
              >
                <X className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>

            <div className="mb-4">
              <span
                dir="ltr"
                className="text-emerald-600 font-bold text-sm"
              >
                +${rewardPerTask.toFixed(4)}
              </span>
            </div>

            <a
              href={task.action_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="افتح الرابط"
              className="flex items-center justify-center gap-2 bg-slate-900 text-white rounded-xl w-full py-4 text-lg font-bold hover:bg-slate-800 active:scale-95 transition-all duration-200 mb-4"
            >
              افتح الرابط
              <ExternalLink className="w-5 h-5 rtl:rotate-180" strokeWidth={2} />
            </a>

            <form action={formAction}>
              <input type="hidden" name="task_id" value={task.id} />

              <label
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 mb-4 cursor-pointer block ${
                  isDragging
                    ? "border-emerald-500 bg-emerald-50/70 scale-[1.01]"
                    : "border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/50"
                }`}
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                aria-label="رفع صورة الإثبات"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  name="proof"
                  accept="image/jpeg,image/png"
                  onChange={handleFileChange}
                  className="hidden"
                  aria-label="رفع صورة الإثبات"
                />
                {file ? (
                  <div>
                    <p className="text-sm text-slate-900 font-medium">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-slate-500 text-sm">
                      اضغط أو اسحب صورة الإثبات هنا
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      JPEG أو PNG — حتى 5 MB
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

              <SubmitButton />
            </form>
          </div>
        </div>
      )}
    </>
  );
}
