// use client - row actions mutate offer state and refresh the admin list.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAppProfitOffer, toggleAppProfitOffer, updateAppProfitOffer } from "../actions";

export type AdminAppOffer = {
  id: string;
  title: string;
  provider: string;
  download_url: string;
  reward_usd: number;
  required_tier: string;
  is_active: boolean;
};

export function OffersTable({ offers }: { offers: AdminAppOffer[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await updateAppProfitOffer(new FormData(event.currentTarget));
    if ("error" in result) setMessage(result.error);
    else {
      setEditingId(null);
      router.refresh();
    }
  }

  if (offers.length === 0) {
    return <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">لا توجد عروض تطبيقات بعد</div>;
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
      {message && <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p>}
      <div className="space-y-3">
        {offers.map((offer) => (
          <div key={offer.id} className="rounded-xl bg-slate-50 p-4">
            {editingId === offer.id ? (
              <form onSubmit={handleUpdate} className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input type="hidden" name="offer_id" value={offer.id} />
                <input name="title" defaultValue={offer.title} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <input name="provider" defaultValue={offer.provider} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <input name="download_url" defaultValue={offer.download_url} dir="ltr" className="rounded-xl border border-slate-200 px-3 py-2 text-sm md:col-span-2" />
                <input name="reward_usd" type="number" step="0.01" defaultValue={offer.reward_usd} dir="ltr" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <input name="required_tier" defaultValue={offer.required_tier} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <div className="flex gap-2 md:col-span-2">
                  <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">حفظ</button>
                  <button type="button" onClick={() => setEditingId(null)} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">إلغاء</button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">{offer.title}</h3>
                  <p className="mt-1 text-xs text-slate-500">{offer.provider} · {offer.required_tier}</p>
                  <p className="mt-1 max-w-lg truncate text-xs text-slate-400" dir="ltr">{offer.download_url}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-600" dir="ltr">{offer.reward_usd.toFixed(2)} USD</span>
                  <button onClick={() => setEditingId(offer.id)} className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">تعديل</button>
                  <button onClick={async () => { await toggleAppProfitOffer(offer.id, !offer.is_active); router.refresh(); }} className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white">
                    {offer.is_active ? "إيقاف" : "تفعيل"}
                  </button>
                  <button
                    onClick={async () => {
                      if (!window.confirm("هل تريد حذف هذا العرض؟")) return;
                      const result = await deleteAppProfitOffer(offer.id);
                      if ("error" in result) setMessage(result.error);
                      router.refresh();
                    }}
                    className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-600 hover:bg-rose-100"
                  >
                    حذف
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
