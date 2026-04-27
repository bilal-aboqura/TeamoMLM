// use client - submits the withdrawal Server Action and shows feedback.
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitAppProfitWithdrawal } from "../actions";

export function WithdrawForm({
  balance,
  isFriday,
}: {
  balance: number;
  isFriday: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await submitAppProfitWithdrawal(formData);
      setMessage("error" in result ? result.error : "تم إرسال طلب السحب للمراجعة");
      if ("success" in result) router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
      <p className="text-sm text-slate-500">الرصيد المتاح</p>
      <p className="mt-1 text-2xl font-bold text-emerald-600" dir="ltr">{balance.toFixed(2)} USD</p>
      {!isFriday && (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
          السحب متاح يوم الجمعة فقط. الزر مغلق اليوم.
        </p>
      )}
      <div className="mt-4 flex gap-2">
        <input name="amount" type="number" step="0.01" min="0" max={balance} dir="ltr" placeholder="0.00" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500" />
        <button disabled={!isFriday || isPending || balance <= 0} className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
          سحب
        </button>
      </div>
      {message && <p className="mt-3 text-sm font-medium text-slate-600">{message}</p>}
    </form>
  );
}
