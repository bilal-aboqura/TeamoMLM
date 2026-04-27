import type { AppProfitOffer } from "@/lib/app-profits/types";
import { AppOfferCard } from "./AppOfferCard";

export function AppOfferList({ offers }: { offers: AppProfitOffer[] }) {
  if (offers.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center text-sm font-medium text-slate-500 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        لا توجد تطبيقات متاحة حالياً
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {offers.map((offer) => (
        <AppOfferCard key={offer.id} offer={offer} />
      ))}
    </div>
  );
}
