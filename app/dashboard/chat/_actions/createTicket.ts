"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getChatAuthContext } from "@/lib/chat/server";
import { OPEN_MEDIA_SETTINGS } from "@/lib/chat/types";

const schema = z.object({
  subject: z.string().min(5).max(120),
  initialMessage: z.string().min(10).max(4000),
});

export async function createTicket(input: z.input<typeof schema>): Promise<
  | { success: true; roomId: string }
  | { success: false; error: "UNAUTHORIZED" | "VALIDATION_ERROR" }
> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { success: false, error: "VALIDATION_ERROR" };

  const auth = await getChatAuthContext();
  if (!auth || auth.globalRole !== "user") return { success: false, error: "UNAUTHORIZED" };

  const adminClient = createAdminClient();
  const { data: adminProfile } = await adminClient
    .from("chat_profiles")
    .select("user_id")
    .eq("global_role", "admin")
    .limit(1)
    .maybeSingle();

  if (!adminProfile) return { success: false, error: "VALIDATION_ERROR" };

  const { data: room, error: roomError } = await adminClient
    .from("chat_rooms")
    .insert({
      room_type: "ticket",
      name: parsed.data.subject,
      media_settings: OPEN_MEDIA_SETTINGS,
      created_by: auth.userId,
    })
    .select("id")
    .single();

  if (roomError || !room) return { success: false, error: "VALIDATION_ERROR" };

  const { error: participantError } = await adminClient.from("chat_participants").insert([
    { room_id: room.id, user_id: auth.userId, room_role: "member" },
    { room_id: room.id, user_id: adminProfile.user_id, room_role: "admin" },
  ]);

  if (participantError) return { success: false, error: "VALIDATION_ERROR" };

  const { error: messageError } = await adminClient.from("chat_messages").insert({
    room_id: room.id,
    sender_id: auth.userId,
    content: parsed.data.initialMessage,
  });

  if (messageError) return { success: false, error: "VALIDATION_ERROR" };

  revalidatePath("/dashboard/chat");
  revalidatePath("/admin/chat");
  return { success: true, roomId: room.id };
}
