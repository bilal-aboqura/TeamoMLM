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

  return hydrateRoomSummaries((rooms ?? []) as RoomRow[], { includeMemberCounts: false });
}

export async function listAdminRooms(auth: ChatAuthContext): Promise<ChatRoomSummary[]> {
  const adminClient = createAdminClient();

  if (auth.globalRole === "admin") {
    const { data } = await adminClient
      .from("chat_rooms")
      .select("id, room_type, name, description, media_settings, updated_at")
      .eq("is_deleted", false)
      .order("updated_at", { ascending: false });

    return hydrateRoomSummaries((data ?? []) as RoomRow[], { includeMemberCounts: true });
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

  return hydrateRoomSummaries((data ?? []) as RoomRow[], { includeMemberCounts: true });
}

export async function hydrateRoomSummaries(
  rooms: RoomRow[],
  options: { includeMemberCounts?: boolean } = {}
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

    summaries.push({
      id: room.id,
      roomType: normalizeRoomType(room.room_type),
      name: room.name ?? fallbackRoomName(room.room_type),
      description: room.description,
      memberCount,
      mediaSettings: normalizeMediaSettings(room.media_settings),
      updatedAt: room.updated_at,
    });
  }

  return summaries;
}
