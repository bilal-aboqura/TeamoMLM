import { createAdminClient } from "@/lib/supabase/admin";
import { Download, Banknote } from "lucide-react";
import { FinancialSummaryCard } from "./_components/FinancialSummaryCard";
import { AcceptedDepositsTable } from "./_components/AcceptedDepositsTable";
import { WithdrawalsTable } from "./_components/WithdrawalsTable";
import { Pagination } from "./_components/Pagination";
import { DateRangeFilter } from "./_components/DateRangeFilter";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function FinancialsPage({
  searchParams,
}: {
  searchParams: Promise<{
    deposits_page?: string;
    withdrawals_page?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const { deposits_page, withdrawals_page, from, to } = await searchParams;

  // Validate date params (expecting YYYY-MM-DD)
  const validFrom = from && DATE_RE.test(from) ? from : "";
  const validTo = to && DATE_RE.test(to) ? to : "";
  // Expand to UTC day boundaries so the "to" date is inclusive
  const dateFrom = validFrom ? `${validFrom}T00:00:00` : null;
  const dateTo = validTo ? `${validTo}T23:59:59` : null;
  const isFiltered = Boolean(validFrom || validTo);

  const depositsPageNum = Math.max(1, parseInt(deposits_page ?? "1", 10));
  const withdrawalsPageNum = Math.max(1, parseInt(withdrawals_page ?? "1", 10));

  const dFrom = (depositsPageNum - 1) * PAGE_SIZE;
  const dTo = dFrom + PAGE_SIZE - 1;
  const wFrom = (withdrawalsPageNum - 1) * PAGE_SIZE;
  const wTo = wFrom + PAGE_SIZE - 1;

  const supabase = createAdminClient();

  // --- Accepted deposits total (amount-only) ---
  let depositsSumQuery = supabase
    .from("package_subscription_requests")
    .select("amount_paid")
    .eq("status", "approved");
  if (dateFrom) depositsSumQuery = depositsSumQuery.gte("created_at", dateFrom);
  if (dateTo) depositsSumQuery = depositsSumQuery.lte("created_at", dateTo);

  // --- Paid withdrawals total (amount-only) ---
  let withdrawalsSumQuery = supabase
    .from("withdrawal_requests")
    .select("amount")
    .eq("status", "approved");
  if (dateFrom) withdrawalsSumQuery = withdrawalsSumQuery.gte("created_at", dateFrom);
  if (dateTo) withdrawalsSumQuery = withdrawalsSumQuery.lte("created_at", dateTo);

  // --- Accepted deposits — paginated ---
  let depositsPageQuery = supabase
    .from("package_subscription_requests")
    .select(
      "id, amount_paid, status, created_at, reviewed_at, users!package_subscription_requests_user_id_fkey(full_name, phone_number), packages(name)",
      { count: "exact" }
    )
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .range(dFrom, dTo);
  if (dateFrom) depositsPageQuery = depositsPageQuery.gte("created_at", dateFrom);
  if (dateTo) depositsPageQuery = depositsPageQuery.lte("created_at", dateTo);

  // --- Approved withdrawals — paginated ---
  let withdrawalsPageQuery = supabase
    .from("withdrawal_requests")
    .select(
      "id, amount, payment_details, status, created_at, reviewed_at, users!withdrawal_requests_user_id_fkey(full_name, phone_number)",
      { count: "exact" }
    )
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .range(wFrom, wTo);
  if (dateFrom) withdrawalsPageQuery = withdrawalsPageQuery.gte("created_at", dateFrom);
  if (dateTo) withdrawalsPageQuery = withdrawalsPageQuery.lte("created_at", dateTo);

  const [depositsSumRes, withdrawalsSumRes, depositsPageRes, withdrawalsPageRes] =
    await Promise.all([
      depositsSumQuery,
      withdrawalsSumQuery,
      depositsPageQuery,
      withdrawalsPageQuery,
    ]);

  if (depositsPageRes.error) {
    console.error("Accepted deposits query error:", depositsPageRes.error.message);
    throw new Error(`Deposits query failed: ${depositsPageRes.error.message}`);
  }
  if (withdrawalsPageRes.error) {
    console.error("Withdrawals query error:", withdrawalsPageRes.error.message);
    throw new Error(`Withdrawals query failed: ${withdrawalsPageRes.error.message}`);
  }

  const depositsTotal = (depositsSumRes.data ?? []).reduce(
    (sum, r) => sum + Number(r.amount_paid),
    0
  );
  const withdrawalsTotal = (withdrawalsSumRes.data ?? []).reduce(
    (sum, r) => sum + Number(r.amount),
    0
  );

  const depositsCount = depositsPageRes.count ?? 0;
  const withdrawalsCount = withdrawalsPageRes.count ?? 0;
  const depositsTotalPages = Math.ceil(depositsCount / PAGE_SIZE);
  const withdrawalsTotalPages = Math.ceil(withdrawalsCount / PAGE_SIZE);

  const deposits = (depositsPageRes.data ?? []).map((row) => {
    const user = row.users as unknown as
      | { full_name: string; phone_number: string }
      | null;
    const pkg = row.packages as unknown as { name: string } | null;
    return {
      id: row.id,
      amount: Number(row.amount_paid),
      created_at: row.created_at,
      reviewed_at: row.reviewed_at ?? row.created_at,
      full_name: user?.full_name ?? "غير متوفر",
      phone_number: user?.phone_number ?? "غير متوفر",
      package_name: pkg?.name ?? "غير متوفر",
    };
  });

  const withdrawals = (withdrawalsPageRes.data ?? []).map((row) => {
    const user = row.users as unknown as
      | { full_name: string; phone_number: string }
      | null;
    return {
      id: row.id,
      amount: Number(row.amount),
      payment_details: (row.payment_details as string | null) ?? "غير متوفر",
      status: row.status as "pending" | "approved" | "rejected",
      created_at: row.created_at,
      reviewed_at: row.reviewed_at ?? row.created_at,
      full_name: user?.full_name ?? "غير متوفر",
      phone_number: user?.phone_number ?? "غير متوفر",
    };
  });

  const fmt = (n: number) => `$${n.toFixed(2)}`;

  return (
    <div className="space-y-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">التتبع المالي</h1>
          {isFiltered && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-900 text-white text-xs font-bold">
              {validFrom || "البداية"} ← {validTo || "الآن"}
            </span>
          )}
        </div>
        <p className="text-slate-500 text-sm mt-1">
          ملخص شامل للإيداعات المقبولة والسحوبات على المنصة
        </p>
      </div>

      {/* Date Range Filter */}
      <DateRangeFilter initialFrom={validFrom} initialTo={validTo} />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <FinancialSummaryCard
          title="إجمالي الإيداعات المقبولة"
          value={fmt(depositsTotal)}
          icon={<Download className="w-5 h-5" strokeWidth={2} />}
          variant="success"
          description={`${depositsCount} عملية إيداع مقبولة`}
        />
        <FinancialSummaryCard
          title="إجمالي السحوبات"
          value={fmt(withdrawalsTotal)}
          icon={<Banknote className="w-5 h-5" strokeWidth={2} />}
          variant="warning"
          description={`${withdrawalsCount} عملية سحب — المجموع المسحوب بنجاح`}
        />
      </div>

      {/* Accepted Deposits */}
      <div>
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900">الإيداعات المقبولة</h2>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
              {depositsCount} عملية
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            جميع عمليات الإيداع التي تمت الموافقة عليها — تظهر الطريقة كباقة الاشتراك
          </p>
        </div>

        <AcceptedDepositsTable records={deposits} />

        <Pagination
          currentPage={depositsPageNum}
          totalPages={depositsTotalPages}
          basePath="/admin/financials"
          paramName="deposits_page"
          preserveParams={{
            withdrawals_page:
              withdrawalsPageNum > 1 ? String(withdrawalsPageNum) : undefined,
            from: validFrom || undefined,
            to: validTo || undefined,
          }}
        />
      </div>

      {/* Withdrawals */}
      <div>
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900">السحوبات</h2>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
              {withdrawalsCount} عملية
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            جميع طلبات السحب المقبولة — تظهر طريقة الدفع كمحفظة الاستلام
          </p>
        </div>

        <WithdrawalsTable records={withdrawals} />

        <Pagination
          currentPage={withdrawalsPageNum}
          totalPages={withdrawalsTotalPages}
          basePath="/admin/financials"
          paramName="withdrawals_page"
          preserveParams={{
            deposits_page:
              depositsPageNum > 1 ? String(depositsPageNum) : undefined,
            from: validFrom || undefined,
            to: validTo || undefined,
          }}
        />
      </div>
    </div>
  );
}
