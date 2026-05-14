"use client";

import { Download, CornerDownRight, Trash2 } from "lucide-react";
import type { MessagePayload, RoomType } from "@/lib/chat/types";
import { AudioPlayer } from "./AudioPlayer";
import { MessageStatusBadge } from "./MessageStatusBadge";

type Props = {
  message: MessagePayload;
  roomType?: RoomType;
  isAdmin?: boolean;
  onDelete?: (messageId: string) => void;
};

function formatSize(size: number) {
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} ك.ب`;
  return `${(size / (1024 * 1024)).toFixed(1)} م.ب`;
}

export function MessageBubble({ message, roomType = "other", isAdmin = false, onDelete }: Props) {
  if (message.isDeleted && !isAdmin) return null;

  const own = message.isOwn;
  const bubbleClass = message.isDeleted
    ? "border-slate-200 bg-slate-50 text-slate-400 italic"
    : own
      ? "border-emerald-600 bg-emerald-600 text-white"
      : message.senderRole === "admin" || message.senderRole === "moderator"
        ? "border-slate-200 bg-slate-100 text-slate-800"
        : "border-slate-200 bg-white text-slate-700";

  return (
    <div
      className={`msg-bubble group flex ${own ? "justify-end" : "justify-start"}`}
      data-message-id={message.id}
      data-unread={message.deliveryStatus !== "read" && !message.isOwn ? "true" : "false"}
    >
      <div className={`max-w-[92%] rounded-lg border px-3 py-2 shadow-sm sm:max-w-[78%] ${bubbleClass}`}>
        <div className="mb-1 flex items-center gap-2">
          <span className={`text-[11px] font-bold ${own ? "text-emerald-50" : "text-slate-500"}`}>
            {message.senderLabel}
          </span>
          {isAdmin && !message.isDeleted && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(message.id)}
              className="opacity-0 transition group-hover:opacity-100"
              aria-label="حذف الرسالة"
              title="حذف الرسالة"
            >
              <Trash2 className="h-3.5 w-3.5 text-rose-500" />
            </button>
          )}
        </div>
        {message.isDeleted ? (
          <p className="text-sm">تم حذف هذه الرسالة</p>
        ) : (
          <>
            {message.isForwarded && (
              <p className={`mb-1 flex items-center gap-1 text-[11px] font-bold ${own ? "text-emerald-50" : "text-slate-500"}`}>
                <CornerDownRight className="h-3 w-3" />
                تم إعادة التوجيه
              </p>
            )}
            {(message.forwardedQuoteSnapshot || message.replyPreview) && (
              <div className={`mb-2 border-s-4 px-2 py-1 text-xs ${own ? "border-white/60 bg-white/10" : "border-emerald-400 bg-emerald-50 text-slate-700"}`}>
                <p className="font-bold">
                  {message.forwardedQuoteSnapshot?.sender_label ?? message.replyPreview?.senderLabel}
                </p>
                <p className="truncate">
                  {(message.forwardedQuoteSnapshot?.is_deleted ?? message.replyPreview?.isDeleted)
                    ? "الرسالة الأصلية محذوفة"
                    : message.forwardedQuoteSnapshot?.content_excerpt ?? message.replyPreview?.contentExcerpt}
                </p>
              </div>
            )}
            {message.content && <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>}
            {message.attachment && (
              <div className="mt-2 overflow-hidden rounded-lg border border-black/10 bg-white/70 text-slate-700">
                {message.attachment.mimeType.startsWith("audio/") && message.attachment.signedUrl ? (
                  <AudioPlayer
                    src={message.attachment.signedUrl}
                    durationSeconds={message.attachment.metadata?.duration_seconds ?? 0}
                    waveform={message.attachment.metadata?.waveform}
                  />
                ) : message.attachment.mimeType.startsWith("image/") && message.attachment.signedUrl ? (
                  <img
                    src={message.attachment.signedUrl}
                    alt={message.attachment.name}
                    className="max-h-64 w-full object-cover"
                  />
                ) : null}
                {!message.attachment.mimeType.startsWith("audio/") && (
                  <a
                    href={message.attachment.signedUrl ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-3 py-2 text-xs font-bold"
                  >
                    <Download className="h-4 w-4" />
                    <span className="min-w-0 flex-1 truncate">{message.attachment.name}</span>
                    <span className="text-slate-400">{formatSize(message.attachment.size)}</span>
                  </a>
                )}
              </div>
            )}
            {own && (
              <div className="mt-1 flex justify-end">
                <MessageStatusBadge status={message.deliveryStatus} isDM={roomType === "direct_message"} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
