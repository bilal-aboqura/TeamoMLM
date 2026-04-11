"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCommissionRates } from "@/app/admin/actions";
import type { CommissionMatrix } from "../page";

const PACKAGE_ORDER = ["A1", "A2", "A3", "B1", "B2", "B3"] as const;
const LEVELS = ["L1", "L2", "L3", "L4", "L5", "L6"] as const;

type PackageKey = (typeof PACKAGE_ORDER)[number];
type LevelKey = (typeof LEVELS)[number];

type MatrixState = {
  [P in PackageKey]: {
    [L in LevelKey]: number;
  };
};

const DEFAULT_MATRIX: MatrixState = {
  A1: { L1: 35, L2: 17, L3: 12, L4: 8, L5: 5, L6: 5 },
  A2: { L1: 60, L2: 25, L3: 17, L4: 12, L5: 5, L6: 5 },
  A3: { L1: 90, L2: 35, L3: 21, L4: 14, L5: 5, L6: 5 },
  B1: { L1: 140, L2: 85, L3: 35, L4: 20, L5: 9, L6: 9 },
  B2: { L1: 220, L2: 125, L3: 90, L4: 30, L5: 15, L6: 15 },
  B3: { L1: 350, L2: 175, L3: 100, L4: 32, L5: 18, L6: 18 },
};

function toState(matrix: CommissionMatrix): MatrixState {
  const state = { ...DEFAULT_MATRIX };
  for (const pkg of PACKAGE_ORDER) {
    const pkgRates = matrix[pkg];
    if (pkgRates) {
      for (const lvl of LEVELS) {
        state[pkg][lvl] = pkgRates[lvl] ?? 0;
      }
    }
  }
  return state;
}

export function CommissionMatrixForm({
  matrix,
}: {
  matrix: CommissionMatrix;
}) {
  const router = useRouter();
  const [values, setValues] = useState<MatrixState>(() => toState(matrix));
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasChanges =
    JSON.stringify(values) !== JSON.stringify(toState(matrix));

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleChange = (pkg: PackageKey, lvl: LevelKey, raw: string) => {
    const num = raw === "" ? 0 : parseFloat(raw);
    if (isNaN(num)) return;
    setValues((prev) => ({
      ...prev,
      [pkg]: { ...prev[pkg], [lvl]: num },
    }));
  };

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateCommissionRates(values);
      if ("success" in result) {
        showToast("تم تحديث مصفوفة العمولات بنجاح", "success");
        router.refresh();
      } else {
        showToast(result.error, "error");
      }
    });
  };

  const handleReset = () => setValues(toState(matrix));

  const getRowTotal = (pkg: PackageKey) =>
    LEVELS.reduce((sum, lvl) => sum + values[pkg][lvl], 0);

  return (
    <>
      <div className="bg-slate-50 rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100/70">
                <th className="text-start px-4 py-3 text-xs font-semibold text-slate-500 uppercase">
                  الباقة
                </th>
                {LEVELS.map((lvl, i) => (
                  <th
                    key={lvl}
                    className="text-center px-2 py-3 text-xs font-semibold text-slate-500 uppercase"
                  >
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-slate-200/60 text-slate-500 text-[10px] font-mono font-bold">
                      L{i + 1}
                    </span>
                  </th>
                ))}
                <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase">
                  الإجمالي
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50">
              {PACKAGE_ORDER.map((pkg) => (
                <tr key={pkg} className="hover:bg-white/50">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-900 text-white text-xs font-bold">
                      {pkg}
                    </span>
                  </td>
                  {LEVELS.map((lvl) => (
                    <td key={lvl} className="px-1 py-2 text-center">
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={values[pkg][lvl]}
                          onChange={(e) => handleChange(pkg, lvl, e.target.value)}
                          dir="ltr"
                          className="w-full border border-slate-200 rounded-lg bg-white px-2 py-1.5 text-xs text-slate-900 font-mono text-center focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all"
                        />
                      </div>
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center">
                    <span className="text-xs font-bold text-slate-700 font-mono" dir="ltr">
                      ${getRowTotal(pkg).toFixed(0)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-white border-t border-slate-100 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={isPending || !hasChanges}
            className="flex-1 bg-slate-900 text-white rounded-xl py-3 text-sm font-semibold hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                جاري الحفظ...
              </>
            ) : (
              "حفظ التعديلات"
            )}
          </button>
          {hasChanges && (
            <button
              onClick={handleReset}
              disabled={isPending}
              className="bg-slate-100 text-slate-700 rounded-xl py-3 px-6 text-sm font-medium hover:bg-slate-200 active:scale-95 transition-all disabled:opacity-50"
            >
              تراجع
            </button>
          )}
        </div>
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 start-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-5 py-3 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.15)] text-sm font-medium animate-in fade-in slide-in-from-bottom-2 duration-300 ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-rose-600 text-white"
          }`}
        >
          {toast.type === "success" ? (
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
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
