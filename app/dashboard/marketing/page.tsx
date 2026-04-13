import React from "react";
import { Briefcase, Network, Award } from "lucide-react";

export default function MarketingPage() {
  const PACKAGES = [
    { name: "A1", price: 200, tasks: 3, taskValue: 1.11, daily: 3.33 },
    { name: "A2", price: 400, tasks: 3, taskValue: 2.22, daily: 6.66 },
    { name: "A3", price: 600, tasks: 3, taskValue: 3.33, daily: 10.00 },
    { name: "B1", price: 1200, tasks: 4, taskValue: 5.00, daily: 20.00 },
    { name: "B2", price: 1800, tasks: 4, taskValue: 7.50, daily: 30.00 },
    { name: "B3", price: 2500, tasks: 4, taskValue: 10.41, daily: 41.66 },
  ];

  const MATRIX = [
    { plan: "A1", l1: 35, l2: 17, l3: 12, l4: 8, l5: 5, l6: 5 },
    { plan: "A2", l1: 60, l2: 25, l3: 17, l4: 12, l5: 5, l6: 5 },
    { plan: "A3", l1: 90, l2: 35, l3: 21, l4: 14, l5: 5, l6: 5 },
    { plan: "B1", l1: 140, l2: 85, l3: 35, l4: 20, l5: 9, l6: 9 },
    { plan: "B2", l1: 220, l2: 125, l3: 90, l4: 30, l5: 15, l6: 15 },
    { plan: "B3", l1: 350, l2: 175, l3: 100, l4: 32, l5: 18, l6: 18 },
  ];

  const LEADERSHIP = [
    {
      level: 1,
      req: "4 أعضاء مباشرين من الجيل الأول (L1).",
      bonus: 20,
      salary: 10,
    },
    {
      level: 2,
      req: "عدد 2 قادة مستوى أول (Level 1) أو 10 أعضاء من (L1 - L3).",
      bonus: 45,
      salary: 20,
    },
    {
      level: 3,
      req: "25 عضواً من الأجيال (L1 - L4) أو امتلاك باقة A2.",
      bonus: 70,
      salary: 35,
    },
    {
      level: 4,
      req: "عدد 3 قادة مستوى ثالث أو 42 عضواً من الأجيال (L1 - L3).",
      bonus: 130,
      salary: 70,
    },
    {
      level: 5,
      req: "عدد 2 قادة مستوى رابع أو 85 عضواً من الأجيال (L1 - L3).",
      bonus: 250,
      salary: 130,
    },
    {
      level: 6,
      req: "عدد 2 قادة مستوى خامس أو 150 عضواً من الأجيال (L1 - L4).",
      bonus: 500,
      salary: 300,
    },
  ];

  return (
    <div
      className="w-full bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
      dir="rtl"
    >
      <div className="max-w-6xl mx-auto space-y-16">
        {/* Header Section */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">
            التسويق والمعلومات
          </h1>
          <p className="text-slate-500 leading-relaxed text-sm md:text-base max-w-2xl">
            الدليل الشامل للباقات المتوفرة، نظام عمولات الإحالة الشبكي، والشروط والمتطلبات الخاصة بمراتب القادة.
          </p>
        </div>

        {/* Section 1: Plans and Daily Profits */}
        <section className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              الباقات والأرباح اليومية
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {PACKAGES.map((pkg) => (
              <div
                key={pkg.name}
                className="bg-white border border-slate-200 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/30 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] group"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                    باقة {pkg.name}
                  </h3>
                  <span className="bg-slate-50 border border-slate-200 text-slate-700 py-1.5 px-3 rounded-lg font-bold text-sm">
                    ${pkg.price}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <span className="text-slate-500 text-sm">المهام اليومية</span>
                    <span className="text-slate-900 font-semibold">{pkg.tasks} مهام</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <span className="text-slate-500 text-sm">قيمة المهمة</span>
                    <span className="text-emerald-600 font-semibold">
                      ${pkg.taskValue}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-500 text-sm mt-1">الربح اليومي</span>
                    <span className="text-emerald-600 font-bold text-xl">
                      ${pkg.daily}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Referral Commission Matrix */}
        <section className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center justify-center">
              <Network className="w-6 h-6 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              مصفوفة عمولات الإحالة
            </h2>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <div className="overflow-x-auto">
              <table className="w-full text-start min-w-[800px]">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="py-5 px-6 text-start text-sm font-semibold text-slate-500">
                      الباقة
                    </th>
                    <th className="py-5 px-6 text-start text-sm font-semibold text-slate-500">
                      الجيل الأول (L1)
                    </th>
                    <th className="py-5 px-6 text-start text-sm font-semibold text-slate-500">
                      الجيل الثاني (L2)
                    </th>
                    <th className="py-5 px-6 text-start text-sm font-semibold text-slate-500">
                      الجيل الثالث (L3)
                    </th>
                    <th className="py-5 px-6 text-start text-sm font-semibold text-slate-500">
                      الجيل الرابع (L4)
                    </th>
                    <th className="py-5 px-6 text-start text-sm font-semibold text-slate-500">
                      الجيل الخامس (L5)
                    </th>
                    <th className="py-5 px-6 text-start text-sm font-semibold text-slate-500">
                      الجيل السادس (L6)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {MATRIX.map((row) => (
                    <tr
                      key={row.plan}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-4 px-6 text-slate-900 font-bold">{row.plan}</td>
                      <td className="py-4 px-6 text-emerald-600 font-medium">
                        ${row.l1}
                      </td>
                      <td className="py-4 px-6 text-emerald-600 font-medium">
                        ${row.l2}
                      </td>
                      <td className="py-4 px-6 text-emerald-600 font-medium">
                        ${row.l3}
                      </td>
                      <td className="py-4 px-6 text-emerald-600 font-medium">
                        ${row.l4}
                      </td>
                      <td className="py-4 px-6 text-emerald-600 font-medium">
                        ${row.l5}
                      </td>
                      <td className="py-4 px-6 text-emerald-600 font-medium">
                        ${row.l6}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Section 3: Leadership Ranks */}
        <section className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center justify-center">
              <Award className="w-6 h-6 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              مراتب القادة: الشروط والرواتب
            </h2>
          </div>

          <div className="space-y-4">
            {LEADERSHIP.map((item) => (
              <div
                key={item.level}
                className="bg-white border border-slate-200 rounded-2xl p-6 transition-all duration-300 hover:border-emerald-500/30 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col lg:flex-row lg:items-center gap-6 group"
              >
                {/* Requirements */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="bg-slate-50 text-slate-600 py-1 px-3 rounded-lg text-xs font-bold uppercase tracking-wider border border-slate-200">
                      مستوى {item.level}
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                      قائد مستوى {item.level}
                    </h3>
                  </div>
                  <p className="text-slate-500 text-sm md:text-base leading-relaxed max-w-2xl">
                    {item.req}
                  </p>
                </div>

                {/* Rewards */}
                <div className="flex items-center gap-4 lg:min-w-[340px] pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-s border-slate-100 lg:ps-6">
                  <div className="flex-1 bg-slate-50 p-4 rounded-xl border border-slate-200 text-center flex flex-col justify-center items-center">
                    <span className="block text-xs text-slate-500 mb-1.5">
                      مكافأة الترقية
                    </span>
                    <span className="block text-2xl font-bold text-slate-900">
                      ${item.bonus}
                    </span>
                  </div>
                  <div className="flex-1 bg-emerald-50 p-4 rounded-xl border border-emerald-100/60 text-center flex flex-col justify-center items-center shadow-[0_2px_10px_rgba(16,185,129,0.05)]">
                    <span className="block text-xs text-emerald-600/80 mb-1.5">
                      الراتب (كل 15 يوم)
                    </span>
                    <span className="block text-2xl font-bold text-emerald-600">
                      ${item.salary}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
