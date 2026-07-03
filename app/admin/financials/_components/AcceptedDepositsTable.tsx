import { LocalDate, LocalDateTime } from "@/components/ui/LocalDate";

type DepositRecord = {
  id: string;
  amount: number;
  created_at: string;
  reviewed_at: string;
  full_name: string;
  phone_number: string;
  package_name: string;
};

export function AcceptedDepositsTable({ records }: { records: DepositRecord[] }) {
  if (records.length === 0) {
    return (
      <div className="bg-slate-50 rounded-xl p-14 text-center border border-slate-100">
        <p className="text-slate-500 text-sm">لا توجد إيداعات مقبولة بعد</p>
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
                المبلغ
              </th>
              <th className="text-start px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                الطريقة
              </th>
              <th className="text-start px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                الحالة
              </th>
              <th className="text-start px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">
                التاريخ
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

                {/* Amount */}
                <td className="px-4 py-4">
                  <span className="text-sm font-bold text-slate-900" dir="ltr">
                    ${rec.amount.toFixed(2)}
                  </span>
                </td>

                {/* Method — the subscription package the deposit is for */}
                <td className="px-4 py-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold">
                    {rec.package_name}
                  </span>
                </td>

                {/* Status */}
                <td className="px-4 py-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    مقبول
                  </span>
                </td>

                {/* Date */}
                <td className="px-4 py-4 hidden md:table-cell">
                  <div className="flex flex-col gap-0.5">
                    <LocalDate iso={rec.created_at} className="text-xs text-slate-900 font-medium" />
                    <LocalDateTime iso={rec.created_at} options={{ hour: "2-digit", minute: "2-digit" }} className="text-[10px] text-slate-400" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between">
        <p className="text-xs text-slate-400">{records.length} سجل في هذه الصفحة</p>
        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          مقبول: {records.length}
        </span>
      </div>
    </div>
  );
}
