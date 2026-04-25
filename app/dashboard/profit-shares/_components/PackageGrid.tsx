"use client";

import { useState } from "react";
import { BadgeDollarSign, Lock } from "lucide-react";
import { EQUITY_PACKAGES, type EquityPackage } from "@/lib/validations/equity-schemas";
import { PurchaseModal } from "./PurchaseModal";

export function PackageGrid({
  remainingEquity,
  walletAddress,
  disabled,
}: {
  remainingEquity: number;
  walletAddress: string | null;
  disabled: boolean;
}) {
  const [selectedPackage, setSelectedPackage] = useState<EquityPackage | null>(
    null
  );

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">باقات الأسهم</h2>
        <span className="text-sm text-slate-500" dir="ltr">
          {remainingEquity.toFixed(2)}% available
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {EQUITY_PACKAGES.map((pkg) => {
          const unavailable = disabled || pkg.percentage > remainingEquity;

          return (
            <article
              key={pkg.id}
              className={`rounded-2xl border bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all ${
                unavailable
                  ? "border-slate-200 opacity-60"
                  : "border-slate-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <BadgeDollarSign className="h-5 w-5" strokeWidth={2} />
                </div>
                {unavailable ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                    <Lock className="h-3.5 w-3.5" strokeWidth={2} />
                    غير متاح
                  </span>
                ) : null}
              </div>

              <div className="mt-5">
                <h3 className="text-2xl font-black text-slate-900" dir="ltr">
                  {pkg.percentage}%
                </h3>
                <p className="mt-1 text-sm text-slate-500">حصة من أرباح المنصة</p>
              </div>

              <div className="mt-5 flex items-end justify-between gap-3">
                <p className="text-lg font-bold text-slate-900" dir="ltr">
                  ${pkg.priceUsd.toLocaleString("en-US")}
                </p>
                <button
                  type="button"
                  disabled={unavailable}
                  onClick={() => setSelectedPackage(pkg)}
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-emerald-600 active:scale-95 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                >
                  شراء
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <PurchaseModal
        selectedPackage={selectedPackage}
        walletAddress={walletAddress}
        onClose={() => setSelectedPackage(null)}
      />
    </section>
  );
}
