"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getChatAuthContext } from "@/lib/chat/server";

const schema = z.object({ messageId: z.string().uuid() });

export async function getAttachmentUrl(input: z.input<typeof schema>): Promise<
  | { success: true; signedUrl: string; expiresIn: 3600 }
  | { success: false; error: "UNAUTHORIZED" | "NOT_FOUND" }
> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { success: false, error: "NOT_FOUND" };

  const auth = await getChatAuthContext();
  if (!auth) return { success: false, error: "UNAUTHORIZED" };

  const adminClient = createAdminClient();
  const { data: message } = await adminClient
    .from("chat_messages")
    .select("room_id, attachment_path")
    .eq("id", parsed.data.messageId)
    .maybeSingle();

  if (!message?.attachment_path) return { success: false, error: "NOT_FOUND" };

  const { data: participant } = await adminClient
    .from("chat_participants")
    .select("room_id")
    .eq("room_id", message.room_id)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (!participant && auth.globalRole !== "admin") {
    return { success: false, error: "UNAUTHORIZED" };
  }

  const { data, error } = await adminClient.storage
    .from("secure-chat-media")
    .createSignedUrl(message.attachment_path, 3600);

  if (error || !data?.signedUrl) return { success: false, error: "NOT_FOUND" };
  return { success: true, signedUrl: data.signedUrl, expiresIn: 3600 };
}
