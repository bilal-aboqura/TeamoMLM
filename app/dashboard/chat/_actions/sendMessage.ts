"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getChatAuthContext, normalizeMediaSettings } from "@/lib/chat/server";
import { isAllowedMimeType, MAX_FILE_SIZE_BYTES, MAX_IMAGE_SIZE_BYTES, getMimeKind } from "@/lib/chat/allowlist";

const sendMessageSchema = z.object({
  roomId: z.string().uuid(),
  content: z.string().max(4000).optional(),
  parentMessageId: z.string().uuid().optional(),
  isForwarded: z.boolean().default(false),
  forwardedQuoteSnapshot: z
    .object({
      sender_label: z.string().max(160),
      content_excerpt: z.string().max(120),
      is_deleted: z.boolean(),
    })
    .optional(),
  attachment: z
    .object({
      path: z.string().min(1),
      name: z.string().max(255),
      size: z.number().positive().max(MAX_FILE_SIZE_BYTES),
      mimeType: z.string().min(1),
      metadata: z
        .object({
          waveform: z.array(z.number()).max(1200).optional(),
          duration_seconds: z.number().nonnegative().max(120).optional(),
        })
        .optional(),
    })
    .optional(),
});

type SendMessageInput = z.input<typeof sendMessageSchema>;
type SendMessageResult =
  | { success: true; messageId: string }
  | {
      success: false;
      error:
        | "UNAUTHORIZED"
        | "MEDIA_DISABLED"
        | "INVALID_FILE_TYPE"
        | "ROOM_NOT_FOUND"
        | "VALIDATION_ERROR"
        | "UPLOAD_FAILED"
        | "CONTENT_POLICY_VIOLATION"
        | "CANNOT_SEND_MESSAGES"
        | "AUDIO_NOT_ALLOWED";
      detail?: string;
    };

function fileFromForm(formData: FormData): File | null {
  const file = formData.get("attachment");
  return file instanceof File && file.size > 0 ? file : null;
}

export async function sendMessage(input: SendMessageInput | FormData): Promise<SendMessageResult> {
  const auth = await getChatAuthContext();
  if (!auth) return { success: false, error: "UNAUTHORIZED" };

  const adminClient = createAdminClient();
  const file = input instanceof FormData ? fileFromForm(input) : null;
  const raw =
    input instanceof FormData
      ? {
          roomId: String(input.get("roomId") ?? ""),
          content: String(input.get("content") ?? "").trim() || undefined,
          parentMessageId: String(input.get("parentMessageId") ?? "") || undefined,
        }
      : input;

  const parsed = sendMessageSchema.omit({ attachment: true }).safeParse(raw);
  if (!parsed.success) return { success: false, error: "VALIDATION_ERROR" };

  const { roomId, content } = parsed.data;
  const { data: room } = await adminClient
    .from("chat_rooms")
    .select("id, media_settings, is_deleted")
    .eq("id", roomId)
    .maybeSingle();

  if (!room || room.is_deleted) return { success: false, error: "ROOM_NOT_FOUND" };

  const { data: participant } = await adminClient
    .from("chat_participants")
    .select("room_id, is_muted")
    .eq("room_id", roomId)
    .eq("user_id", auth.userId)
    .maybeSingle();

  if (!participant) return { success: false, error: "UNAUTHORIZED" };
  if (participant.is_muted === true) {
    return { success: false, error: "CANNOT_SEND_MESSAGES" };
  }

  const storageId = crypto.randomUUID();
  let attachment = input instanceof FormData ? undefined : input.attachment;

  if (file) {
    const mediaSettings = normalizeMediaSettings(room.media_settings);
    const mimeKind = getMimeKind(file.type);
    if (!mimeKind) return { success: false, error: "INVALID_FILE_TYPE" };
    if (!isAllowedMimeType(file.type, mediaSettings)) {
      return { success: false, error: "MEDIA_DISABLED" };
    }
    if (mimeKind === "image" && file.size > MAX_IMAGE_SIZE_BYTES) {
      return { success: false, error: "VALIDATION_ERROR" };
    }
    if (file.size > MAX_FILE_SIZE_BYTES) return { success: false, error: "VALIDATION_ERROR" };

    const safeName = file.name.replace(/[^\w.\-\u0600-\u06FF ]+/g, "_").slice(0, 120);
    const path = `chat/${roomId}/${storageId}/${safeName}`;
    const buffer = await file.arrayBuffer();
    const { error: uploadError } = await adminClient.storage
      .from("secure-chat-media")
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (uploadError) return { success: false, error: "UPLOAD_FAILED" };
    attachment = { path, name: file.name, size: file.size, mimeType: file.type };
  }

  if (!content && !attachment) return { success: false, error: "VALIDATION_ERROR" };

  if (attachment) {
    const mediaSettings = normalizeMediaSettings(room.media_settings);
    if (getMimeKind(attachment.mimeType) === "audio" && !mediaSettings.audio_allowed) {
      return { success: false, error: "AUDIO_NOT_ALLOWED" };
    }
    if (!isAllowedMimeType(attachment.mimeType, mediaSettings)) {
      return { success: false, error: "MEDIA_DISABLED" };
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("send_secure_message", {
    p_room_id: roomId,
    p_content: content ?? null,
    p_attachment_path: attachment?.path ?? null,
    p_attachment_name: attachment?.name ?? null,
    p_attachment_size: attachment?.size ?? null,
    p_attachment_mime_type: attachment?.mimeType ?? null,
    p_attachment_metadata: attachment?.metadata ?? null,
    p_parent_message_id: parsed.data.parentMessageId ?? null,
    p_is_forwarded: parsed.data.isForwarded ?? false,
    p_forwarded_quote_snapshot: parsed.data.forwardedQuoteSnapshot ?? null,
  });

  if (error) {
    const message = error.message;
    if (message === "CONTENT_POLICY_VIOLATION") {
      return {
        success: false,
        error: "CONTENT_POLICY_VIOLATION",
        detail: auth.globalRole === "admin" ? error.details : undefined,
      };
    }
    if (message === "NOT_PARTICIPANT") return { success: false, error: "UNAUTHORIZED" };
    if (message === "CANNOT_SEND_MESSAGES") {
      return { success: false, error: "CANNOT_SEND_MESSAGES" };
    }
    if (message === "CROSS_ROOM_REPLY") return { success: false, error: "VALIDATION_ERROR" };
    return { success: false, error: "VALIDATION_ERROR" };
  }

  revalidatePath(`/dashboard/chat/${roomId}`);
  revalidatePath(`/admin/chat/${roomId}`);
  return { success: true, messageId: data?.id ?? storageId };
}
