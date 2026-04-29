import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getAppProfitPackageLimit } from "@/lib/db/app-profit-limits";

const QUALIFYING_PACKAGES = new Set(["B1", "B2", "B3"]);
const APP_PACKAGE_AMOUNTS = new Set([200, 300, 400, 500, 600]);

export type AppProfitAccess = {
  allowed: boolean;
  reason: "rank" | "main_package" | "app_package" | null;
  leadershipLevel: number | null;
  currentPackageLevel: string | null;
  appPackageAmount: number | null;
  packageKey: string | null;
  appLimit: number;
};

export function evaluateAppProfitAccess({
  leadershipLevel,
  currentPackageLevel,
  appPackageAmount,
}: {
  leadershipLevel: number | null;
  currentPackageLevel: string | null;
  appPackageAmount: number | null;
}): AppProfitAccess {
  if (currentPackageLevel && QUALIFYING_PACKAGES.has(currentPackageLevel)) {
    return {
      allowed: true,
      reason: "main_package",
      leadershipLevel,
      currentPackageLevel,
      appPackageAmount,
      packageKey: currentPackageLevel,
      appLimit: 0,
    };
  }

  if (appPackageAmount && APP_PACKAGE_AMOUNTS.has(appPackageAmount)) {
    return {
      allowed: true,
      reason: "app_package",
      leadershipLevel,
      currentPackageLevel,
      appPackageAmount,
      packageKey: String(appPackageAmount),
      appLimit: 0,
    };
  }

  return {
    allowed: false,
    reason: null,
    leadershipLevel,
    currentPackageLevel,
    appPackageAmount,
    packageKey: null,
    appLimit: 0,
  };
}

export async function getAppProfitAccess(userId: string): Promise<AppProfitAccess> {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("users")
    .select("leadership_level, current_package_level")
    .eq("id", userId)
    .maybeSingle();

  const adminClient = createAdminClient();
  const { data: wallet } = await adminClient
    .from("user_isolated_wallets")
    .select("app_package_amount")
    .eq("user_id", userId)
    .maybeSingle();

  const access = evaluateAppProfitAccess({
    leadershipLevel: profile?.leadership_level ?? null,
    currentPackageLevel: profile?.current_package_level ?? null,
    appPackageAmount: wallet?.app_package_amount != null ? Number(wallet.app_package_amount) : null,
  });

  if (!access.packageKey) return access;

  return {
    ...access,
    appLimit: await getAppProfitPackageLimit(access.packageKey),
  };
}

export async function ensureIsolatedWallet(userId: string) {
  const adminClient = createAdminClient();
  await adminClient
    .from("user_isolated_wallets")
    .upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });
}
