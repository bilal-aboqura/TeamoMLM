import { createAdminClient } from "@/lib/supabase/admin";
import { SalariesDashboard } from "./_components/SalariesDashboard";
import { LocalDate } from "@/components/ui/LocalDate";

const RANK_FINANCIALS = [
  { level: 1, label: "قائد 1", reward: 20, salary: 10 },
  { level: 2, label: "قائد 2", reward: 45, salary: 20 },
  { level: 3, label: "قائد 3", reward: 70, salary: 35 },
  { level: 4, label: "قائد 4", reward: 130, salary: 70 },
  { level: 5, label: "قائد 5", reward: 250, salary: 130 },
  { level: 6, label: "قائد 6", reward: 500, salary: 300 },
];

export default async function SalariesPage() {
  const supabase = createAdminClient();

  const { data: leaders } = await supabase
    .from("users")
    .select("id, full_name, leadership_level, last_salary_paid_at, wallet_balance")
    .not("leadership_level", "is", null)
    .gt("leadership_level", 0)
    .order("leadership_level", { ascending: false });

  const leadersByLevel = (leaders ?? []).reduce(
    (acc, u) => {
      const lvl = u.leadership_level as number;
      acc[lvl] = (acc[lvl] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">رواتب القادة</h1>
        <p className="text-slate-500 text-sm mt-1">
          تقييم الترقيات وتوزيع المكافآت والرواتب لرتب القيادة
        </p>
      </div>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-slate-900 mb-4">
          جدول الرواتب والمكافآت
        </h2>
        <div className="bg-slate-50 rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100/70">
                  <th className="text-start px-4 py-3 text-xs font-semibold text-slate-500 uppercase">
                    الرتبة
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">
                    عدد القادة
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">
                    مكافأة الترقية
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">
                    الراتب (كل 15 يوم)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/50">
                {RANK_FINANCIALS.map((r) => (
                  <tr key={r.level} className="hover:bg-white/50">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-[11px] font-semibold border border-amber-100">
                        {r.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
                        {leadersByLevel[r.level] ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span dir="ltr" className="text-emerald-600 font-bold">
                        ${r.reward.toFixed(0)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span dir="ltr" className="text-blue-600 font-bold">
                        ${r.salary.toFixed(0)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <SalariesDashboard />
      </section>

      {(leaders && leaders.length > 0) && (
        <section>
          <h2 className="text-base font-semibold text-slate-900 mb-4">
            القادة الحاليون
          </h2>
          <div className="bg-slate-50 rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden p-2 sm:p-4">
            <div className="overflow-x-auto pb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100/50">
                    <th className="text-start px-4 py-3 text-xs font-semibold text-slate-500 uppercase">
                      القائد
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">
                      الرتبة
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">
                      الرصيد
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">
                      آخر راتب
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/50">
                  {(leaders ?? []).map((leader) => (
                    <tr key={leader.id} className="hover:bg-slate-100/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center shrink-0">
                            <span className="text-xs font-semibold text-amber-700">
                              {(leader.full_name as string).charAt(0)}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-slate-900">
                            {leader.full_name as string}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-[11px] font-semibold border border-amber-100">
                          قائد {leader.leadership_level as number}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span dir="ltr" className="text-sm font-bold text-slate-900">
                          ${Number(leader.wallet_balance).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {leader.last_salary_paid_at ? (
                          <LocalDate iso={leader.last_salary_paid_at as string} className="text-xs text-slate-500" />
                        ) : (
                          <span className="text-xs text-slate-400 italic">غير متوفر</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
