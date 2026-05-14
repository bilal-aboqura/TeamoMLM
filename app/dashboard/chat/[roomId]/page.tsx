import { notFound, redirect } from "next/navigation";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { getMessages } from "../_actions/getMessages";
import { getChatAuthContext, getParticipantRole, getRoomSummary } from "@/lib/chat/server";
import { listRoomsForUser } from "@/lib/chat/rooms";

export default async function DashboardChatRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const auth = await getChatAuthContext();
  if (!auth) redirect("/login");

  const { roomId } = await params;
  const participantRole = await getParticipantRole(roomId, auth.userId);
  if (!participantRole) notFound();

  const [room, rooms, initial] = await Promise.all([
    getRoomSummary(roomId),
    listRoomsForUser(auth.userId),
    getMessages({ roomId }),
  ]);

  if (!room) notFound();

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6" dir="rtl">
      <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[320px_1fr]">
        <ChatSidebar rooms={rooms} activeRoomId={roomId} showTicketButton />
        <ChatWindow
          room={room}
          initialMessages={initial.messages}
          initialNextCursor={initial.nextCursor}
          currentUserId={auth.userId}
          accessibleRooms={rooms}
        />
      </div>
    </div>
  );
}
