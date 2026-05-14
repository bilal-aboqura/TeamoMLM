"use client";

import { useEffect, useRef } from "react";
import type { ChatRoomSummary, MessageCursor, MessagePayload, RoomType } from "@/lib/chat/types";
import { MessageBubble } from "./MessageBubble";
import { MessageContextMenu } from "./MessageContextMenu";
import type { QuotedMessage } from "./ReplyPreview";

type Props = {
  messages: MessagePayload[];
  nextCursor: MessageCursor | null;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  roomId: string;
  roomType: RoomType;
  rooms: ChatRoomSummary[];
  isAdmin?: boolean;
  onDelete?: (messageId: string) => void;
  onReply?: (message: QuotedMessage) => void;
  onForwarded?: () => void;
};

export function MessageList({
  messages,
  nextCursor,
  loadingOlder,
  onLoadOlder,
  roomId,
  roomType,
  rooms,
  isAdmin = false,
  onDelete,
  onReply,
  onForwarded,
}: Props) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-4">
      {nextCursor && (
        <button
          type="button"
          onClick={onLoadOlder}
          disabled={loadingOlder}
          className="mx-auto rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 disabled:opacity-60"
        >
          {loadingOlder ? "جارٍ التحميل..." : "تحميل المزيد"}
        </button>
      )}
      {messages.map((message) => (
        <MessageContextMenu
          key={message.id}
          message={message}
          sourceRoomId={roomId}
          rooms={rooms}
          isDeleted={message.isDeleted}
          onReply={(quoted) => onReply?.(quoted)}
          onForwarded={onForwarded}
        >
          <MessageBubble message={message} roomType={roomType} isAdmin={isAdmin} onDelete={onDelete} />
        </MessageContextMenu>
      ))}
      {messages.length === 0 && (
        <div className="m-auto rounded-lg border border-dashed border-slate-200 bg-white px-5 py-4 text-sm text-slate-500">
          لا توجد رسائل بعد
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
