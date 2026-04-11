import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { WalletStatsCards } from "./_components/WalletStatsCards";
import { WithdrawalForm } from "./_components/WithdrawalForm";
import { WithdrawalsTable } from "./_components/WithdrawalsTable";

// Auth guard: app/dashboard/layout.tsx covers all /dashboard/** routes —
// redirects unauthenticated users to /login and admin-role users to /admin.

export const metadata = {
  title: "المحفظة",
};

export default async function WalletPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [userResult, summaryResult, requestsResult] = await Promise.all([
    supabase
      .from("users")
      .select("wallet_balance, status")
      .eq("id", user.id)
      .single(),
    supabase
      .from("withdrawal_requests")
      .select("amount, status")
      .eq("user_id", user.id)
      .limit(500),
    supabase
      .from("withdrawal_requests")
      .select("id, amount, payment_details, status, rejection_reason, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const userRow = userResult.data;
  if (!userRow) redirect("/login");

  const requests = summaryResult.data ?? [];
  const totalWithdrawn = requests
    .filter((r) => r.status === "approved")
    .reduce((sum, r) => sum + Number(r.amount), 0);
  const pendingWithdrawals = requests
    .filter((r) => r.status === "pending")
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const isSuspended = userRow.status === "suspended";

  return (
    <main dir="rtl" className="max-w-3xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold text-slate-900">المحفظة</h1>

      <WalletStatsCards
        availableBalance={Number(userRow.wallet_balance)}
        totalWithdrawn={totalWithdrawn}
        pendingWithdrawals={pendingWithdrawals}
      />

      <WithdrawalForm
        isSuspended={isSuspended}
        availableBalance={Number(userRow.wallet_balance)}
      />

      <WithdrawalsTable requests={requestsResult.data ?? []} />
    </main>
  );
}
