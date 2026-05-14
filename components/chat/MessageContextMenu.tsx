"use client";
// Client boundary: pointer interactions for reply and forward actions.

import { ReactNode, useState } from "react";
import { Forward, Reply } from "lucide-react";
import type { ChatRoomSummary, MessagePayload } from "@/lib/chat/types";
import type { QuotedMessage } from "./ReplyPreview";
import { ForwardPicker } from "./ForwardPicker";

type Props = {
  message: MessagePayload;
  sourceRoomId: string;
  rooms: ChatRoomSummary[];
  isDeleted: boolean;
  onReply: (message: QuotedMessage) => void;
  onForwarded?: () => void;
  children: ReactNode;
};

export function MessageContextMenu({
  message,
  sourceRoomId,
  rooms,
  isDeleted,
  onReply,
  onForwarded,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const [forwardOpen, setForwardOpen] = useState(false);

  function reply() {
    setOpen(false);
    onReply({
      id: message.id,
      senderLabel: String(message.senderLabel),
      contentExcerpt: message.content ?? message.attachment?.name ?? "",
      isDeleted: message.isDeleted,
    });
  }

  return (
    <div
      className="relative"
      onContextMenu={(event) => {
        event.preventDefault();
        if (!isDeleted) setOpen(true);
      }}
    >
      <div onDoubleClick={() => !isDeleted && reply()}>{children}</div>
      {open && (
        <>
          <button className="fixed inset-0 z-20 cursor-default" type="button" onClick={() => setOpen(false)} aria-label="إغلاق القائمة" />
          <div className="absolute top-2 z-30 min-w-36 rounded-lg border border-slate-200 bg-white p-1 text-sm font-bold text-slate-700 shadow-lg">
            <button
              type="button"
              onClick={reply}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-50"
              aria-label="الرد على الرسالة"
            >
              <Reply className="h-4 w-4" />
              رد
            </button>
            {!message.isDeleted && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setForwardOpen(true);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-50"
                aria-label="إعادة توجيه الرسالة"
              >
                <Forward className="h-4 w-4" />
                إعادة توجيه
              </button>
            )}
          </div>
        </>
      )}
      <ForwardPicker
        sourceMsgId={message.id}
        sourceRoomId={sourceRoomId}
        rooms={rooms}
        open={forwardOpen}
        onClose={() => setForwardOpen(false)}
        onForwarded={onForwarded}
      />
    </div>
  );
}
