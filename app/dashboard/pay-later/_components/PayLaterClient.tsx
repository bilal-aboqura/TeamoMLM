"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  DollarSign,
  Info,
  ListChecks,
  Lock,
  Package,
  Receipt,
  TrendingUp,
  Upload,
  X,
} from "lucide-react";
import type { PayLaterDashboardData } from "../data";
import {
  activatePayLater,
  repayPayLaterFromWallet,
  submitPayLaterReceipt,
} from "../actions";

function money(value: number) {
  return `${value.toFixed(2)} دولار`;
}

function daysRemaining(dueAt: string) {
  const diff = new Date(dueAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}) {
  return (
    <div
      className={`fixed bottom-6 left-1/2 z-[60] flex max-w-md -translate-x-1/2 items-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-medium text-white shadow-[0_8px_30px_rgba(15,23,42,0.18)] ${
        type === "success" ? "bg-emerald-600" : "bg-rose-600"
      }`}
    >
      {type === "success" ? (
        <CheckCircle2 className="h-4 w-4 shrink-0" />
      ) : (
        <AlertTriangle className="h-4 w-4 shrink-0" />
      )}
      <span className="flex-1">{message}</span>
      <button
        onClick={onClose}
        className="shrink-0 rounded-lg p-1 transition-colors hover:bg-white/15"
        aria-label="إغلاق"
      >
        <X className="h-3.5 w-3.5" />
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
  icon: ReactNode;
  color: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
      <button
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 px-5 py-4 text-start transition-colors hover:bg-slate-50/50"
      >
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${color}`}
        >
          {icon}
        </div>
        <span className="flex-1 text-sm font-bold text-slate-900">
          {title}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 pt-0">
          <div className="border-t border-slate-100 pt-4">{children}</div>
        </div>
      )}
    </div>
  );
}

function StatRow({
  label,
  value,
  icon,
  tone = "slate",
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  tone?: "slate" | "emerald" | "rose" | "amber";
}) {
  const toneClass = {
    slate: "text-slate-900",
    emerald: "text-emerald-700",
    rose: "text-rose-600",
    amber: "text-amber-600",
  }[tone];

  return (
    <div className="flex items-center gap-3 border-b border-slate-50 py-2 last:border-b-0">
      {icon ? <span className="text-slate-400">{icon}</span> : null}
      <span className="flex-1 text-xs text-slate-500">{label}</span>
      <span className={`text-sm font-bold ${toneClass}`} dir="ltr">
        {value}
      </span>
    </div>
  );
}

export function PayLaterClient({ data }: { data: PayLaterDashboardData }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const debt = data.activeDebt;
  const remainingDue = debt
    ? Math.max(
        0,
        debt.upgrade_amount +
          debt.repayment_fee_amount +
          debt.penalty_amount -
          debt.amount_paid
      )
    : 0;

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleActivate = () => {
    if (!data.nextPackage) return;

    startTransition(async () => {
      const result = await activatePayLater(data.nextPackage!.id);
      if ("success" in result) {
        showToast(result.message ?? "تمت الترقية بنجاح", "success");
        router.refresh();
      } else {
        showToast(result.error.message, "error");
      }
    });
  };

  const handleWalletRepay = () => {
    if (!debt) return;

    startTransition(async () => {
      const result = await repayPayLaterFromWallet(debt.id);
      if ("success" in result) {
        showToast(result.message ?? "تم السداد", "success");
        router.refresh();
      } else {
        showToast(result.error.message, "error");
      }
    });
  };

  const handleReceiptSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await submitPayLaterReceipt(formData);
      if ("success" in result) {
        showToast(result.message ?? "تم إرسال الإثبات", "success");
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
      } else {
        showToast(result.error.message, "error");
      }
    });
  };

  const disableUpgrade =
    isPending || !data.eligible || !data.nextPackage || Boolean(debt);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <div>
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50">
            <CreditCard className="h-5 w-5 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            ترقية الباقة والدفع لاحقاً
          </h1>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
          ارفع باقتك الآن وادفع قيمة الترقية خلال 30 يوماً. أرباح الباقة
          القديمة تبقى قابلة للسحب، والزيادة الناتجة عن الباقة الجديدة تحفظ
          حتى يتم سداد الدين.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-2.5">
          <Info className="h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-xs font-medium leading-relaxed text-amber-700">
            التفعيل يتطلب 30 يوم عمل معتمد أو موافقة الإدارة بناءً على تقييم
            النشاط.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="mb-5 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
              <Package className="h-4 w-4 text-slate-500" />
            </div>
            <span className="text-sm font-bold text-slate-900">
              الباقة الحالية
            </span>
          </div>
          {data.currentPackage ? (
            <div className="space-y-1">
              <StatRow label="اسم الباقة" value={data.currentPackage.name} />
              <StatRow
                label="الأرباح اليومية"
                value={money(data.currentPackage.daily_profit)}
              />
              <StatRow
                label="عدد المهام اليومية"
                value={String(data.currentPackage.daily_task_count)}
              />
            </div>
          ) : (
            <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
              لا توجد باقة نشطة حالياً.
            </p>
          )}
        </div>

        <div className="relative overflow-hidden rounded-2xl border-2 border-emerald-200 bg-white p-5 shadow-[0_4px_20px_rgba(5,150,105,0.06)]">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600" />
          <div className="mb-5 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <span className="text-sm font-bold text-slate-900">
              الباقة الجديدة المقترحة
            </span>
          </div>
          {data.nextPackage && data.currentPackage ? (
            <>
              <div className="space-y-1">
                <StatRow
                  label="اسم الباقة"
                  value={data.nextPackage.name}
                  tone="emerald"
                />
                <StatRow
                  label="الأرباح اليومية"
                  value={money(data.nextPackage.daily_profit)}
                  tone="emerald"
                />
                <StatRow
                  label="عدد المهام اليومية"
                  value={String(data.nextPackage.daily_task_count)}
                />
                <StatRow
                  label="قيمة الترقية"
                  value={money(data.nextPackage.price - data.currentPackage.price)}
                  tone="emerald"
                />
              </div>
              <button
                onClick={handleActivate}
                disabled={disableUpgrade}
                className="mt-5 w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-[0_4px_14px_rgba(5,150,105,0.25)] transition-all hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              >
                {isPending ? "جارٍ التنفيذ..." : "ترقية الآن والدفع لاحقاً"}
              </button>
            </>
          ) : (
            <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
              لا توجد باقة أعلى متاحة للترقية.
            </p>
          )}
          {!data.eligible && !debt ? (
            <p className="mt-3 text-xs leading-relaxed text-rose-600">
              {data.recentUpgradeBlocked
                ? "تم استخدام الترقية مؤخراً. يمكن تكرارها بعد مرور 30 يوماً."
                : `أيام العمل المعتمدة: ${data.approvedWorkDays}/30. يمكن للإدارة تفعيل الأهلية يدوياً عند تقييم النشاط.`}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="mb-5 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50">
              <Receipt className="h-4 w-4 text-rose-500" />
            </div>
            <span className="text-sm font-bold text-slate-900">
              معلومات الدين
            </span>
          </div>
          {debt ? (
            <div className="space-y-1">
              <StatRow
                icon={<DollarSign className="h-3.5 w-3.5" />}
                label="المبلغ المتبقي"
                value={money(remainingDue)}
                tone={debt.status === "overdue" ? "rose" : "slate"}
              />
              <StatRow
                icon={<DollarSign className="h-3.5 w-3.5" />}
                label="رسوم السداد"
                value={`${debt.repayment_fee_pct}%`}
                tone="amber"
              />
              <StatRow
                icon={<DollarSign className="h-3.5 w-3.5" />}
                label="الغرامة"
                value={money(debt.penalty_amount)}
                tone={debt.penalty_amount > 0 ? "rose" : "slate"}
              />
              <StatRow
                icon={<Calendar className="h-3.5 w-3.5" />}
                label="تاريخ الترقية"
                value={new Date(debt.upgraded_at).toLocaleDateString("ar-EG")}
              />
              <StatRow
                icon={<Calendar className="h-3.5 w-3.5" />}
                label="آخر موعد للسداد"
                value={new Date(debt.due_at).toLocaleDateString("ar-EG")}
              />
              <StatRow
                icon={<ListChecks className="h-3.5 w-3.5" />}
                label="المدة المتبقية"
                value={
                  debt.status === "overdue"
                    ? "متأخر"
                    : `${daysRemaining(debt.due_at)} يوم`
                }
                tone={debt.status === "overdue" ? "rose" : "amber"}
              />
            </div>
          ) : (
            <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
              لا يوجد دين دفع لاحق مفتوح.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="mb-5 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50">
              <Lock className="h-4 w-4 text-amber-500" />
            </div>
            <span className="text-sm font-bold text-slate-900">
              الأرباح المحفوظة
            </span>
          </div>
          <div className="py-4 text-center">
            <p className="text-3xl font-black text-slate-300" dir="ltr">
              {money(debt?.locked_profit ?? 0)}
            </p>
          </div>
          <p className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
            هذه الأرباح لا يمكن سحبها حتى يتم سداد الدين. عند التأخر بعد 30
            يوماً، يتم استخدامها تلقائياً لتغطية جزء من الدين.
          </p>
        </div>
      </div>

      {debt ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
              <CreditCard className="h-4 w-4 text-blue-500" />
            </div>
            <span className="text-sm font-bold text-slate-900">
              طرق السداد
            </span>
          </div>
          {debt.status === "pending_review" ? (
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm font-medium text-amber-700">
              إثبات السداد قيد مراجعة الإدارة.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <button
                onClick={handleWalletRepay}
                disabled={isPending || data.walletBalance < remainingDue}
                className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-slate-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                سداد من المحفظة
              </button>
              <form action={handleReceiptSubmit} className="space-y-3">
                <input type="hidden" name="debt_id" value={debt.id} />
                <input
                  ref={fileRef}
                  type="file"
                  name="receipt"
                  accept="image/png,image/jpeg"
                  className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 file:me-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700"
                />
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Upload className="h-4 w-4" />
                  رفع إثبات سداد
                </button>
              </form>
            </div>
          )}
        </div>
      ) : null}

      <div>
        <h2 className="mb-4 text-lg font-bold text-slate-900">
          القواعد والسياسات
        </h2>
        <div className="space-y-3">
          <Accordion
            title="قواعد السداد"
            icon={<DollarSign className="h-4 w-4 text-emerald-600" />}
            color="bg-emerald-50"
          >
            <ul className="space-y-3 text-sm leading-relaxed text-slate-600">
              <li>يجب السداد خلال 30 يوماً كحد أقصى.</li>
              <li>يمكن السداد مبكراً لفتح الأرباح المحفوظة وإغلاق الدين.</li>
              <li>الترقية متاحة مرة واحدة فقط كل 30 يوم.</li>
            </ul>
          </Accordion>
          <Accordion
            title="إجراءات عدم السداد"
            icon={<AlertTriangle className="h-4 w-4 text-rose-500" />}
            color="bg-rose-50"
          >
            <ul className="space-y-3 text-sm leading-relaxed text-slate-600">
              <li>يتم إيقاف تنفيذ المهام والسحب عند التأخر.</li>
              <li>تخصم الأرباح المحفوظة تلقائياً من الدين.</li>
              <li>تضاف غرامة مالية تحددها الإدارة.</li>
            </ul>
          </Accordion>
          <Accordion
            title="بعد السداد"
            icon={<CheckCircle2 className="h-4 w-4 text-blue-500" />}
            color="bg-blue-50"
          >
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
              <p className="text-sm leading-relaxed text-slate-700">
                يتم إغلاق الدين، فتح الأرباح المحفوظة، والسماح بالسحب والمهام
                بصورة طبيعية.
              </p>
            </div>
          </Accordion>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
