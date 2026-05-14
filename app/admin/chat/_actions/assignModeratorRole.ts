"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getChatAuthContext } from "@/lib/chat/server";

const schema = z.object({
  roomId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(["moderator", "member"]),
});

export async function assignModeratorRole(input: z.input<typeof schema>): Promise<
  | { success: true }
  | { success: false; error: "UNAUTHORIZED" | "PARTICIPANT_NOT_FOUND" }
> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { success: false, error: "PARTICIPANT_NOT_FOUND" };

  const auth = await getChatAuthContext();
  if (!auth || auth.globalRole !== "admin") return { success: false, error: "UNAUTHORIZED" };

  const adminClient = createAdminClient();
  const { data: participant } = await adminClient
    .from("chat_participants")
    .select("room_id")
    .eq("room_id", parsed.data.roomId)
    .eq("user_id", parsed.data.userId)
    .maybeSingle();

  if (!participant) return { success: false, error: "PARTICIPANT_NOT_FOUND" };

  const { error } = await adminClient
    .from("chat_participants")
    .update({ room_role: parsed.data.role })
    .eq("room_id", parsed.data.roomId)
    .eq("user_id", parsed.data.userId);

  if (error) return { success: false, error: "PARTICIPANT_NOT_FOUND" };
  revalidatePath(`/admin/chat/groups/${parsed.data.roomId}/settings`);
  return { success: true };
}
