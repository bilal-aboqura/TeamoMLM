import { createAdminClient } from "@/lib/supabase/admin";
import { PayLaterAdminPanel } from "./_components/PayLaterAdminPanel";

export const dynamic = "force-dynamic";

type DebtRow = {
  id: string;
  full_name: string;
  phone_number: string;
  from_package_name: string;
  to_package_name: string;
  upgrade_amount: number;
  repayment_fee_amount: number;
  penalty_amount: number;
  locked_profit: number;
  amount_paid: number;
  status: "active" | "pending_review" | "overdue" | "paid" | "cancelled";
  due_at: string;
  upgraded_at: string;
  repayment_submitted_at: string | null;
  signed_url: string;
};

type UserSettingsRow = {
  id: string;
  full_name: string;
  phone_number: string;
  current_package_level: string | null;
  pay_later_manual_eligible: boolean;
  pay_later_fee_pct: number;
  pay_later_penalty_amount: number;
  approved_work_days: number;
  direct_referrals: number;
};

export default async function AdminPayLaterPage() {
  const supabase = createAdminClient();

  await supabase.rpc("process_overdue_pay_later_debts");

  const [{ data: debts }, { data: users }] = await Promise.all([
    supabase
      .from("pay_later_debts")
      .select(
        "id, from_package_name, to_package_name, upgrade_amount, repayment_fee_amount, penalty_amount, locked_profit, amount_paid, status, due_at, upgraded_at, repayment_submitted_at, repayment_receipt_path, users!pay_later_debts_user_id_fkey(full_name, phone_number)"
      )
      .in("status", ["active", "pending_review", "overdue"])
      .order("due_at", { ascending: true }),
    supabase
      .from("users")
      .select(
        "id, full_name, phone_number, current_package_level, pay_later_manual_eligible, pay_later_fee_pct, pay_later_penalty_amount"
      )
      .neq("role", "admin")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const debtRows: DebtRow[] = await Promise.all(
    (debts ?? []).map(async (row) => {
      const user = row.users as unknown as {
        full_name: string;
        phone_number: string;
      } | null;

      const signed = row.repayment_receipt_path
        ? await supabase.storage
            .from("proofs")
            .createSignedUrl(row.repayment_receipt_path, 300)
        : { data: null };

      return {
        id: row.id,
        full_name: user?.full_name ?? "غير متوفر",
        phone_number: user?.phone_number ?? "غير متوفر",
        from_package_name: row.from_package_name,
        to_package_name: row.to_package_name,
        upgrade_amount: Number(row.upgrade_amount),
        repayment_fee_amount: Number(row.repayment_fee_amount),
        penalty_amount: Number(row.penalty_amount),
        locked_profit: Number(row.locked_profit),
        amount_paid: Number(row.amount_paid),
        status: row.status as DebtRow["status"],
        due_at: row.due_at,
        upgraded_at: row.upgraded_at,
        repayment_submitted_at: row.repayment_submitted_at,
        signed_url: signed.data?.signedUrl ?? "",
      };
    })
  );

  const userIds = (users ?? []).map((user) => user.id);

  const [{ data: approvedLogs }, { data: referralRows }] = await Promise.all([
    userIds.length
      ? supabase
          .from("task_completion_logs")
          .select("user_id, completion_date")
          .in("user_id", userIds)
          .eq("status", "approved")
      : Promise.resolve({ data: [] }),
    userIds.length
      ? supabase.from("users").select("invited_by").in("invited_by", userIds)
      : Promise.resolve({ data: [] }),
  ]);

  const daysByUser = new Map<string, Set<string>>();
  for (const log of approvedLogs ?? []) {
    if (!daysByUser.has(log.user_id)) daysByUser.set(log.user_id, new Set());
    daysByUser.get(log.user_id)!.add(log.completion_date);
  }

  const referralsByUser = new Map<string, number>();
  for (const row of referralRows ?? []) {
    if (!row.invited_by) continue;
    referralsByUser.set(
      row.invited_by,
      (referralsByUser.get(row.invited_by) ?? 0) + 1
    );
  }

  const userRows: UserSettingsRow[] = (users ?? []).map((user) => ({
    id: user.id,
    full_name: user.full_name,
    phone_number: user.phone_number,
    current_package_level: user.current_package_level,
    pay_later_manual_eligible: Boolean(user.pay_later_manual_eligible),
    pay_later_fee_pct: Number(user.pay_later_fee_pct),
    pay_later_penalty_amount: Number(user.pay_later_penalty_amount),
    approved_work_days: daysByUser.get(user.id)?.size ?? 0,
    direct_referrals: referralsByUser.get(user.id) ?? 0,
  }));

  return (
    <PayLaterAdminPanel
      debts={debtRows}
      users={userRows}
    />
  );
}
