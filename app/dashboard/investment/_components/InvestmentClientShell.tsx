"use client";

import { useState } from "react";
import { Plus, Wallet } from "lucide-react";
import { EmptyInvestmentState } from "./EmptyInvestmentState";
import { DepositModal } from "./DepositModal";
import { WithdrawModal } from "./WithdrawModal";
import type { InvestmentSummary } from "@/lib/investment/calc";

type DepositState = {
  status: "pending" | "accepted" | "rejected";
  rejection_reason: string | null;
} | null;

export function InvestmentClientShell({
  children,
  userId,
  walletAddress,
  summary,
  latestDeposit,
}: {
  children: React.ReactNode;
  userId: string;
  walletAddress: string | null;
  summary: InvestmentSummary;
  latestDeposit: DepositState;
}) {
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const pendingDeposit = latestDeposit?.status === "pending";

  return (
    <>
      {summary.isEmpty ? (
        <EmptyInvestmentState onDepositClick={() => setDepositOpen(true)} />
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setDepositOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-emerald-700 active:scale-95"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            إيداع جديد
          </button>
          <button
            type="button"
            disabled={summary.availableProfit <= 0}
            onClick={() => setWithdrawOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-slate-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Wallet className="h-4 w-4" strokeWidth={2} />
            سحب الأرباح
          </button>
        </div>
      )}

      {pendingDeposit ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-800">
          طلب معلق للمراجعة
        </div>
      ) : latestDeposit?.status === "rejected" ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
          <p className="font-bold">تم رفض آخر طلب إيداع</p>
          {latestDeposit.rejection_reason ? (
            <p className="mt-1">{latestDeposit.rejection_reason}</p>
          ) : null}
        </div>
      ) : null}

      {!summary.isEmpty ? children : null}

      <DepositModal
        open={depositOpen}
        onClose={() => setDepositOpen(false)}
        userId={userId}
        walletAddress={walletAddress}
      />
      <WithdrawModal
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        availableProfit={summary.availableProfit}
      />
    </>
  );
}
