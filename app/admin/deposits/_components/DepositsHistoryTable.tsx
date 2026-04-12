import { LocalDate, LocalDateTime } from "@/components/ui/LocalDate";

type HistoryRecord = {
  id: string;
  amount_paid: number;
  status: "approved" | "rejected";
  created_at: string;
  reviewed_at: string;
  rejection_reason: string | null;
  full_name: string;
  phone_number: string;
  package_name: string;
};

export function DepositsHistoryTable({ records }: { records: HistoryRecord[] }) {
  if (records.length === 0) {
    return (
      <div className="bg-slate-50 rounded-xl p-14 text-center border border-slate-100">
        <p className="text-slate-500 text-sm">لا يوجد سجلات إيداعات بعد</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-start">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="text-start ps-5 pe-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                المستخدم
              </th>
              <th className="text-start px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">
                الهاتف
              </th>
              <th className="text-start px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                الباقة
              </th>
              <th className="text-start px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                المبلغ
              </th>
              <th className="text-start px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                الحالة
              </th>
              <th className="text-start px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">
                تاريخ الطلب
              </th>
              <th className="text-start px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">
                سبب الرفض
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.map((rec) => (
              <tr
                key={rec.id}
                className="hover:bg-slate-50/50 transition-colors duration-150"
              >
                {/* User */}
                <td className="ps-5 pe-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shrink-0">
                      <span className="text-xs font-semibold text-slate-600">
                        {rec.full_name.charAt(0)}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-slate-900">
                      {rec.full_name}
                    </span>
                  </div>
                </td>

                {/* Phone */}
                <td className="px-4 py-4 hidden sm:table-cell">
                  <span className="text-sm text-slate-500 font-mono" dir="ltr">
                    {rec.phone_number}
                  </span>
                </td>

                {/* Package */}
                <td className="px-4 py-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold">
                    {rec.package_name}
                  </span>
                </td>

                {/* Amount */}
                <td className="px-4 py-4">
                  <span className="text-sm font-bold text-slate-900" dir="ltr">
                    ${rec.amount_paid.toFixed(2)}
                  </span>
                </td>

                {/* Status */}
                <td className="px-4 py-4">
                  {rec.status === "approved" ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      مقبول
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold border border-red-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                      مرفوض
                    </span>
                  )}
                </td>

                {/* Date */}
                <td className="px-4 py-4 hidden md:table-cell">
                  <div className="flex flex-col gap-0.5">
                    <LocalDate iso={rec.created_at} className="text-xs text-slate-900 font-medium" />
                    <LocalDateTime iso={rec.created_at} options={{ hour: "2-digit", minute: "2-digit" }} className="text-[10px] text-slate-400" />
                  </div>
                </td>

                {/* Rejection reason */}
                <td className="px-4 py-4 hidden lg:table-cell">
                  {rec.rejection_reason ? (
                    <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-lg max-w-[180px] truncate block">
                      {rec.rejection_reason}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between">
        <p className="text-xs text-slate-400">{records.length} سجل</p>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            مقبول: {records.filter((r) => r.status === "approved").length}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-red-600">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            مرفوض: {records.filter((r) => r.status === "rejected").length}
          </span>
        </div>
      </div>
    </div>
  );
}
