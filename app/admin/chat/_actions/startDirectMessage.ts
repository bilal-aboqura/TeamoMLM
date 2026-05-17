"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getChatAuthContext } from "@/lib/chat/server";
import { OPEN_MEDIA_SETTINGS } from "@/lib/chat/types";

const schema = z.object({
  userId: z.string().uuid(),
});

export async function startDirectMessage(input: z.input<typeof schema>): Promise<
  | { success: true; roomId: string }
  | { success: false; error: "UNAUTHORIZED" | "USER_NOT_FOUND" | "VALIDATION_ERROR" }
> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { success: false, error: "VALIDATION_ERROR" };

  const auth = await getChatAuthContext();
  if (!auth || auth.globalRole !== "admin") return { success: false, error: "UNAUTHORIZED" };
  if (parsed.data.userId === auth.userId) return { success: false, error: "VALIDATION_ERROR" };

  const adminClient = createAdminClient();
  const { data: targetProfile } = await adminClient
    .from("chat_profiles")
    .select("user_id, display_name")
    .eq("user_id", parsed.data.userId)
    .maybeSingle();

  if (!targetProfile) return { success: false, error: "USER_NOT_FOUND" };

  const { data: adminRooms } = await adminClient
    .from("chat_participants")
    .select("room_id")
    .eq("user_id", auth.userId);

  const adminRoomIds = (adminRooms ?? []).map((row) => row.room_id);
  if (adminRoomIds.length > 0) {
    const { data: existing } = await adminClient
      .from("chat_participants")
      .select("room_id, chat_rooms!inner(id, room_type, is_deleted)")
      .eq("user_id", parsed.data.userId)
      .in("room_id", adminRoomIds)
      .eq("chat_rooms.room_type", "direct_message")
      .eq("chat_rooms.is_deleted", false)
      .limit(1)
      .maybeSingle();

    if (existing?.room_id) {
      return { success: true, roomId: existing.room_id };
    }
  }

  const { data: room, error: roomError } = await adminClient
    .from("chat_rooms")
    .insert({
      room_type: "direct_message",
      name: targetProfile.display_name,
      media_settings: OPEN_MEDIA_SETTINGS,
      created_by: auth.userId,
    })
    .select("id")
    .single();

  if (roomError || !room) return { success: false, error: "VALIDATION_ERROR" };

  const { error: participantError } = await adminClient.from("chat_participants").insert([
    { room_id: room.id, user_id: auth.userId, room_role: "admin" },
    { room_id: room.id, user_id: parsed.data.userId, room_role: "member" },
  ]);

  if (participantError) return { success: false, error: "VALIDATION_ERROR" };

  revalidatePath("/admin/chat");
  revalidatePath("/dashboard/chat");
  return { success: true, roomId: room.id };
}
