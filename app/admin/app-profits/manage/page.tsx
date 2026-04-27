import { createAdminClient } from "@/lib/supabase/admin";
import { OfferForm } from "./_components/OfferForm";
import { OffersTable, type AdminAppOffer } from "./_components/OffersTable";

export const dynamic = "force-dynamic";

export default async function ManageAppProfitsPage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("app_profit_offers")
    .select("id, title, provider, download_url, reward_usd, required_tier, is_active")
    .order("created_at", { ascending: false });

  const offers: AdminAppOffer[] = (data ?? []).map((offer) => ({
    ...offer,
    reward_usd: Number(offer.reward_usd),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">إدارة عروض التطبيقات</h1>
        <p className="mt-1 text-sm text-slate-500">إضافة وتعديل عروض الربح بالتطبيقات المستقلة</p>
      </div>
      <OfferForm />
      <OffersTable offers={offers} />
    </div>
  );
}
