import { createAdminClient } from "@/lib/supabase/admin";
import type { AppProfitSubmission } from "@/lib/app-profits/types";
import { ReviewsTable } from "./_components/ReviewsTable";

export const dynamic = "force-dynamic";

export default async function AppProfitReviewsPage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("app_profit_submissions")
    .select("id, offer_id, user_id, screenshot_url, status, rejection_reason, created_at, app_profit_offers(title, provider, reward_usd), users(full_name)")
    .order("created_at", { ascending: true });

  const submissions: AppProfitSubmission[] = await Promise.all(
    (data ?? []).map(async (row) => {
      const { data: signed } = await supabase.storage
        .from("app-profit-proofs")
        .createSignedUrl(row.screenshot_url, 900);
      const offer = row.app_profit_offers as unknown as { title: string; provider: string; reward_usd: number } | null;
      const user = row.users as unknown as { full_name: string } | null;

      return {
        id: row.id,
        offer_id: row.offer_id,
        offer_title: offer?.title ?? "غير متوفر",
        provider: offer?.provider ?? "غير متوفر",
        user_id: row.user_id,
        user_full_name: user?.full_name ?? "غير متوفر",
        screenshot_url: row.screenshot_url,
        signed_screenshot_url: signed?.signedUrl ?? "",
        reward_usd: Number(offer?.reward_usd ?? 0),
        status: row.status as AppProfitSubmission["status"],
        rejection_reason: row.rejection_reason ?? undefined,
        created_at: row.created_at,
      };
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">مراجعة إثباتات التطبيقات</h1>
        <p className="mt-1 text-sm text-slate-500">قبول أو رفض لقطات شاشة الربح بالتطبيقات</p>
      </div>
      <ReviewsTable submissions={submissions} />
    </div>
  );
}
