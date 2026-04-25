import type { ProfitShareRequestStatus } from "@/lib/db/equity";

const statusClasses: Record<ProfitShareRequestStatus, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  accepted: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

const statusLabels: Record<ProfitShareRequestStatus, string> = {
  pending: "قيد المراجعة",
  accepted: "مقبول",
  rejected: "مرفوض",
};

export function RequestStatusBadge({
  status,
}: {
  status: ProfitShareRequestStatus;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusClasses[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}
