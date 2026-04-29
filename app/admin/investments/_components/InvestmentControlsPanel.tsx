"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendManualInvestmentProfit, updateTradingReport } from "../actions";
import type { DbTradingReport } from "@/lib/db/investment";

type InvestorOption = {
  id: string;
  full_name: string;
  phone_number: string;
};

export function InvestmentControlsPanel({
  report,
  investors,
}: {
  report: DbTradingReport;
  investors: InvestorOption[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: (formData: FormData) => Promise<{ success: true } | { error: string }>, form: HTMLFormElement) {
    setMessage(null);
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await action(formData);
      if ("error" in result) {
        setMessage(result.error);
        return;
      }
      setMessage("تم الحفظ");
      form.reset();
      router.refresh();
    });
  }

  return (
    <section className="grid gap-5 lg:grid-cols-2">
      <form
        className="rounded-2xl bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
        onSubmit={(event) => {
          event.preventDefault();
          run(updateTradingReport, event.currentTarget);
        }}
      >
        <h2 className="mb-4 text-base font-bold text-slate-900">
          تقرير التداول المختصر
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <input name="totalTrades" type="number" min="0" defaultValue={report.totalTrades} placeholder="عدد الصفقات" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input name="wonTrades" type="number" min="0" defaultValue={report.won} placeholder="الرابحة" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input name="lostTrades" type="number" min="0" defaultValue={report.lost} placeholder="الخاسرة" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <input name="periodStart" type="date" defaultValue={report.periodStart ?? ""} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input name="periodEnd" type="date" defaultValue={report.periodEnd ?? ""} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <textarea name="details" rows={4} defaultValue={report.details} placeholder="تفاصيل الصفقات" className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <button disabled={isPending} className="mt-3 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
          حفظ التقرير
        </button>
      </form>

      <form
        className="rounded-2xl bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
        onSubmit={(event) => {
          event.preventDefault();
          run(sendManualInvestmentProfit, event.currentTarget);
        }}
      >
        <h2 className="mb-4 text-base font-bold text-slate-900">
          إرسال أرباح يدوياً
        </h2>
        <select name="userId" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
          <option value="">اختر المستخدم</option>
          {investors.map((user) => (
            <option key={user.id} value={user.id}>
              {user.full_name} - {user.phone_number}
            </option>
          ))}
        </select>
        <input name="amount" type="number" min="0.01" step="0.01" placeholder="المبلغ" className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <textarea name="reason" rows={3} placeholder="سبب الإرسال أو ملاحظات" className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <button disabled={isPending} className="mt-3 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
          إرسال الربح
        </button>
      </form>
      {message ? <p className="lg:col-span-2 text-sm text-slate-600">{message}</p> : null}
    </section>
  );
}
