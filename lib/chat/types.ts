export type GlobalRole = "admin" | "moderator" | "user";
export type RoomType = "direct_message" | "blind_group" | "ticket" | "other";
export type RoomRole = "admin" | "moderator" | "member";
export type DeliveryStatus = "sent" | "delivered" | "read";
export type BlacklistMatchMode = "whole_word" | "substring";
export type ActivityLogEventType = "message_sent" | "message_blocked" | "session_event";

export interface BlacklistEntry {
  id: string;
  word_original: string;
  word_normalized: string;
  match_mode: BlacklistMatchMode;
  created_by: string | null;
  created_at: string;
}

export interface ActivityLogEvent {
  id: string;
  event_type: ActivityLogEventType;
  room_id: string | null;
  actor_display_name: string;
  details: Record<string, unknown>;
  created_at: string;
  archived_at?: string;
}

export interface ForwardedQuoteSnapshot {
  sender_label: string;
  content_excerpt: string;
  is_deleted: boolean;
}

export interface VoiceAttachmentMetadata {
  waveform?: number[];
  duration_seconds?: number;
}
export type SenderLabel = "أنت" | "عضو" | string;

export interface MediaSettings {
  images_allowed: boolean;
  files_allowed: boolean;
  audio_allowed: boolean;
}

export interface ChatProfile {
  user_id: string;
  display_name: string;
  avatar_id: string;
  global_role: GlobalRole;
  created_at: string;
  updated_at: string;
}

export interface ChatRoom {
  id: string;
  room_type: RoomType;
  name: string | null;
  description: string | null;
  media_settings: MediaSettings;
  is_deleted: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatParticipant {
  room_id: string;
  user_id: string;
  room_role: RoomRole;
  last_read_position: string | null;
  is_muted: boolean;
  can_send_messages?: boolean;
  joined_at: string;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content: string | null;
  attachment_path: string | null;
  attachment_name: string | null;
  attachment_size: number | null;
  attachment_mime_type: string | null;
  attachment_metadata?: VoiceAttachmentMetadata | null;
  server_timestamp: string;
  is_deleted: boolean;
  delivery_status: DeliveryStatus | null;
  parent_message_id: string | null;
  is_forwarded?: boolean;
  forwarded_quote_snapshot?: ForwardedQuoteSnapshot | null;
  created_at: string;
  updated_at: string;
}

export interface MessagePayload {
  id: string;
  content: string | null;
  senderLabel: SenderLabel;
  senderRole: RoomRole;
  isOwn: boolean;
  serverTimestamp: string;
  isDeleted: boolean;
  attachment: {
    name: string;
    size: number;
    mimeType: string;
    signedUrl: string | null;
    metadata?: VoiceAttachmentMetadata | null;
  } | null;
  parentMessageId: string | null;
  deliveryStatus: DeliveryStatus;
  isForwarded: boolean;
  forwardedQuoteSnapshot: ForwardedQuoteSnapshot | null;
  replyPreview?: {
    senderLabel: string;
    contentExcerpt: string;
    isDeleted: boolean;
  } | null;
}

export interface MessageCursor {
  timestamp: string;
  id: string;
}

export interface ChatRoomSummary {
  id: string;
  roomType: RoomType;
  name: string;
  description: string | null;
  memberCount: number | null;
  mediaSettings: MediaSettings;
  updatedAt: string;
  unreadCount: number;
}

export const DEFAULT_MEDIA_SETTINGS: MediaSettings = {
  images_allowed: false,
  files_allowed: false,
  audio_allowed: false,
};

export const OPEN_MEDIA_SETTINGS: MediaSettings = {
  images_allowed: true,
  files_allowed: true,
  audio_allowed: false,
};
