// use client - handles form submission feedback and refresh.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAppProfitOffer } from "../actions";

export function OfferForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    const form = event.currentTarget;
    const result = await createAppProfitOffer(new FormData(form));
    setLoading(false);
    if ("error" in result) setMessage(result.error);
    else {
      form.reset();
      setMessage("تمت إضافة العرض بنجاح");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)]" noValidate>
      <h2 className="mb-5 text-lg font-bold text-slate-900">إضافة تطبيق ربح</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <input name="title" required placeholder="اسم التطبيق" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all duration-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" />
        <input name="provider" required placeholder="المزود: Tapjoy" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all duration-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" />
        <input name="download_url" required type="url" dir="ltr" placeholder="https://example.com/app" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all duration-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 md:col-span-2" />
        <input name="reward_usd" required type="number" step="0.01" min="0" dir="ltr" placeholder="المكافأة USD" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all duration-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" />
        <input name="required_tier" defaultValue="none" placeholder="الفئة المطلوبة" className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all duration-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" />
      </div>
      {message && <p className="mt-4 text-sm font-medium text-slate-600">{message}</p>}
      <button disabled={loading} className="mt-5 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-800 active:scale-95 disabled:opacity-50">
        {loading ? "جاري الحفظ..." : "إضافة العرض"}
      </button>
    </form>
  );
}
