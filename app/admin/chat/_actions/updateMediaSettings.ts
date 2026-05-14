"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getChatAuthContext, getParticipantRole } from "@/lib/chat/server";

const schema = z.object({
  roomId: z.string().uuid(),
  settings: z.object({
    images_allowed: z.boolean(),
    files_allowed: z.boolean(),
    audio_allowed: z.boolean(),
  }),
});

export async function updateMediaSettings(input: z.input<typeof schema>): Promise<
  { success: true } | { success: false; error: "UNAUTHORIZED" | "ROOM_NOT_FOUND" }
> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { success: false, error: "ROOM_NOT_FOUND" };

  const auth = await getChatAuthContext();
  const role = auth ? await getParticipantRole(parsed.data.roomId, auth.userId) : null;
  if (!auth || auth.globalRole !== "admin" || role !== "admin") {
    return { success: false, error: "UNAUTHORIZED" };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.rpc("update_chat_media_settings", {
    p_room_id: parsed.data.roomId,
    p_images_allowed: parsed.data.settings.images_allowed,
    p_files_allowed: parsed.data.settings.files_allowed,
    p_audio_allowed: parsed.data.settings.audio_allowed,
  });

  if (error) return { success: false, error: "ROOM_NOT_FOUND" };
  revalidatePath(`/admin/chat/groups/${parsed.data.roomId}/settings`);
  revalidatePath(`/dashboard/chat/${parsed.data.roomId}`);
  return { success: true };
}
