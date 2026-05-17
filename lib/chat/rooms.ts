import { createAdminClient } from "@/lib/supabase/admin";
import {
  normalizeMediaSettings,
  normalizeRoomType,
  type ChatAuthContext,
} from "./server";
import type { ChatRoomSummary } from "./types";

type RoomRow = {
  id: string;
  room_type: string;
  name: string | null;
  description: string | null;
  media_settings: unknown;
  updated_at: string;
};

type ParticipantReadState = {
  last_read_position: string | null;
};

function fallbackRoomName(roomType: string) {
  if (roomType === "direct_message") return "محادثة مباشرة";
  if (roomType === "ticket") return "تذكرة دعم";
  if (roomType === "blind_group") return "مجموعة";
  return "محادثة";
}

export async function listRoomsForUser(userId: string): Promise<ChatRoomSummary[]> {
  const adminClient = createAdminClient();
  const { data: participants } = await adminClient
    .from("chat_participants")
    .select("room_id")
    .eq("user_id", userId);

  const roomIds = Array.from(new Set((participants ?? []).map((row) => row.room_id)));
  if (roomIds.length === 0) return [];

  const { data: rooms } = await adminClient
    .from("chat_rooms")
    .select("id, room_type, name, description, media_settings, updated_at")
    .in("id", roomIds)
    .eq("is_deleted", false)
    .order("updated_at", { ascending: false });

  return hydrateRoomSummaries((rooms ?? []) as RoomRow[], {
    includeMemberCounts: false,
    unreadForUserId: userId,
  });
}

export async function listAdminRooms(auth: ChatAuthContext): Promise<ChatRoomSummary[]> {
  const adminClient = createAdminClient();

  if (auth.globalRole === "admin") {
    const { data } = await adminClient
      .from("chat_rooms")
      .select("id, room_type, name, description, media_settings, updated_at")
      .eq("is_deleted", false)
      .order("updated_at", { ascending: false });

    return hydrateRoomSummaries((data ?? []) as RoomRow[], {
      includeMemberCounts: true,
      unreadForUserId: auth.userId,
    });
  }

  const { data: participants } = await adminClient
    .from("chat_participants")
    .select("room_id")
    .eq("user_id", auth.userId)
    .eq("room_role", "moderator");

  const roomIds = (participants ?? []).map((row) => row.room_id);
  if (roomIds.length === 0) return [];

  const { data } = await adminClient
    .from("chat_rooms")
    .select("id, room_type, name, description, media_settings, updated_at")
    .in("id", roomIds)
    .eq("is_deleted", false)
    .order("updated_at", { ascending: false });

  return hydrateRoomSummaries((data ?? []) as RoomRow[], {
    includeMemberCounts: true,
    unreadForUserId: auth.userId,
  });
}

export async function hydrateRoomSummaries(
  rooms: RoomRow[],
  options: { includeMemberCounts?: boolean; unreadForUserId?: string } = {}
): Promise<ChatRoomSummary[]> {
  const adminClient = createAdminClient();
  const summaries: ChatRoomSummary[] = [];

  for (const room of rooms) {
    let memberCount: number | null = null;
    if (options.includeMemberCounts && room.room_type === "blind_group") {
      const { count } = await adminClient
        .from("chat_participants")
        .select("*", { count: "exact", head: true })
        .eq("room_id", room.id);
      memberCount = count ?? 0;
    }

    const unreadCount = options.unreadForUserId
      ? await countUnreadMessages(room.id, options.unreadForUserId)
      : 0;

    summaries.push({
      id: room.id,
      roomType: normalizeRoomType(room.room_type),
      name: room.name ?? fallbackRoomName(room.room_type),
      description: room.description,
      memberCount,
      mediaSettings: normalizeMediaSettings(room.media_settings),
      updatedAt: room.updated_at,
      unreadCount,
    });
  }

  return summaries;
}

async function countUnreadMessages(roomId: string, userId: string): Promise<number> {
  const adminClient = createAdminClient();
  const { data: participant } = await adminClient
    .from("chat_participants")
    .select("last_read_position")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!participant) return 0;

  let lastReadTimestamp: string | null = null;
  const readState = participant as ParticipantReadState;
  if (readState.last_read_position) {
    const { data: lastRead } = await adminClient
      .from("chat_messages")
      .select("server_timestamp")
      .eq("id", readState.last_read_position)
      .maybeSingle();
    lastReadTimestamp = lastRead?.server_timestamp ?? null;
  }

  let query = adminClient
    .from("chat_messages")
    .select("*", { count: "exact", head: true })
    .eq("room_id", roomId)
    .eq("is_deleted", false)
    .neq("sender_id", userId);

  if (lastReadTimestamp) {
    query = query.gt("server_timestamp", lastReadTimestamp);
  }

  const { count } = await query;
  return count ?? 0;
}
