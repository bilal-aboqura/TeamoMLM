"use server";

import { z } from "zod";
import { getChatAuthContext } from "@/lib/chat/server";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  roomId: z.string().uuid(),
  messageIds: z.array(z.string().uuid()).min(1).max(50),
});

export async function markMessagesAsRead(input: z.input<typeof schema>): Promise<
  | { success: true; data: { updatedCount: number } }
  | { success: false; error: "UNAUTHORIZED" | "VALIDATION_ERROR" }
> {
  const auth = await getChatAuthContext();
  if (!auth) return { success: false, error: "UNAUTHORIZED" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { success: false, error: "VALIDATION_ERROR" };

  const adminClient = createAdminClient();
  const { data: room } = await adminClient
    .from("chat_rooms")
    .select("room_type")
    .eq("id", parsed.data.roomId)
    .maybeSingle();

  if (room?.room_type !== "direct_message") return { success: true, data: { updatedCount: 0 } };

  const { data: participant } = await adminClient
    .from("chat_participants")
    .select("room_id")
    .eq("room_id", parsed.data.roomId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (!participant) return { success: false, error: "UNAUTHORIZED" };

  const { error, count } = await adminClient
    .from("chat_messages")
    .update({ delivery_status: "read" }, { count: "exact" })
    .eq("room_id", parsed.data.roomId)
    .in("id", parsed.data.messageIds)
    .neq("sender_id", auth.userId);

  if (error) return { success: false, error: "VALIDATION_ERROR" };

  await adminClient
    .from("chat_participants")
    .update({ last_read_position: parsed.data.messageIds[parsed.data.messageIds.length - 1] })
    .eq("room_id", parsed.data.roomId)
    .eq("user_id", auth.userId);

  return { success: true, data: { updatedCount: count ?? 0 } };
}
