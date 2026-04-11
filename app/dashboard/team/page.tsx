import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReferralStatsCards } from "./_components/ReferralStatsCards";
import { InviteLinkCard } from "./_components/InviteLinkCard";
import { MyDownlineTree } from "./_components/MyDownlineTree";
import { buildTree } from "./_components/treeUtils";

export const metadata = {
  title: "فريقي",
};

export default async function TeamPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [statsResult, profileResult, treeResult] = await Promise.all([
    supabase
      .from("user_referral_stats")
      .select("direct_count, total_team_size, total_earnings")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("users")
      .select("referral_code")
      .eq("id", user.id)
      .single(),
    supabase.rpc("get_my_referral_tree"),
  ]);

  const stats = statsResult.data ?? {
    direct_count: 0,
    total_team_size: 0,
    total_earnings: 0,
  };

  const referralCode = profileResult.data?.referral_code ?? "";
  // NEXT_PUBLIC_APP_URL must be the domain root only (e.g. https://teamoads.com or http://localhost:3000).
  // We append /register here unconditionally so InviteLinkCard always gets a complete base path.
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "https://teamoads.com").replace(/\/$/, "");
  const baseUrl = `${appUrl}/register`;

  const treeData = buildTree(treeResult.data ?? [], user.id);

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">فريقي</h1>

      <ReferralStatsCards
        directCount={stats.direct_count}
        totalTeamSize={stats.total_team_size}
        totalEarnings={Number(stats.total_earnings)}
      />

      <div id="invite-link">
        <InviteLinkCard referralCode={referralCode} baseUrl={baseUrl} />
      </div>

      <section id="team-tree">
        <MyDownlineTree tree={treeData} />
      </section>
    </div>
  );
}
