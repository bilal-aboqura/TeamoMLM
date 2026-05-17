"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getChatAuthContext } from "@/lib/chat/server";

const schema = z.object({
  roomId: z.string().uuid(),
  userId: z.string().uuid(),
  canSendMessages: z.boolean(),
});

export async function toggleParticipantSendPermission(input: z.input<typeof schema>): Promise<
  | { success: true }
  | { success: false; error: "UNAUTHORIZED" | "PARTICIPANT_NOT_FOUND" | "VALIDATION_ERROR" }
> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { success: false, error: "VALIDATION_ERROR" };

  const auth = await getChatAuthContext();
  if (!auth || auth.globalRole !== "admin") return { success: false, error: "UNAUTHORIZED" };
  if (parsed.data.userId === auth.userId) return { success: false, error: "VALIDATION_ERROR" };

  const adminClient = createAdminClient();
  const { data: participant } = await adminClient
    .from("chat_participants")
    .select("room_id, room_role")
    .eq("room_id", parsed.data.roomId)
    .eq("user_id", parsed.data.userId)
    .maybeSingle();

  if (!participant || participant.room_role === "admin") {
    return { success: false, error: "PARTICIPANT_NOT_FOUND" };
  }

  const { error } = await adminClient
    .from("chat_participants")
    .update({ can_send_messages: parsed.data.canSendMessages })
    .eq("room_id", parsed.data.roomId)
    .eq("user_id", parsed.data.userId);

  if (error) return { success: false, error: "VALIDATION_ERROR" };
  revalidatePath(`/admin/chat/groups/${parsed.data.roomId}/settings`);
  revalidatePath(`/admin/chat/${parsed.data.roomId}`);
  return { success: true };
}
