import { createAdminClient } from "@/lib/supabase/admin";

export async function isValidSponsorReferralCode(
  referralCode: string,
  currentUserId: string
): Promise<boolean> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("referral_code", referralCode.trim())
    .maybeSingle();

  if (error || !data) {
    return false;
  }

  return data.id !== currentUserId;
}
