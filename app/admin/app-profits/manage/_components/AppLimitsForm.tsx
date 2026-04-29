"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAppProfitPackageLimits } from "../actions";
import type { AppProfitPackageLimit } from "@/lib/db/app-profit-limits";

const keys = ["A1", "A2", "A3", "B1", "B2", "B3", "200", "300", "400", "500", "600"];

export function AppLimitsForm({ limits }: { limits: AppProfitPackageLimit[] }) {
  const map = new Map(limits.map((limit) => [limit.package_key, limit.app_limit]));
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <form
      className="rounded-2xl bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage(null);
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await updateAppProfitPackageLimits(formData);
          if ("error" in result) {
            setMessage(result.error);
            return;
          }
          setMessage("تم تحديث حدود التطبيقات");
          router.refresh();
        });
      }}
    >
      <h2 className="mb-1 text-lg font-bold text-slate-900">
        حدود التطبيقات حسب الباقة
      </h2>
      <p className="mb-4 text-sm text-slate-500">
        يتم عرض هذا العدد فقط من التطبيقات النشطة للمستخدم حسب باقته.
      </p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {keys.map((key) => (
          <label key={key} className="text-sm">
            <span className="mb-1 block font-bold text-slate-700">{key}</span>
            <input
              name={`limit:${key}`}
              type="number"
              min="0"
              defaultValue={map.get(key) ?? 999}
              className="w-full rounded-xl border border-slate-200 px-3 py-2"
            />
          </label>
        ))}
      </div>
      <button disabled={isPending} className="mt-4 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
        حفظ الحدود
      </button>
      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
    </form>
  );
}
