"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getChatAuthContext } from "@/lib/chat/server";

const schema = z.object({
  sourceMsgId: z.string().uuid(),
  destinationRoomId: z.string().uuid(),
});

export async function forwardMessage(input: z.input<typeof schema>): Promise<
  | { success: true; messageId: string }
  | { success: false; error: "UNAUTHORIZED" | "SOURCE_DELETED" | "NOT_PARTICIPANT" | "CONTENT_POLICY_VIOLATION" | "VALIDATION_ERROR" }
> {
  const auth = await getChatAuthContext();
  if (!auth) return { success: false, error: "UNAUTHORIZED" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { success: false, error: "VALIDATION_ERROR" };

  const adminClient = createAdminClient();
  const { data: participant } = await adminClient
    .from("chat_participants")
    .select("room_id")
    .eq("room_id", parsed.data.destinationRoomId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (!participant) return { success: false, error: "NOT_PARTICIPANT" };

  const { data: source } = await adminClient
    .from("chat_messages")
    .select("content, attachment_path, attachment_name, attachment_size, attachment_mime_type, attachment_metadata, parent_message_id, is_deleted")
    .eq("id", parsed.data.sourceMsgId)
    .maybeSingle();

  if (!source) return { success: false, error: "VALIDATION_ERROR" };
  if (source.is_deleted) return { success: false, error: "SOURCE_DELETED" };

  let snapshot: { sender_label: string; content_excerpt: string; is_deleted: boolean } | null = null;
  if (source.parent_message_id) {
    const { data: parent } = await adminClient
      .from("chat_messages")
      .select("content, is_deleted")
      .eq("id", source.parent_message_id)
      .maybeSingle();
    snapshot = {
      sender_label: "عضو",
      content_excerpt: parent?.is_deleted ? "الرسالة الأصلية محذوفة" : String(parent?.content ?? "").slice(0, 100),
      is_deleted: parent?.is_deleted === true,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("send_secure_message", {
    p_room_id: parsed.data.destinationRoomId,
    p_content: source.content ?? null,
    p_attachment_path: source.attachment_path ?? null,
    p_attachment_name: source.attachment_name ?? null,
    p_attachment_size: source.attachment_size ?? null,
    p_attachment_mime_type: source.attachment_mime_type ?? null,
    p_attachment_metadata: source.attachment_metadata ?? null,
    p_parent_message_id: null,
    p_is_forwarded: true,
    p_forwarded_quote_snapshot: snapshot,
  });

  if (error?.message === "CONTENT_POLICY_VIOLATION") return { success: false, error: "CONTENT_POLICY_VIOLATION" };
  if (error?.message === "NOT_PARTICIPANT") return { success: false, error: "NOT_PARTICIPANT" };
  if (error) return { success: false, error: "VALIDATION_ERROR" };

  return { success: true, messageId: data?.id ?? parsed.data.sourceMsgId };
}
