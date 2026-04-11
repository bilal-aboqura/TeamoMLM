import { createAdminClient } from "@/lib/supabase/admin";
import { DepositsTable } from "./_components/DepositsTable";
import { DepositsHistoryTable } from "./_components/DepositsHistoryTable";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function DepositsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = createAdminClient();

  // Pending deposits (no pagination — always show all pending)
  const { data: requests, error } = await supabase
    .from("package_subscription_requests")
    .select(
      "id, amount_paid, status, created_at, receipt_url, users!package_subscription_requests_user_id_fkey(full_name, phone_number), packages(name)"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Deposits query error:", error.message);
    throw new Error(`Deposits query failed: ${error.message}`);
  }

  // Deposit history with server-side pagination
  const { data: history, count: historyCount } = await supabase
    .from("package_subscription_requests")
    .select(
      "id, amount_paid, status, created_at, reviewed_at, rejection_reason, users!package_subscription_requests_user_id_fkey(full_name, phone_number), packages(name)",
      { count: "exact" }
    )
    .in("status", ["approved", "rejected"])
    .order("reviewed_at", { ascending: false })
    .range(from, to);

  const totalPages = Math.ceil((historyCount ?? 0) / PAGE_SIZE);

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

  const historyEnriched = (history ?? []).map((row) => {
    const user = row.users as unknown as { full_name: string; phone_number: string } | null;
    const pkg = row.packages as unknown as { name: string } | null;
    return {
      id: row.id,
      amount_paid: row.amount_paid,
      status: row.status as "approved" | "rejected",
      created_at: row.created_at,
      reviewed_at: row.reviewed_at ?? row.created_at,
      rejection_reason: row.rejection_reason ?? null,
      full_name: user?.full_name ?? "غير متوفر",
      phone_number: user?.phone_number ?? "غير متوفر",
      package_name: pkg?.name ?? "غير متوفر",
    };
  });

  return (
    <div className="space-y-12">
      {/* Pending Section */}
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

      {/* History Section */}
      <div>
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900">سجل الإيداعات</h2>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
              {historyCount ?? 0} سجل
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            جميع الإيداعات التي تمت معالجتها (مقبولة أو مرفوضة)
          </p>
        </div>

        <DepositsHistoryTable records={historyEnriched} />

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              صفحة {currentPage} من {totalPages} — إجمالي {historyCount} سجل
            </p>
            <div className="flex items-center gap-2">
              {currentPage > 1 && (
                <a
                  href={`/admin/deposits?page=${currentPage - 1}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  السابق
                </a>
              )}

              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <a
                      key={pageNum}
                      href={`/admin/deposits?page=${pageNum}`}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-medium transition-all duration-200 ${
                        pageNum === currentPage
                          ? "bg-slate-900 text-white shadow-[0_2px_8px_rgba(15,23,42,0.2)]"
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      {pageNum}
                    </a>
                  );
                })}
              </div>

              {currentPage < totalPages && (
                <a
                  href={`/admin/deposits?page=${currentPage + 1}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                >
                  التالي
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
