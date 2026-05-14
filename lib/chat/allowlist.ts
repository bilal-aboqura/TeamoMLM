import type { MediaSettings } from "./types";

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

export const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
] as const;

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export function getMimeKind(mime: string): "image" | "file" | "audio" | null {
  if ((ALLOWED_IMAGE_TYPES as readonly string[]).includes(mime)) return "image";
  if ((ALLOWED_FILE_TYPES as readonly string[]).includes(mime)) return "file";
  if (mime.startsWith("audio/")) return "audio";
  return null;
}

export function isAllowedMimeType(
  mime: string,
  mediaSettings: MediaSettings
): boolean {
  const kind = getMimeKind(mime);
  if (kind === "image") return mediaSettings.images_allowed;
  if (kind === "file") return mediaSettings.files_allowed;
  if (kind === "audio") return mediaSettings.audio_allowed;
  return false;
}

export function isAllowedByTypeOnly(mime: string): boolean {
  return getMimeKind(mime) !== null;
}
