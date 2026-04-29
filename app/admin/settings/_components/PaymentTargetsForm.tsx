"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePaymentTarget } from "@/app/admin/actions";
import type { PaymentTarget, PaymentTargetScope } from "@/lib/db/payment-targets";

const scopeLabels: Record<PaymentTargetScope, string> = {
  packages: "الباقات",
  profit_shares: "حصص الأرباح",
  investment: "الاستثمار",
  pay_later: "الترقية بالأجل",
};

function TargetRow({ target }: { target: PaymentTarget }) {
  const [label, setLabel] = useState(target.label);
  const [address, setAddress] = useState(target.address);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <h3 className="mb-3 text-sm font-bold text-slate-900">
        {scopeLabels[target.scope]}
      </h3>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          placeholder="طريقة الدفع"
        />
        <input
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          dir="ltr"
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          placeholder="رقم المحفظة / الحساب"
        />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setMessage(null);
            startTransition(async () => {
              const result = await updatePaymentTarget(target.scope, {
                label,
                address,
              });
              if ("error" in result) {
                setMessage(result.error);
                return;
              }
              setMessage("تم الحفظ");
              router.refresh();
            });
          }}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700 disabled:opacity-50"
        >
          حفظ
        </button>
        {message ? <span className="text-sm text-slate-500">{message}</span> : null}
      </div>
    </div>
  );
}

export function PaymentTargetsForm({ targets }: { targets: PaymentTarget[] }) {
  const existing = new Map(targets.map((target) => [target.scope, target]));
  const scopes: PaymentTargetScope[] = [
    "packages",
    "profit_shares",
    "investment",
    "pay_later",
  ];

  return (
    <div className="space-y-4 rounded-2xl bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
      {scopes.map((scope) => (
        <TargetRow
          key={scope}
          target={
            existing.get(scope) ?? {
              scope,
              label: "USDT",
              address: "",
            }
          }
        />
      ))}
    </div>
  );
}
