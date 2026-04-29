"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfitShareManualSold } from "../actions";

export function EquitySettingsPanel({
  manualSoldEquity,
  acceptedSoldEquity,
  remainingEquity,
}: {
  manualSoldEquity: number;
  acceptedSoldEquity: number;
  remainingEquity: number;
}) {
  const [value, setValue] = useState(String(manualSoldEquity));
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <section className="rounded-2xl bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
      <div className="mb-4">
        <h2 className="text-base font-bold text-slate-900">
          التحكم في عداد حصص الأرباح
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          الطلبات المقبولة: {acceptedSoldEquity.toFixed(2)}%، المتبقي: {remainingEquity.toFixed(2)}%.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1">
          <span className="mb-1 block text-xs font-semibold text-slate-500">
            نسبة مباعة خارج النظام
          </span>
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            type="number"
            min="0"
            max="30"
            step="0.01"
            dir="ltr"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
        </label>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setMessage(null);
            startTransition(async () => {
              const result = await updateProfitShareManualSold(Number(value));
              if ("error" in result) {
                setMessage(result.error);
                return;
              }
              setMessage("تم تحديث العداد");
              router.refresh();
            });
          }}
          className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700 disabled:opacity-50"
        >
          حفظ
        </button>
      </div>
      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
    </section>
  );
}
