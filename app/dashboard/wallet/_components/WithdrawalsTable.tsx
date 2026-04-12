import { ArrowDownLeft } from "lucide-react";
import { LocalDate } from "@/components/ui/LocalDate";

type WithdrawalRow = {
  id: string;
  amount: number;
  payment_details: string;
  status: string;
  rejection_reason: string | null;
  created_at: string;
};

function StatusPill({ status }: { status: string }) {
  switch (status) {
    case "pending":
      return (
        <span className="bg-amber-50 text-amber-600 rounded-full px-2.5 py-1 text-xs font-semibold">
          قيد المراجعة
        </span>
      );
    case "approved":
      return (
        <span className="bg-emerald-50 text-emerald-600 rounded-full px-2.5 py-1 text-xs font-semibold">
          مكتمل
        </span>
      );
    case "rejected":
      return (
        <span className="bg-rose-50 text-rose-600 rounded-full px-2.5 py-1 text-xs font-semibold">
          مرفوض
        </span>
      );
    default:
      return null;
  }
}

export function WithdrawalsTable({ requests }: { requests: WithdrawalRow[] }) {
  if (requests.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-center">
        <p className="text-slate-400 font-medium tracking-wide">لا توجد عمليات سحب حتى الآن</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-slate-900 px-2">أحدث العمليات</h3>
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="divide-y divide-slate-50">
          {requests.map((req) => (
            <div key={req.id} className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center shrink-0">
                  <ArrowDownLeft className="w-5 h-5 text-rose-500" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-base">سحب أرباح</p>
                  <p className="text-xs text-slate-400 mt-1"><LocalDate iso={req.created_at} /> • {req.payment_details}</p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2">
                <div className="text-start sm:text-end">
                  <span className="font-bold text-slate-900 text-lg" dir="ltr">
                    -${Number(req.amount).toFixed(2)}
                  </span>
                </div>
                <div className="flex flex-col items-start sm:items-end gap-1">
                  <StatusPill status={req.status} />
                  {req.status === "rejected" && req.rejection_reason && (
                    <span className="text-[10px] text-slate-400 max-w-[200px] truncate" title={req.rejection_reason}>
                      {req.rejection_reason}
                    </span>
                  )}
                </div>
              </div>
              
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
