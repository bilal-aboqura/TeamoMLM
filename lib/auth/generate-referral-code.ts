import type { SupabaseClient } from "@supabase/supabase-js";

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export async function generateUniqueReferralCode(
  supabase: SupabaseClient
): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = Array.from({ length: 8 }, () =>
      CHARSET[Math.floor(Math.random() * CHARSET.length)]
    ).join("");

    const { data } = await supabase
      .from("users")
      .select("id")
      .eq("referral_code", code)
      .maybeSingle();

    if (!data) return code;
  }
  throw new Error("Failed to generate unique referral code after 5 attempts");
}
