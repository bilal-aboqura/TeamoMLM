import { createAdminClient } from "@/lib/supabase/admin";
import {
  isMissingSchema,
  readFinancialControlsFallback,
} from "@/lib/db/financial-controls-fallback";
import {
  APP_PROFIT_LIMIT_KEYS,
  getDefaultAppProfitLimit,
} from "@/lib/app-profits/limits";

export type AppProfitPackageLimit = {
  package_key: string;
  app_limit: number;
};

export async function getAppProfitPackageLimits(): Promise<
  AppProfitPackageLimit[]
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("app_profit_package_limits")
    .select("package_key, app_limit")
    .order("package_key", { ascending: true });

  const stored = (await readFinancialControlsFallback()).appProfitPackageLimits ?? {};

  if (error && isMissingSchema(error.message)) {
    return APP_PROFIT_LIMIT_KEYS.map((packageKey) => ({
      package_key: packageKey,
      app_limit: stored[packageKey] ?? getDefaultAppProfitLimit(packageKey),
    }));
  }

  const dbRows = (data ?? []).map((row) => ({
    package_key: row.package_key,
    app_limit: Number(row.app_limit ?? getDefaultAppProfitLimit(row.package_key)),
  }));
  const byKey = new Map(dbRows.map((row) => [row.package_key, row.app_limit]));

  return APP_PROFIT_LIMIT_KEYS.map((packageKey) => ({
    package_key: packageKey,
    app_limit:
      stored[packageKey] ??
      (byKey.get(packageKey) != null && Number(byKey.get(packageKey)) < 999
        ? Number(byKey.get(packageKey))
        : getDefaultAppProfitLimit(packageKey)),
  }));
}

export async function getAppProfitPackageLimit(packageKey: string | null) {
  if (!packageKey) return 0;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("app_profit_package_limits")
    .select("app_limit")
    .eq("package_key", packageKey)
    .maybeSingle();

  const stored =
    (await readFinancialControlsFallback()).appProfitPackageLimits?.[packageKey];

  if (stored != null) return Number(stored);
  if (error && isMissingSchema(error.message)) {
    return getDefaultAppProfitLimit(packageKey);
  }

  const dbValue = Number(data?.app_limit ?? getDefaultAppProfitLimit(packageKey));
  return dbValue >= 999 ? getDefaultAppProfitLimit(packageKey) : dbValue;
}
