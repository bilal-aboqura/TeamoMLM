import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Settings } from "lucide-react";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { DeleteRoomButton } from "@/components/chat/DeleteRoomButton";
import { getMessages } from "@/app/dashboard/chat/_actions/getMessages";
import { getChatAuthContext, getParticipantRole, getRoomSummary } from "@/lib/chat/server";
import { listAdminRooms } from "@/lib/chat/rooms";

export default async function AdminChatRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const auth = await getChatAuthContext();
  if (!auth) redirect("/login");
  if (auth.globalRole !== "admin" && auth.globalRole !== "moderator") redirect("/dashboard");

  const { roomId } = await params;
  const participantRole = await getParticipantRole(roomId, auth.userId);
  if (auth.globalRole !== "admin" && participantRole !== "moderator") notFound();

  const [room, rooms, initial] = await Promise.all([
    getRoomSummary(roomId),
    listAdminRooms(auth),
    getMessages({ roomId, adminView: true }),
  ]);

  if (!room) notFound();

  return (
    <div className="space-y-4" dir="rtl">
      {auth.globalRole === "admin" && (
        <div className="flex flex-wrap justify-end gap-2">
          <DeleteRoomButton roomId={roomId} />
          {room.roomType === "blind_group" && (
            <Link
              href={`/admin/chat/groups/${roomId}/settings`}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
            >
              <Settings className="h-4 w-4" />
              إعدادات المجموعة
            </Link>
          )}
        </div>
      )}
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
        <div className="min-w-0">
          <ChatSidebar rooms={rooms} activeRoomId={roomId} basePath="/admin/chat" showMemberCounts />
        </div>
        <ChatWindow
          room={room}
          initialMessages={initial.messages}
          initialNextCursor={initial.nextCursor}
          currentUserId={auth.userId}
          accessibleRooms={rooms}
          showMemberCount
          isAdmin
        />
      </div>
    </div>
  );
}
