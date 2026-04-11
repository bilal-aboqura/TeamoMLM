import { createAdminClient } from "@/lib/supabase/admin";
import { WithdrawalsTable } from "./_components/WithdrawalsTable";

export default async function WithdrawalsPage() {
  const supabase = createAdminClient();

  const { data: requests } = await supabase
    .from("withdrawal_requests")
    .select(
      "id, amount, payment_details, status, rejection_reason, created_at, users!withdrawal_requests_user_id_fkey(full_name, phone_number)"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const enriched = (requests ?? []).map((row) => ({
    id: row.id,
    amount: row.amount,
    payment_details: row.payment_details,
    created_at: row.created_at,
    full_name: (row.users as unknown as { full_name: string }).full_name,
    phone_number: (row.users as unknown as { phone_number: string }).phone_number,
  }));

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">طلبات السحب</h1>
          {enriched.length > 0 && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200">
              {enriched.length} معلق
            </span>
          )}
        </div>
        <p className="text-slate-500 text-sm mt-1">
          طلبات سحب الأرصدة التي تنتظر المراجعة والموافقة
        </p>
      </div>
      <WithdrawalsTable requests={enriched} />
    </div>
  );
}
