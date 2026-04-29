"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  CreditCard,
  Eye,
  RefreshCw,
  Save,
  XCircle,
} from "lucide-react";
import {
  approvePayLaterReceipt,
  cancelPayLaterForUser,
  processOverduePayLater,
  rejectPayLaterReceipt,
  updatePayLaterUserSettings,
} from "../actions";

type DebtRow = {
  id: string;
  user_id: string;
  full_name: string;
  phone_number: string;
  from_package_name: string;
  to_package_name: string;
  upgrade_amount: number;
  repayment_fee_amount: number;
  penalty_amount: number;
  locked_profit: number;
  amount_paid: number;
  status: "active" | "pending_review" | "overdue" | "paid" | "cancelled";
  due_at: string;
  upgraded_at: string;
  repayment_submitted_at: string | null;
  signed_url: string;
};

type UserSettingsRow = {
  id: string;
  full_name: string;
  phone_number: string;
  current_package_level: string | null;
  pay_later_manual_eligible: boolean;
  pay_later_fee_pct: number;
  pay_later_penalty_amount: number;
  approved_work_days: number;
  direct_referrals: number;
};

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

function StatusBadge({ status }: { status: DebtRow["status"] }) {
  const map = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-100",
    pending_review: "bg-amber-50 text-amber-700 border-amber-100",
    overdue: "bg-rose-50 text-rose-700 border-rose-100",
    paid: "bg-blue-50 text-blue-700 border-blue-100",
    cancelled: "bg-slate-100 text-slate-600 border-slate-200",
  };
  const label = {
    active: "نشط",
    pending_review: "قيد المراجعة",
    overdue: "متأخر",
    paid: "مدفوع",
    cancelled: "ملغي",
  }[status];

  return (
    <span className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold ${map[status]}`}>
      {label}
    </span>
  );
}

function Toast({
  toast,
}: {
  toast: { message: string; type: "success" | "error" } | null;
}) {
  if (!toast) return null;
  return (
    <div
      className={`fixed bottom-6 start-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium text-white shadow-[0_4px_20px_rgba(0,0,0,0.15)] ${
        toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
      }`}
    >
      {toast.type === "success" ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : (
        <XCircle className="h-4 w-4" />
      )}
      {toast.message}
    </div>
  );
}

function UserSettingsForm({ user }: { user: UserSettingsRow }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [manualEligible, setManualEligible] = useState(
    user.pay_later_manual_eligible
  );
  const [feePct, setFeePct] = useState(String(user.pay_later_fee_pct));
  const [penaltyAmount, setPenaltyAmount] = useState(
    String(user.pay_later_penalty_amount)
  );

  const save = () => {
    startTransition(async () => {
      await updatePayLaterUserSettings(
        user.id,
        manualEligible,
        Number(feePct),
        Number(penaltyAmount)
      );
      router.refresh();
    });
  };

  const cancelPayLater = () => {
    const ok = window.confirm(
      `هل تريد إلغاء الدفع بالأجل للمستخدم ${user.full_name}؟ سيتم حذف الدين المفتوح، إرجاع الباقة السابقة إن وجدت، وتعطيل الأهلية اليدوية.`
    );
    if (!ok) return;

    startTransition(async () => {
      await cancelPayLaterForUser(user.id);
      router.refresh();
    });
  };

  return (
    <tr className="border-b border-slate-100 last:border-b-0">
      <td className="px-4 py-4">
        <div>
          <p className="text-sm font-bold text-slate-900">{user.full_name}</p>
          <p className="text-xs text-slate-400" dir="ltr">{user.phone_number}</p>
        </div>
      </td>
      <td className="px-4 py-4">
        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
          {user.current_package_level ?? "بدون"}
        </span>
      </td>
      <td className="px-4 py-4 text-sm text-slate-600">
        {user.approved_work_days}/30
      </td>
      <td className="px-4 py-4 text-sm text-slate-600">
        {user.direct_referrals}
      </td>
      <td className="px-4 py-4">
        <input
          type="checkbox"
          checked={manualEligible}
          onChange={(event) => setManualEligible(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-emerald-600"
        />
      </td>
      <td className="px-4 py-4">
        <select
          value={feePct}
          onChange={(event) => setFeePct(event.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <option value="0">0%</option>
          <option value="5">5%</option>
          <option value="10">10%</option>
        </select>
      </td>
      <td className="px-4 py-4">
        <input
          type="number"
          min="0"
          step="0.01"
          value={penaltyAmount}
          onChange={(event) => setPenaltyAmount(event.target.value)}
          className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        />
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
        <button
          onClick={save}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-700 disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          حفظ
        </button>
        <button
          onClick={cancelPayLater}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
        >
          <XCircle className="h-3.5 w-3.5" />
          إلغاء بالأجل
        </button>
        </div>
      </td>
    </tr>
  );
}

export function PayLaterAdminPanel({
  debts,
  users,
}: {
  debts: DebtRow[];
  users: UserSettingsRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const run = (callback: () => Promise<{ success: true; message?: string } | { error: string }>) => {
    startTransition(async () => {
      const result = await callback();
      if ("success" in result) {
        showToast(result.message ?? "تم التنفيذ", "success");
        router.refresh();
      } else {
        showToast(result.error, "error");
      }
    });
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CreditCard className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              إدارة الدفع لاحقاً
            </h1>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            مراجعة الديون، اعتماد السداد، وضبط أهلية المستخدمين والرسوم.
          </p>
        </div>
        <button
          onClick={() => run(processOverduePayLater)}
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-700 disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4" />
          معالجة المتأخرات
        </button>
      </div>

      <section>
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-lg font-bold text-slate-900">الديون المفتوحة</h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
            {debts.length}
          </span>
        </div>
        <div className="overflow-x-auto rounded-xl bg-slate-50 p-3 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <table className="w-full min-w-[980px] text-start">
            <thead>
              <tr className="bg-slate-100/70 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 text-start">المستخدم</th>
                <th className="px-4 py-3 text-start">الترقية</th>
                <th className="px-4 py-3 text-start">المتبقي</th>
                <th className="px-4 py-3 text-start">المحفوظ</th>
                <th className="px-4 py-3 text-start">آخر موعد</th>
                <th className="px-4 py-3 text-start">الحالة</th>
                <th className="px-4 py-3 text-start">الإثبات</th>
                <th className="px-4 py-3 text-start">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {debts.map((debt) => {
                const remaining =
                  debt.upgrade_amount +
                  debt.repayment_fee_amount +
                  debt.penalty_amount -
                  debt.amount_paid;
                return (
                  <tr key={debt.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-4 py-4">
                      <p className="text-sm font-bold text-slate-900">
                        {debt.full_name}
                      </p>
                      <p className="text-xs text-slate-400" dir="ltr">
                        {debt.phone_number}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-slate-700">
                      {debt.from_package_name} → {debt.to_package_name}
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-slate-900">
                      {money(Math.max(0, remaining))}
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-amber-600">
                      {money(debt.locked_profit)}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-500">
                      {new Date(debt.due_at).toLocaleDateString("ar-EG")}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={debt.status} />
                    </td>
                    <td className="px-4 py-4">
                      {debt.signed_url ? (
                        <a
                          href={debt.signed_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          عرض
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">لا يوجد</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => run(() => approvePayLaterReceipt(debt.id))}
                          disabled={isPending}
                          className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          اعتماد
                        </button>
                        {debt.status === "pending_review" ? (
                          <button
                            onClick={() =>
                              run(() =>
                                rejectPayLaterReceipt(
                                  debt.id,
                                  "إثبات السداد غير واضح أو غير مطابق"
                                )
                              )
                            }
                            disabled={isPending}
                            className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                          >
                            رفض
                          </button>
                        ) : null}
                        <button
                          onClick={() => {
                            const ok = window.confirm(
                              `هل تريد إلغاء الدفع بالأجل للمستخدم ${debt.full_name}؟ سيتم حذف الدين المفتوح وإرجاع الباقة السابقة.`
                            );
                            if (ok) run(() => cancelPayLaterForUser(debt.user_id));
                          }}
                          disabled={isPending}
                          className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
                        >
                          إلغاء بالأجل
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {debts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">
                    لا توجد ديون مفتوحة حالياً
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-lg font-bold text-slate-900">
            إعدادات أهلية المستخدمين
          </h2>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
            آخر {users.length}
          </span>
        </div>
        <div className="overflow-x-auto rounded-xl bg-slate-50 p-3 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <table className="w-full min-w-[920px] text-start">
            <thead>
              <tr className="bg-slate-100/70 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 text-start">المستخدم</th>
                <th className="px-4 py-3 text-start">الباقة</th>
                <th className="px-4 py-3 text-start">أيام العمل</th>
                <th className="px-4 py-3 text-start">الإحالات</th>
                <th className="px-4 py-3 text-start">مؤهل يدوياً</th>
                <th className="px-4 py-3 text-start">رسوم السداد</th>
                <th className="px-4 py-3 text-start">غرامة التأخير</th>
                <th className="px-4 py-3 text-start">الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <UserSettingsForm key={user.id} user={user} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <Toast toast={toast} />
    </div>
  );
}
