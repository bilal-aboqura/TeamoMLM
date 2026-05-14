"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getChatAuthContext, getParticipantRole, normalizeRoomRole } from "@/lib/chat/server";
import type { ForwardedQuoteSnapshot, MessagePayload, RoomRole, VoiceAttachmentMetadata } from "@/lib/chat/types";

const getMessagesSchema = z.object({
  roomId: z.string().uuid(),
  cursor: z
    .object({
      timestamp: z.string().min(1),
      id: z.string().uuid(),
    })
    .optional(),
  limit: z.number().int().min(1).max(50).default(50),
  adminView: z.boolean().optional(),
});

export type GetMessagesInput = z.input<typeof getMessagesSchema>;

export async function getMessages(input: GetMessagesInput): Promise<{
  messages: MessagePayload[];
  nextCursor: { timestamp: string; id: string } | null;
}> {
  const parsed = getMessagesSchema.safeParse(input);
  if (!parsed.success) return { messages: [], nextCursor: null };

  const auth = await getChatAuthContext();
  if (!auth) return { messages: [], nextCursor: null };

  const { roomId, cursor, limit, adminView } = parsed.data;
  const adminClient = createAdminClient();
  const callerRoomRole = await getParticipantRole(roomId, auth.userId);
  const canUseFullVisibility =
    adminView === true &&
    (auth.globalRole === "admin" || callerRoomRole === "moderator" || callerRoomRole === "admin");

  if (!callerRoomRole && !canUseFullVisibility) return { messages: [], nextCursor: null };

  const { data: room } = await adminClient
    .from("chat_rooms")
    .select("room_type")
    .eq("id", roomId)
    .eq("is_deleted", false)
    .maybeSingle();

  if (!room) return { messages: [], nextCursor: null };

  let query = adminClient
    .from("chat_messages")
    .select(
      "id, room_id, sender_id, content, attachment_path, attachment_name, attachment_size, attachment_mime_type, attachment_metadata, server_timestamp, is_deleted, delivery_status, parent_message_id, is_forwarded, forwarded_quote_snapshot"
    )
    .eq("room_id", roomId)
    .order("server_timestamp", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.or(
      `server_timestamp.lt.${cursor.timestamp},and(server_timestamp.eq.${cursor.timestamp},id.lt.${cursor.id})`
    );
  }

  const { data: rows, error } = await query;
  if (error || !rows?.length) return { messages: [], nextCursor: null };

  const senderIds = Array.from(
    new Set(rows.map((row) => row.sender_id).filter(Boolean) as string[])
  );

  const [{ data: participantRows }, { data: profileRows }] = await Promise.all([
    adminClient
      .from("chat_participants")
      .select("user_id, room_role")
      .eq("room_id", roomId)
      .in("user_id", senderIds.length ? senderIds : ["00000000-0000-0000-0000-000000000000"]),
    adminClient
      .from("chat_profiles")
      .select("user_id, display_name")
      .in("user_id", senderIds.length ? senderIds : ["00000000-0000-0000-0000-000000000000"]),
  ]);

  const roleByUser = new Map<string, RoomRole>();
  for (const participant of participantRows ?? []) {
    roleByUser.set(participant.user_id, normalizeRoomRole(participant.room_role));
  }

  const nameByUser = new Map<string, string>();
  for (const profile of profileRows ?? []) {
    nameByUser.set(profile.user_id, profile.display_name);
  }

  const parentIds = Array.from(
    new Set(rows.map((row) => row.parent_message_id).filter(Boolean) as string[])
  );
  const { data: parentRows } =
    parentIds.length > 0
      ? await adminClient
          .from("chat_messages")
          .select("id, sender_id, content, is_deleted")
          .in("id", parentIds)
      : { data: [] };
  const parentById = new Map((parentRows ?? []).map((row) => [row.id, row]));

  const payloads: MessagePayload[] = [];

  for (const row of rows) {
    const senderId = row.sender_id as string | null;
    const senderRole = senderId ? roleByUser.get(senderId) ?? "member" : "member";
    const isOwn = senderId === auth.userId;
    const isHiddenPeerMessage =
      !canUseFullVisibility &&
      room.room_type === "blind_group" &&
      senderRole === "member" &&
      !isOwn;

    if (isHiddenPeerMessage) continue;

    let senderLabel = "عضو";
    if (isOwn) senderLabel = "أنت";
    else if (canUseFullVisibility || senderRole === "admin" || senderRole === "moderator") {
      senderLabel = senderId ? nameByUser.get(senderId) ?? "مشرف" : "مشرف";
    }

    let signedUrl: string | null = null;
    if (row.attachment_path) {
      const { data } = await adminClient.storage
        .from("secure-chat-media")
        .createSignedUrl(row.attachment_path, 3600);
      signedUrl = data?.signedUrl ?? null;
    }

    const parent = row.parent_message_id ? parentById.get(row.parent_message_id) : null;
    const parentSenderId = parent?.sender_id as string | null | undefined;
    const parentRole = parentSenderId ? roleByUser.get(parentSenderId) ?? "member" : "member";
    const parentIsOwn = parentSenderId === auth.userId;
    let parentSenderLabel = "عضو";
    if (parentIsOwn) parentSenderLabel = "أنت";
    else if (canUseFullVisibility || parentRole === "admin" || parentRole === "moderator") {
      parentSenderLabel = parentSenderId ? nameByUser.get(parentSenderId) ?? "مشرف" : "مشرف";
    }

    payloads.push({
      id: row.id,
      content: row.content,
      senderLabel,
      senderRole,
      isOwn,
      serverTimestamp: row.server_timestamp,
      isDeleted: row.is_deleted,
      attachment: row.attachment_path
        ? {
            name: row.attachment_name ?? "ملف",
            size: Number(row.attachment_size ?? 0),
            mimeType: row.attachment_mime_type ?? "application/octet-stream",
            signedUrl,
            metadata: (row.attachment_metadata ?? null) as VoiceAttachmentMetadata | null,
          }
        : null,
      parentMessageId: row.parent_message_id,
      deliveryStatus: row.delivery_status ?? "sent",
      isForwarded: row.is_forwarded === true,
      forwardedQuoteSnapshot: (row.forwarded_quote_snapshot ?? null) as ForwardedQuoteSnapshot | null,
      replyPreview: parent
        ? {
            senderLabel: parentSenderLabel,
            contentExcerpt: parent.is_deleted
              ? "الرسالة الأصلية محذوفة"
              : String(parent.content ?? "").slice(0, 100),
            isDeleted: parent.is_deleted === true,
          }
        : null,
    });
  }

  const lastRawRow = rows[rows.length - 1];
  return {
    messages: payloads.reverse(),
    nextCursor:
      rows.length === limit
        ? { timestamp: lastRawRow.server_timestamp, id: lastRawRow.id }
        : null,
  };
}
