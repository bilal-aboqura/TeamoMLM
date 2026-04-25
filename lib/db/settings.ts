import { createAdminClient } from "@/lib/supabase/admin";

export async function getUsdtWalletAddress(): Promise<string | null> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("platform_settings")
    .select("usdt_wallet_address")
    .eq("id", true)
    .maybeSingle();

  if (data?.usdt_wallet_address) {
    return data.usdt_wallet_address;
  }

  const { data: fallback } = await supabase
    .from("admin_settings")
    .select("payment_address")
    .eq("is_active", true)
    .maybeSingle();

  return fallback?.payment_address ?? null;
}
