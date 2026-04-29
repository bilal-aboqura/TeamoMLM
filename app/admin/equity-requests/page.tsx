import { getAllProfitShareRequests } from "@/lib/db/admin-equity";
import { getEquityProgress } from "@/lib/db/equity";
import { AdminRequestsTable } from "./_components/AdminRequestsTable";
import { EquitySettingsPanel } from "./_components/EquitySettingsPanel";

export const dynamic = "force-dynamic";

export default async function EquityRequestsPage() {
  const [requests, progress] = await Promise.all([
    getAllProfitShareRequests(),
    getEquityProgress(),
  ]);
  const pendingCount = requests.filter(
    (request) => request.status === "pending"
  ).length;

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">
            طلبات حصص الأرباح
          </h1>
          {pendingCount > 0 ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
              {pendingCount} معلق
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-slate-500">
          مراجعة إيصالات شراء حصص الأرباح وقبول أو رفض الطلبات المعلقة.
        </p>
      </header>

      <EquitySettingsPanel
        manualSoldEquity={progress.manualSoldEquity}
        acceptedSoldEquity={progress.acceptedSoldEquity}
        remainingEquity={progress.remainingEquity}
      />

      <AdminRequestsTable requests={requests} />
    </div>
  );
}
