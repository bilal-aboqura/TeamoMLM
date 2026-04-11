import { createAdminClient } from "@/lib/supabase/admin";

export async function checkRateLimit(phone: string): Promise<{ locked: boolean; lockedUntil?: string }> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("login_attempts")
    .select("locked_until")
    .eq("phone_number", phone)
    .maybeSingle();

  if (!data?.locked_until) return { locked: false };

  const lockedUntil = new Date(data.locked_until);
  if (lockedUntil > new Date()) {
    return { locked: true, lockedUntil: data.locked_until };
  }

  return { locked: false };
}

export async function recordFailedAttempt(phone: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("login_attempts")
    .select("attempt_count")
    .eq("phone_number", phone)
    .maybeSingle();

  const newCount = (existing?.attempt_count ?? 0) + 1;
  const shouldLock = newCount >= 5;

  await supabase
    .from("login_attempts")
    .upsert(
      {
        phone_number: phone,
        attempt_count: newCount,
        last_attempt_at: new Date().toISOString(),
        locked_until: shouldLock
          ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
          : null,
      },
      { onConflict: "phone_number" }
    );
}

export async function resetRateLimit(phone: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("login_attempts").delete().eq("phone_number", phone);
}
