"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { AVATAR_IDS } from "@/lib/chat/avatars";
import { getChatAuthContext } from "@/lib/chat/server";

const schema = z.object({ avatarId: z.enum(AVATAR_IDS) });

export async function updateAvatarSelection(input: z.input<typeof schema>): Promise<
  { success: true } | { success: false; error: "INVALID_AVATAR_ID" | "UNAUTHORIZED" }
> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { success: false, error: "INVALID_AVATAR_ID" };

  const auth = await getChatAuthContext();
  if (!auth) return { success: false, error: "UNAUTHORIZED" };

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("chat_profiles")
    .update({ avatar_id: parsed.data.avatarId })
    .eq("user_id", auth.userId);

  if (error) return { success: false, error: "INVALID_AVATAR_ID" };
  revalidatePath("/dashboard/settings/profile");
  return { success: true };
}
