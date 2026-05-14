"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getChatAuthContext, getParticipantRole } from "@/lib/chat/server";

const schema = z.object({ messageId: z.string().uuid() });

export async function deleteMessage(input: z.input<typeof schema>): Promise<
  { success: true } | { success: false; error: "UNAUTHORIZED" | "NOT_FOUND" }
> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { success: false, error: "NOT_FOUND" };

  const auth = await getChatAuthContext();
  if (!auth) return { success: false, error: "UNAUTHORIZED" };

  const adminClient = createAdminClient();
  const { data: message } = await adminClient
    .from("chat_messages")
    .select("id, room_id")
    .eq("id", parsed.data.messageId)
    .maybeSingle();

  if (!message) return { success: false, error: "NOT_FOUND" };

  const roomRole = await getParticipantRole(message.room_id, auth.userId);
  const canDelete =
    auth.globalRole === "admin" || (auth.globalRole === "moderator" && roomRole === "moderator");

  if (!canDelete) return { success: false, error: "UNAUTHORIZED" };

  const { error } = await adminClient
    .from("chat_messages")
    .update({ is_deleted: true })
    .eq("id", parsed.data.messageId);

  if (error) return { success: false, error: "NOT_FOUND" };
  revalidatePath(`/admin/chat/${message.room_id}`);
  revalidatePath(`/dashboard/chat/${message.room_id}`);
  return { success: true };
}
