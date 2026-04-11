import type { PackageWithStatus, PaymentSetting } from "../data";
import { PurchaseInline } from "./PurchaseInline";
import { Check, Clock, TrendingUp, ListTodo, Coins, Lock } from "lucide-react";

export function PackageCard({
  pkg,
  paymentSetting,
}: {
  pkg: PackageWithStatus;
  paymentSetting: PaymentSetting;
}) {
  const perTaskReward = pkg.daily_profit / pkg.daily_task_count;
  const isActive = pkg.userStatus === "active";
  const isPending = pkg.userStatus === "pending";

  return (
    <div
      className={`relative w-full flex flex-col bg-white rounded-3xl border transition-all duration-500 ease-out hover:-translate-y-2 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] overflow-hidden ${
        isActive
          ? "border-emerald-500 shadow-[0_8px_30px_rgba(16,185,129,0.12)]"
          : "border-slate-200/60 shadow-sm"
      }`}
    >
      {/* Decorative Top Gradient Line for active packages */}
      {isActive && (
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-400 to-emerald-600" />
      )}

      {/* Header Section */}
      <div className="p-6 md:p-8 pb-6 border-b border-slate-100/80 bg-slate-50/50 flex flex-col items-center text-center">
        <div className="mb-4">
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">{pkg.name}</h3>
        </div>

        <div className="flex items-end justify-center gap-1.5">
          <span className="text-4xl font-extrabold text-slate-900" dir="ltr">
            ${pkg.price.toFixed(2)}
          </span>
          <span className="text-sm font-medium text-slate-500 mb-1">/ اشتراك</span>
        </div>

        {isActive && (
          <div className="mt-4">
            <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 rounded-full px-4 py-1.5 text-xs font-bold border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              باقتي الحالية
            </span>
          </div>
        )}
      </div>

      {/* Body / Features */}
      <div className="p-6 md:p-8 flex-1 flex flex-col">
        <ul className="space-y-4 mb-8 flex-1">
          <li className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-50 rounded-lg p-2 text-emerald-600 shrink-0">
                <TrendingUp className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-bold text-slate-700">الربح اليومي المقدر</span>
            </div>
            <span className="text-sm font-bold text-emerald-600" dir="ltr">+${pkg.daily_profit.toFixed(2)}</span>
          </li>
          
          <li className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 rounded-lg p-2 text-blue-600 shrink-0">
                <ListTodo className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-bold text-slate-700">عدد المهام اليومية</span>
            </div>
            <span className="text-sm font-bold text-slate-900">{pkg.daily_task_count}</span>
          </li>

          <li className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-amber-50 rounded-lg p-2 text-amber-600 shrink-0">
                <Coins className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <span className="text-sm font-bold text-slate-700">مكافأة كل مهمة</span>
            </div>
            <span className="text-sm font-bold text-slate-900" dir="ltr">+${perTaskReward.toFixed(4)}</span>
          </li>
        </ul>

        <div className="inline-flex items-center justify-center gap-2 bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 mb-6 relative overflow-hidden group">
           <Lock className="w-4 h-4 text-slate-400 shrink-0 relative z-10" />
           <span className="text-[13px] font-semibold text-slate-600 relative z-10">القيمة تُحتجز كوديعة لمدة سنة</span>
           <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="mt-auto">
          {isActive || isPending ? (
            <div className={`w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-center text-sm font-bold transition-all ${
              isActive 
                ? "bg-slate-900 border border-slate-900 text-white shadow-[0_4px_14px_0_rgba(15,23,42,0.39)] cursor-default" 
                : "bg-amber-50 border border-amber-200 text-amber-600 cursor-wait"
            }`}>
              {isActive ? (
                <>
                  <Check className="w-4 h-4" /> باقتك الحالية نشطة
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4" /> الطلب قيد المراجعة ...
                </>
              )}
            </div>
          ) : (
            <PurchaseInline
              pkg={pkg}
              paymentSetting={paymentSetting}
            />
          )}
        </div>
      </div>
    </div>
  );
}
