import type { PackageSubscriptionRequest } from "../data";
import { PackageOpen } from "lucide-react";
import { LocalDate } from "@/components/ui/LocalDate";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-50 text-yellow-700",
    approved: "bg-emerald-50 text-emerald-700",
    rejected: "bg-red-50 text-red-700",
  };

  const labels: Record<string, string> = {
    pending: "قيد المراجعة",
    approved: "تم القبول",
    rejected: "مرفوض",
  };

  return (
    <span
      role="status"
      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${styles[status] ?? "bg-slate-100 text-slate-600"}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

export function SubscriptionRequestList({
  requests,
}: {
  requests: PackageSubscriptionRequest[];
}) {
  if (requests.length === 0) {
    return (
      <p className="text-center text-slate-500 py-8">
        لم تقدم أي طلبات اشتراك بعد
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => (
        <div
          key={req.id}
          className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-start gap-4 transition-colors hover:bg-slate-50/50"
        >
          <div className="bg-purple-50 text-purple-600 p-2.5 rounded-xl shrink-0">
            <PackageOpen className="w-5 h-5" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-900 truncate">
                {req.package_name}
              </span>
              <StatusBadge status={req.status} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-slate-600">
                <span dir="ltr">${req.amount_paid.toFixed(2)}</span>
              </span>
              <LocalDate iso={req.created_at} className="text-slate-400 text-xs font-medium" />
            </div>
            {req.rejection_reason && (
              <p className="text-red-500 text-xs font-medium mt-2">
                {req.rejection_reason}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
