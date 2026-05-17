"use server";

import { z } from "zod";
import { getChatAuthContext, normalizeMediaSettings } from "@/lib/chat/server";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  roomId: z.string().uuid(),
  mimeType: z.string().startsWith("audio/"),
});

export async function createVoiceUploadUrl(input: z.input<typeof schema>): Promise<
  | { success: true; path: string; token: string }
  | { success: false; error: "UNAUTHORIZED" | "AUDIO_NOT_ALLOWED" | "CANNOT_SEND_MESSAGES" | "VALIDATION_ERROR" }
> {
  const auth = await getChatAuthContext();
  if (!auth) return { success: false, error: "UNAUTHORIZED" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { success: false, error: "VALIDATION_ERROR" };

  const adminClient = createAdminClient();
  const [{ data: room }, { data: participant }] = await Promise.all([
    adminClient
      .from("chat_rooms")
      .select("media_settings, is_deleted")
      .eq("id", parsed.data.roomId)
      .maybeSingle(),
    adminClient
      .from("chat_participants")
      .select("room_id, can_send_messages")
      .eq("room_id", parsed.data.roomId)
      .eq("user_id", auth.userId)
      .maybeSingle(),
  ]);

  if (!participant) return { success: false, error: "UNAUTHORIZED" };
  if (participant.can_send_messages === false) {
    return { success: false, error: "CANNOT_SEND_MESSAGES" };
  }
  if (!room || room.is_deleted) return { success: false, error: "VALIDATION_ERROR" };
  if (!normalizeMediaSettings(room.media_settings).audio_allowed) {
    return { success: false, error: "AUDIO_NOT_ALLOWED" };
  }

  const extension = parsed.data.mimeType.includes("mp4") ? "m4a" : "webm";
  const path = `chat/${parsed.data.roomId}/voice-${crypto.randomUUID()}.${extension}`;
  const { data, error } = await adminClient.storage.from("secure-chat-media").createSignedUploadUrl(path);

  if (error || !data?.token) return { success: false, error: "VALIDATION_ERROR" };
  return { success: true, path, token: data.token };
}
