import type { TaskCompletionLogEntry } from "../data";
import { CheckSquare } from "lucide-react";

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

export function TaskLogList({
  logs,
}: {
  logs: TaskCompletionLogEntry[];
}) {
  if (logs.length === 0) {
    return (
      <p className="text-center text-slate-500 py-8">
        لم تُكمل أي مهام بعد
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div
          key={log.id}
          className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-start gap-4 transition-colors hover:bg-slate-50/50"
        >
          <div className="bg-blue-50 text-blue-600 p-2.5 rounded-xl shrink-0">
            <CheckSquare className="w-5 h-5" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-900 truncate">
                {log.task_title}
              </span>
              <StatusBadge status={log.status} />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span dir="ltr" className="text-emerald-600 font-bold">
                +${log.reward_amount_snapshot.toFixed(4)}
              </span>
              <span className="text-slate-400 text-xs font-medium">
                {new Date(log.completion_date).toLocaleDateString("ar-EG")}
              </span>
            </div>
            {log.rejection_reason && (
              <p className="text-red-500 text-xs font-medium mt-2">
                {log.rejection_reason}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
