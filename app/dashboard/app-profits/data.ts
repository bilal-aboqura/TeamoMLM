import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ensureIsolatedWallet, getAppProfitAccess } from "@/lib/app-profits/access";
import type { AppProfitOffer, AppProfitWallet } from "@/lib/app-profits/types";

type SubmissionRow = {
  id: string;
  offer_id: string;
  status: "pending_review" | "approved" | "rejected";
};

function deriveStatus(submissions: SubmissionRow[]) {
  if (submissions.some((submission) => submission.status === "approved")) {
    return "approved" as const;
  }
  if (submissions.some((submission) => submission.status === "pending_review")) {
    return "pending_review" as const;
  }
  if (submissions.some((submission) => submission.status === "rejected")) {
    return "rejected" as const;
  }
  return "not_executed" as const;
}

export async function getAppProfitDashboard(userId: string) {
  const access = await getAppProfitAccess(userId);
  await ensureIsolatedWallet(userId);

  const adminClient = createAdminClient();
  const { data: walletRow } = await adminClient
    .from("user_isolated_wallets")
    .select("user_id, app_profits_balance, app_package_amount")
    .eq("user_id", userId)
    .maybeSingle();

  const wallet: AppProfitWallet = {
    user_id: userId,
    app_profits_balance: Number(walletRow?.app_profits_balance ?? 0),
    app_package_amount: walletRow?.app_package_amount != null ? Number(walletRow.app_package_amount) : null,
  };

  if (!access.allowed) {
    return { access, wallet, offers: [] as AppProfitOffer[] };
  }

  const supabase = await createClient();
  const { data: offers } = await supabase
    .from("app_profit_offers")
    .select("id, title, download_url, reward_usd, provider, required_tier")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const offerRows = (offers ?? []).slice(0, access.appLimit);
  const offerIds = offerRows.map((offer) => offer.id);

  const { data: submissions } =
    offerIds.length > 0
      ? await supabase
          .from("app_profit_submissions")
          .select("id, offer_id, status")
          .eq("user_id", userId)
          .in("offer_id", offerIds)
      : { data: [] };

  const submissionsByOffer = new Map<string, SubmissionRow[]>();
  for (const submission of (submissions ?? []) as SubmissionRow[]) {
    const current = submissionsByOffer.get(submission.offer_id) ?? [];
    current.push(submission);
    submissionsByOffer.set(submission.offer_id, current);
  }

  const appOffers: AppProfitOffer[] = offerRows.map((offer) => {
    const offerSubmissions = submissionsByOffer.get(offer.id) ?? [];
    const pending = offerSubmissions.find(
      (submission) => submission.status === "pending_review"
    );

    return {
      id: offer.id,
      title: offer.title,
      download_url: offer.download_url,
      reward_usd: Number(offer.reward_usd),
      provider: offer.provider,
      required_tier: offer.required_tier,
      user_status: deriveStatus(offerSubmissions),
      active_submission_id: pending?.id,
    };
  });

  return { access, wallet, offers: appOffers };
}
