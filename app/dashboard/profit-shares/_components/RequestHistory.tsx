import { LocalDate } from "@/components/ui/LocalDate";
import type { ProfitShareRequest } from "@/lib/db/equity";
import { RequestStatusBadge } from "./RequestStatusBadge";

export function RequestHistory({
  requests,
}: {
  requests: ProfitShareRequest[];
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">طلباتي</h2>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
          {requests.length} طلب
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
        {requests.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="font-bold text-slate-700">لا توجد طلبات بعد</p>
            <p className="mt-1 text-sm text-slate-400">
              طلبات شراء الأسهم ستظهر هنا بعد إرسالها.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-start text-xs font-bold text-slate-500">
                    الحصة
                  </th>
                  <th className="px-5 py-3 text-start text-xs font-bold text-slate-500">
                    السعر
                  </th>
                  <th className="px-5 py-3 text-start text-xs font-bold text-slate-500">
                    كود الإحالة
                  </th>
                  <th className="px-5 py-3 text-start text-xs font-bold text-slate-500">
                    الحالة
                  </th>
                  <th className="px-5 py-3 text-start text-xs font-bold text-slate-500">
                    التاريخ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td className="px-5 py-4 text-sm font-bold text-slate-900" dir="ltr">
                      {request.percentage}%
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700" dir="ltr">
                      ${request.price_usd.toLocaleString("en-US")}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500" dir="ltr">
                      {request.sponsor_referral_code}
                    </td>
                    <td className="px-5 py-4">
                      <RequestStatusBadge status={request.status} />
                    </td>
                    <td className="px-5 py-4">
                      <LocalDate
                        iso={request.created_at}
                        className="text-sm text-slate-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
