import { createAdminClient } from "@/lib/supabase/admin";
import { InvestmentAdminTabs } from "./_components/InvestmentAdminTabs";
import type { AdminDepositRow } from "./_components/DepositRequestsTable";
import type { AdminWithdrawalRow } from "./_components/WithdrawalRequestsTable";

export const dynamic = "force-dynamic";

type UserJoin = { full_name: string | null; phone_number: string | null } | null;

export default async function AdminInvestmentsPage() {
  const supabase = createAdminClient();

  const [depositResult, withdrawalResult] = await Promise.all([
    supabase
      .from("investment_deposits")
      .select("id, amount, tier_percentage, status, receipt_url, rejection_reason, created_at, users!investment_deposits_user_id_fkey(full_name, phone_number)")
      .order("created_at", { ascending: false }),
    supabase
      .from("investment_withdrawals")
      .select("id, amount, status, rejection_reason, created_at, users!investment_withdrawals_user_id_fkey(full_name, phone_number)")
      .order("created_at", { ascending: false }),
  ]);

  const deposits: AdminDepositRow[] = await Promise.all(
    (depositResult.data ?? []).map(async (row) => {
      const { data: signed } = await supabase.storage
        .from("investment-receipts")
        .createSignedUrl(row.receipt_url, 300);
      const user = row.users as unknown as UserJoin;
      return {
        id: row.id,
        amount: Number(row.amount),
        tierPercentage: Number(row.tier_percentage),
        status: row.status as AdminDepositRow["status"],
        submittedAt: row.created_at,
        signedReceiptUrl: signed?.signedUrl ?? "",
        rejectionReason: row.rejection_reason,
        user: {
          fullName: user?.full_name ?? "غير متوفر",
          phoneNumber: user?.phone_number ?? "غير متوفر",
        },
      };
    })
  );

  const withdrawals: AdminWithdrawalRow[] = (withdrawalResult.data ?? []).map((row) => {
    const user = row.users as unknown as UserJoin;
    return {
      id: row.id,
      amount: Number(row.amount),
      status: row.status as AdminWithdrawalRow["status"],
      requestedAt: row.created_at,
      rejectionReason: row.rejection_reason,
      user: {
        fullName: user?.full_name ?? "غير متوفر",
        phoneNumber: user?.phone_number ?? "غير متوفر",
      },
    };
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">الاستثمارات</h1>
        <p className="mt-1 text-sm text-slate-500">
          مراجعة إيداعات رأس المال وطلبات سحب الأرباح.
        </p>
      </header>
      <InvestmentAdminTabs deposits={deposits} withdrawals={withdrawals} />
    </div>
  );
}
