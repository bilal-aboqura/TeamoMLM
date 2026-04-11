"use client";

import { useState } from "react";
import {
  Package,
  TrendingUp,
  Receipt,
  Lock,
  CreditCard,
  Info,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Calendar,
  DollarSign,
  ListChecks,
  X,
} from "lucide-react";

function Toast({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 bg-rose-600 text-white px-5 py-3.5 rounded-2xl shadow-[0_8px_30px_rgba(225,29,72,0.3)] text-sm font-medium animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-md">
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="shrink-0 p-1 hover:bg-rose-500 rounded-lg transition-colors">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function Accordion({
  title,
  icon,
  color,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 text-start hover:bg-slate-50/50 transition-colors"
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
          {icon}
        </div>
        <span className="text-sm font-bold text-slate-900 flex-1">{title}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-5 pb-5 pt-0 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="border-t border-slate-100 pt-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PayLaterPage() {
  const [toast, setToast] = useState<string | null>(null);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* ── Header ── */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">ترقية الباقة والدفع لاحقاً</h1>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
          ارفع باقتك الآن وادفع بعدين. السماح للمستخدم بترقية باقته فوراً، والحصول على أرباح الباقة الجديدة مباشرة، مع تأجيل دفع قيمة الترقية لمدة تصل إلى 30 يوم.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700 font-medium leading-relaxed">
            تُفعل هذه الميزة فقط إذا مر على المستخدم 30 إلى 40 يوم عمل أو حسب تقييم النشاط.
          </p>
        </div>
      </div>

      {/* ── Upgrade Comparison ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Current Package */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-5">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <Package className="w-4 h-4 text-slate-500" />
            </div>
            <span className="text-sm font-bold text-slate-900">الباقة الحالية</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <span className="text-xs text-slate-500">اسم الباقة</span>
              <span className="text-sm font-bold text-slate-900">A1</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <span className="text-xs text-slate-500">الأرباح اليومية</span>
              <span className="text-sm font-bold text-slate-900" dir="ltr">3.33 دولار</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-slate-500">عدد المهام اليومية</span>
              <span className="text-sm font-bold text-slate-900">3</span>
            </div>
          </div>
        </div>

        {/* Proposed Package */}
        <div className="bg-white rounded-2xl border-2 border-emerald-200 shadow-[0_4px_20px_rgba(5,150,105,0.06)] p-5 relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600" />

          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-sm font-bold text-slate-900">الباقة الجديدة المقترحة</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <span className="text-xs text-slate-500">اسم الباقة</span>
              <span className="text-sm font-bold text-emerald-700">A2</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <span className="text-xs text-slate-500">الأرباح اليومية</span>
              <span className="text-sm font-bold text-emerald-700" dir="ltr">6.66 دولار</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-50">
              <span className="text-xs text-slate-500">عدد المهام اليومية</span>
              <span className="text-sm font-bold text-slate-900">3</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-slate-500">قيمة الترقية</span>
              <span className="text-sm font-black text-emerald-600" dir="ltr">200 دولار</span>
            </div>
          </div>

          <button
            onClick={() => setToast("هذه الميزة غير متاحة لحسابك حالياً. تتطلب مرور 30 يوماً من النشاط المستمر.")}
            className="mt-5 w-full bg-emerald-600 text-white rounded-xl py-3 text-sm font-bold hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-[0_4px_14px_rgba(5,150,105,0.25)]"
          >
            ترقية الآن والدفع لاحقاً
          </button>
        </div>
      </div>

      {/* ── Debt & Locked Profits ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Debt Info */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-5">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-rose-500" />
            </div>
            <span className="text-sm font-bold text-slate-900">معلومات الدين</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 py-2 border-b border-slate-50">
              <DollarSign className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-xs text-slate-500 flex-1">المبلغ المستحق</span>
              <span className="text-sm font-bold text-rose-600" dir="ltr">200 دولار</span>
            </div>
            <div className="flex items-center gap-3 py-2 border-b border-slate-50">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-xs text-slate-500 flex-1">تاريخ الترقية</span>
              <span className="text-sm font-bold text-slate-900" dir="ltr">2026-04-10</span>
            </div>
            <div className="flex items-center gap-3 py-2 border-b border-slate-50">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-xs text-slate-500 flex-1">تاريخ آخر موعد للسداد</span>
              <span className="text-sm font-bold text-slate-900" dir="ltr">2026-05-10</span>
            </div>
            <div className="flex items-center gap-3 py-2">
              <ListChecks className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-xs text-slate-500 flex-1">المدة المتبقية</span>
              <span className="text-sm font-bold text-amber-600">30 يوم</span>
            </div>
          </div>
        </div>

        {/* Locked Profits */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-5">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <Lock className="w-4 h-4 text-amber-500" />
            </div>
            <span className="text-sm font-bold text-slate-900">الأرباح المحفوظة</span>
          </div>

          <div className="text-center py-4">
            <p className="text-3xl font-black text-slate-300" dir="ltr">0 دولار</p>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 rounded-xl p-3 border border-slate-100">
            هذه الأرباح لا يمكن سحبها حتى يتم تسديد الدين (يتم سحب أرباح الباقة القديمة فقط).
          </p>
        </div>
      </div>

      {/* ── Rules & Policies ── */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">القواعد والسياسات</h2>

        <div className="space-y-3">
          <Accordion
            title="قواعد السداد"
            icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
            color="bg-emerald-50"
          >
            <ul className="space-y-3 text-sm text-slate-600 leading-relaxed">
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-800">مدة السداد:</span> يجب الدفع خلال 30 يوم كحد أقصى.
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-800">الدفع المبكر:</span> يمكن الدفع قبل 30 يوم. بمجرد الدفع يتم فتح الأرباح المحفوظة وإلغاء الدين.
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-800">رسوم التسديد (العمولة):</span> تحدد حسب نشاط المستخدم وعدد الإحالات (قد تكون 0% أو 5% أو 10%).
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-800">قيود الترقية:</span> الترقية مرة واحدة فقط في الشهر ولا يمكن الترقية مرة ثانية قبل تسديد الدين.
                </div>
              </li>
            </ul>
          </Accordion>

          <Accordion
            title="إجراءات عدم السداد (بعد 30 يوم)"
            icon={<AlertTriangle className="w-4 h-4 text-rose-500" />}
            color="bg-rose-50"
          >
            <ul className="space-y-3 text-sm text-slate-600 leading-relaxed">
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-2 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-800">تجميد الحساب:</span> إيقاف تنفيذ المهام واستلام الأرباح.
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-2 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-800">إيقاف السحب:</span> إيقاف جميع طلبات السحب.
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-2 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-800">خصم الأرباح المحفوظة:</span> تُخصم تلقائياً لتسديد جزء من الدين.
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-2 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-800">غرامة مالية:</span> تفرض غرامة إضافية تحددها الإدارة.
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-2 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-800">حالة الحساب:</span> يظل مجمداً حتى تسديد الدين الأساسي والغرامة.
                </div>
              </li>
            </ul>
          </Accordion>

          <Accordion
            title="ماذا يحدث بعد السداد"
            icon={<CheckCircle2 className="w-4 h-4 text-blue-500" />}
            color="bg-blue-50"
          >
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
              <p className="text-sm text-slate-700 leading-relaxed">
                يتم تلقائياً: إلغاء التجميد، إعادة تفعيل الحساب، السماح بالسحب، وفتح الأرباح المحفوظة.
              </p>
            </div>
          </Accordion>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
