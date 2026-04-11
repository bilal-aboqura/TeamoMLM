import { createAdminClient } from "@/lib/supabase/admin";
import { DepositsTable } from "./_components/DepositsTable";

export const dynamic = "force-dynamic";

export default async function DepositsPage() {
  const supabase = createAdminClient();

  const { data: requests, error } = await supabase
    .from("package_subscription_requests")
    .select(
      "id, amount_paid, status, created_at, receipt_url, users!package_subscription_requests_user_id_fkey(full_name, phone_number), packages(name)"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Deposits query error:", error.message, error.details, error.hint);
    throw new Error(`Deposits query failed: ${error.message}`);
  }

  const enriched = await Promise.all(
    (requests ?? []).map(async (row) => {
      const { data } = await supabase.storage
        .from("proofs")
        .createSignedUrl(row.receipt_url, 300);
      const user = row.users as unknown as { full_name: string; phone_number: string } | null;
      const pkg = row.packages as unknown as { name: string } | null;
      return {
        id: row.id,
        amount_paid: row.amount_paid,
        created_at: row.created_at,
        full_name: user?.full_name ?? "غير متوفر",
        phone_number: user?.phone_number ?? "غير متوفر",
        package_name: pkg?.name ?? "غير متوفر",
        signed_url: data?.signedUrl ?? "",
      };
    })
  );

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">الإيداعات المعلقة</h1>
          {enriched.length > 0 && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200">
              {enriched.length} معلق
            </span>
          )}
        </div>
        <p className="text-slate-500 text-sm mt-1">
          طلبات اشتراك الباقات التي تنتظر المراجعة والموافقة
        </p>
      </div>
      <DepositsTable requests={enriched} />
    </div>
  );
}
