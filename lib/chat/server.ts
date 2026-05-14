import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_MEDIA_SETTINGS,
  OPEN_MEDIA_SETTINGS,
  type ChatRoomSummary,
  type GlobalRole,
  type MediaSettings,
  type RoomRole,
  type RoomType,
} from "./types";

export type ChatAuthContext = {
  userId: string;
  globalRole: GlobalRole;
  displayName: string;
};

export const getChatAuthContext = cache(async (): Promise<ChatAuthContext | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const adminClient = createAdminClient();
  const [{ data: chatProfile }, { data: appProfile }] = await Promise.all([
    adminClient
      .from("chat_profiles")
      .select("display_name, global_role")
      .eq("user_id", user.id)
      .maybeSingle(),
    adminClient.from("users").select("full_name, role").eq("id", user.id).maybeSingle(),
  ]);

  const role = normalizeGlobalRole(
    chatProfile?.global_role ?? appProfile?.role ?? user.app_metadata?.role
  );

  return {
    userId: user.id,
    globalRole: role,
    displayName:
      chatProfile?.display_name ??
      appProfile?.full_name ??
      user.email?.split("@")[0] ??
      "مستخدم",
  };
});

export function normalizeGlobalRole(role: unknown): GlobalRole {
  if (role === "admin" || role === "moderator") return role;
  return "user";
}

export function normalizeRoomRole(role: unknown): RoomRole {
  if (role === "admin" || role === "moderator") return role;
  return "member";
}

export function normalizeRoomType(type: unknown): RoomType {
  if (
    type === "direct_message" ||
    type === "blind_group" ||
    type === "ticket" ||
    type === "other"
  ) {
    return type;
  }
  return "other";
}

export function normalizeMediaSettings(value: unknown): MediaSettings {
  if (!value || typeof value !== "object") return DEFAULT_MEDIA_SETTINGS;
  const settings = value as Partial<Record<keyof MediaSettings, unknown>>;
  return {
    images_allowed: settings.images_allowed === true,
    files_allowed: settings.files_allowed === true,
    audio_allowed: settings.audio_allowed === true,
  };
}

export function mediaSettingsForRoomType(roomType: RoomType): MediaSettings {
  return roomType === "direct_message" || roomType === "ticket"
    ? OPEN_MEDIA_SETTINGS
    : DEFAULT_MEDIA_SETTINGS;
}

export async function getParticipantRole(
  roomId: string,
  userId: string
): Promise<RoomRole | null> {
  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from("chat_participants")
    .select("room_role")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();

  return data ? normalizeRoomRole(data.room_role) : null;
}

export async function getRoomSummary(roomId: string): Promise<ChatRoomSummary | null> {
  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from("chat_rooms")
    .select("id, room_type, name, description, media_settings, updated_at")
    .eq("id", roomId)
    .eq("is_deleted", false)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    roomType: normalizeRoomType(data.room_type),
    name: data.name ?? "محادثة",
    description: data.description ?? null,
    memberCount: null,
    mediaSettings: normalizeMediaSettings(data.media_settings),
    updatedAt: data.updated_at,
  };
}
