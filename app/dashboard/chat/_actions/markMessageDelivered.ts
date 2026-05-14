"use server";

import { z } from "zod";
import { getChatAuthContext } from "@/lib/chat/server";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  messageId: z.string().uuid(),
  roomId: z.string().uuid(),
});

export async function markMessageDelivered(input: z.input<typeof schema>): Promise<
  | { success: true; data: { updated: boolean } }
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

  if (room?.room_type !== "direct_message") return { success: true, data: { updated: false } };

  const { data: participant } = await adminClient
    .from("chat_participants")
    .select("room_id")
    .eq("room_id", parsed.data.roomId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (!participant) return { success: false, error: "UNAUTHORIZED" };

  const { error, count } = await adminClient
    .from("chat_messages")
    .update({ delivery_status: "delivered" }, { count: "exact" })
    .eq("id", parsed.data.messageId)
    .eq("room_id", parsed.data.roomId)
    .eq("delivery_status", "sent")
    .neq("sender_id", auth.userId);

  if (error) return { success: false, error: "VALIDATION_ERROR" };
  return { success: true, data: { updated: (count ?? 0) > 0 } };
}
