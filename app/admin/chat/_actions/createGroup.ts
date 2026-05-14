"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_MEDIA_SETTINGS } from "@/lib/chat/types";
import { getChatAuthContext } from "@/lib/chat/server";

const schema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(300).optional(),
  memberIds: z.array(z.string().uuid()).min(1).max(500),
});

export async function createGroup(input: z.input<typeof schema>): Promise<
  | { success: true; roomId: string }
  | { success: false; error: "UNAUTHORIZED" | "VALIDATION_ERROR" | "MEMBERS_NOT_FOUND" }
> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { success: false, error: "VALIDATION_ERROR" };

  const auth = await getChatAuthContext();
  if (!auth || auth.globalRole !== "admin") return { success: false, error: "UNAUTHORIZED" };

  const memberIds = Array.from(new Set(parsed.data.memberIds.filter((id) => id !== auth.userId)));
  const adminClient = createAdminClient();
  const { data: members } = await adminClient
    .from("chat_profiles")
    .select("user_id")
    .in("user_id", memberIds);

  if ((members?.length ?? 0) !== memberIds.length) {
    return { success: false, error: "MEMBERS_NOT_FOUND" };
  }

  const { data: room, error: roomError } = await adminClient
    .from("chat_rooms")
    .insert({
      room_type: "blind_group",
      name: parsed.data.name,
      description: parsed.data.description || null,
      media_settings: DEFAULT_MEDIA_SETTINGS,
      created_by: auth.userId,
    })
    .select("id")
    .single();

  if (roomError || !room) return { success: false, error: "VALIDATION_ERROR" };

  const participants = [
    { room_id: room.id, user_id: auth.userId, room_role: "admin" },
    ...memberIds.map((userId) => ({ room_id: room.id, user_id: userId, room_role: "member" })),
  ];

  const { error } = await adminClient.from("chat_participants").insert(participants);
  if (error) return { success: false, error: "VALIDATION_ERROR" };

  revalidatePath("/admin/chat");
  return { success: true, roomId: room.id };
}
