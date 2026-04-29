import { createClient } from "@/lib/supabase/server";
import { getPaymentTarget, type PaymentTarget } from "@/lib/db/payment-targets";

export type PackageWithStatus = {
  id: string;
  name: string;
  price: number;
  daily_task_count: number;
  daily_profit: number;
  display_order: number;
  userStatus: "none" | "pending" | "active";
};

export type PaymentSetting = PaymentTarget | null;

export async function getPackagesWithUserStatus(
  userId: string
): Promise<PackageWithStatus[]> {
  const supabase = await createClient();

  const [{ data: packages }, { data: requests }] = await Promise.all([
    supabase
      .from("packages")
      .select("id, name, price, daily_task_count, daily_profit, display_order")
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
    supabase
      .from("package_subscription_requests")
      .select("package_id, status")
      .eq("user_id", userId)
      .in("status", ["pending", "approved"]),
  ]);

  if (!packages) return [];

  const requestMap = new Map(
    (requests ?? []).map((r) => [r.package_id, r.status])
  );

  return packages.map((pkg) => {
    const dbStatus = requestMap.get(pkg.id);
    const userStatus: PackageWithStatus["userStatus"] =
      dbStatus === "approved"
        ? "active"
        : dbStatus === "pending"
          ? "pending"
          : "none";

    return {
      id: pkg.id,
      name: pkg.name,
      price: pkg.price,
      daily_task_count: pkg.daily_task_count,
      daily_profit: pkg.daily_profit,
      display_order: pkg.display_order,
      userStatus,
    };
  });
}

export async function getActivePaymentSetting(): Promise<PaymentSetting> {
  return getPaymentTarget("packages");
}
