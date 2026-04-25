"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { DepositRequestsTable, type AdminDepositRow } from "./DepositRequestsTable";
import { WithdrawalRequestsTable, type AdminWithdrawalRow } from "./WithdrawalRequestsTable";

export function InvestmentAdminTabs({
  deposits,
  withdrawals,
}: {
  deposits: AdminDepositRow[];
  withdrawals: AdminWithdrawalRow[];
}) {
  const params = useSearchParams();
  const router = useRouter();
  const active = params.get("tab") === "withdrawals" ? "withdrawals" : "deposits";

  const setActive = (tab: "deposits" | "withdrawals") => {
    router.replace(`/admin/investments?tab=${tab}`);
  };

  return (
    <section className="space-y-5">
      <div className="inline-flex rounded-2xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setActive("deposits")}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${active === "deposits" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
        >
          طلبات الإيداع
        </button>
        <button
          type="button"
          onClick={() => setActive("withdrawals")}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${active === "withdrawals" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
        >
          طلبات السحب
        </button>
      </div>

      {active === "deposits" ? (
        <DepositRequestsTable rows={deposits} />
      ) : (
        <WithdrawalRequestsTable rows={withdrawals} />
      )}
    </section>
  );
}
