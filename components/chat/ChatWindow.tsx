"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { deleteMessage } from "@/app/admin/chat/_actions/deleteMessage";
import { getMessages } from "@/app/dashboard/chat/_actions/getMessages";
import { markMessageDelivered } from "@/app/dashboard/chat/_actions/markMessageDelivered";
import { markMessagesAsRead } from "@/app/dashboard/chat/_actions/markMessagesAsRead";
import type { ChatRoomSummary, MediaSettings, MessageCursor, MessagePayload } from "@/lib/chat/types";
import { MessageInput } from "./MessageInput";
import { MessageList } from "./MessageList";
import { ReplyPreview, type QuotedMessage } from "./ReplyPreview";

type Props = {
  room: ChatRoomSummary;
  initialMessages: MessagePayload[];
  initialNextCursor: MessageCursor | null;
  currentUserId: string;
  accessibleRooms?: ChatRoomSummary[];
  isAdmin?: boolean;
};

function isOptimisticMessage(message: MessagePayload) {
  return message.id.startsWith("optimistic-");
}

function mergeServerMessages(
  current: MessagePayload[],
  incoming: MessagePayload[]
): MessagePayload[] {
  const incomingIds = new Set(incoming.map((message) => message.id));
  const retained = current.filter(
    (message) => !isOptimisticMessage(message) && !incomingIds.has(message.id)
  );

  return [...retained, ...incoming].sort((first, second) => {
    const timeDiff =
      new Date(first.serverTimestamp).getTime() -
      new Date(second.serverTimestamp).getTime();
    if (timeDiff !== 0) return timeDiff;
    return first.id.localeCompare(second.id);
  });
}

export function ChatWindow({
  room,
  initialMessages,
  initialNextCursor,
  currentUserId,
  accessibleRooms = [],
  isAdmin = false,
}: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState(initialMessages);
  const [nextCursor, setNextCursor] = useState<MessageCursor | null>(initialNextCursor);
  const [mediaSettings, setMediaSettings] = useState<MediaSettings>(room.mediaSettings);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [replyTo, setReplyTo] = useState<QuotedMessage | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const refreshLatest = useCallback(async () => {
    const result = await getMessages({ roomId: room.id, adminView: isAdmin });
    setMessages((current) => mergeServerMessages(current, result.messages));
    setNextCursor(result.nextCursor);
  }, [isAdmin, room.id]);

  async function loadOlder() {
    if (!nextCursor) return;
    setLoadingOlder(true);
    const result = await getMessages({ roomId: room.id, cursor: nextCursor, adminView: isAdmin });
    setMessages((current) => mergeServerMessages(current, result.messages));
    setNextCursor(result.nextCursor);
    setLoadingOlder(false);
  }

  useEffect(() => {
    const channel = supabase
      .channel(`room:${room.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages", filter: `room_id=eq.${room.id}` },
        (payload) => {
          if (
            payload.eventType === "INSERT" &&
            room.roomType === "direct_message" &&
            payload.new.sender_id !== currentUserId
          ) {
            void markMessageDelivered({ roomId: room.id, messageId: payload.new.id as string });
          }
          void refreshLatest();
        }
      )
      .subscribe();

    const settingsChannel = supabase
      .channel(`room-settings:${room.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_rooms", filter: `id=eq.${room.id}` },
        (payload) => {
          const next = payload.new.media_settings as MediaSettings | undefined;
          if (next) setMediaSettings(next);
        }
      )
      .subscribe();

    const participantChannel = supabase
      .channel(`room-participant:${room.id}:${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "chat_participants",
          filter: `user_id=eq.${currentUserId}`,
        },
        () => {
          router.push("/dashboard/chat?removed=1");
        }
      )
      .subscribe();

    const refreshTimer = window.setInterval(() => {
      void refreshLatest();
    }, 2000);

    return () => {
      window.clearInterval(refreshTimer);
      void supabase.removeChannel(channel);
      void supabase.removeChannel(settingsChannel);
      void supabase.removeChannel(participantChannel);
    };
  }, [currentUserId, refreshLatest, room.id, router, supabase]);

  useEffect(() => {
    if (room.roomType !== "direct_message") return;
    const pending = new Set<string>();
    let timer: number | null = null;
    const flush = () => {
      const ids = Array.from(pending).slice(0, 50);
      pending.clear();
      if (ids.length > 0) void markMessagesAsRead({ roomId: room.id, messageIds: ids });
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const element = entry.target as HTMLElement;
          const id = element.dataset.messageId;
          if (entry.isIntersecting && id && element.dataset.unread === "true") {
            pending.add(id);
          }
        }
        if (timer) window.clearTimeout(timer);
        timer = window.setTimeout(flush, 300);
      },
      { threshold: 0.65 }
    );

    document.querySelectorAll<HTMLElement>(".msg-bubble[data-unread='true']").forEach((node) => observer.observe(node));
    return () => {
      if (timer) window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [messages, room.id, room.roomType]);

  async function handleDelete(messageId: string) {
    await deleteMessage({ messageId });
    await refreshLatest();
  }

  return (
    <section className="flex h-[72vh] min-h-[430px] min-w-0 flex-col overflow-hidden rounded-lg border border-slate-100 bg-white shadow-sm sm:min-h-[540px] lg:h-[calc(100vh-7rem)]">
      <header className="border-b border-slate-100 px-4 py-3">
        <h1 className="text-base font-bold text-slate-900">{room.name}</h1>
        {room.memberCount !== null && room.roomType === "blind_group" && (
          <p className="mt-1 text-xs font-medium text-slate-500">{room.memberCount} أعضاء</p>
        )}
      </header>
      <MessageList
        messages={messages}
        nextCursor={nextCursor}
        loadingOlder={loadingOlder}
        onLoadOlder={loadOlder}
        roomId={room.id}
        roomType={room.roomType}
        rooms={accessibleRooms}
        isAdmin={isAdmin}
        onDelete={isAdmin ? handleDelete : undefined}
        onReply={setReplyTo}
        onForwarded={refreshLatest}
      />
      <ReplyPreview parentMessage={replyTo} onCancel={() => setReplyTo(null)} />
      <MessageInput
        roomId={room.id}
        mediaSettings={mediaSettings}
        parentMessageId={replyTo?.id ?? null}
        onOptimisticMessage={(message) => setMessages((current) => [...current, message])}
        onMessageSent={(optimisticId) => {
          setMessages((current) => current.filter((message) => message.id !== optimisticId));
          setReplyTo(null);
          void refreshLatest();
        }}
        onMessageFailed={(optimisticId) => {
          setMessages((current) => current.filter((message) => message.id !== optimisticId));
        }}
      />
    </section>
  );
}
