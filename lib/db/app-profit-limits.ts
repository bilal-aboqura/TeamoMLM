import { createAdminClient } from "@/lib/supabase/admin";

export type AppProfitPackageLimit = {
  package_key: string;
  app_limit: number;
};

export async function getAppProfitPackageLimits(): Promise<
  AppProfitPackageLimit[]
> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("app_profit_package_limits")
    .select("package_key, app_limit")
    .order("package_key", { ascending: true });

  return (data ?? []).map((row) => ({
    package_key: row.package_key,
    app_limit: Number(row.app_limit ?? 999),
  }));
}
