import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageCircle, Plus } from "lucide-react";
import { AdminDirectMessageModal } from "@/components/chat/AdminDirectMessageModal";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { createAdminClient } from "@/lib/supabase/admin";
import { listAllChatProfilePickerUsers } from "@/lib/chat/admin-users";
import { getChatAuthContext } from "@/lib/chat/server";
import { listAdminRooms } from "@/lib/chat/rooms";

export default async function AdminChatPage() {
  const auth = await getChatAuthContext();
  if (!auth) redirect("/login");
  if (auth.globalRole !== "admin" && auth.globalRole !== "moderator") redirect("/dashboard");

  const [rooms, directMessageUsers] = await Promise.all([
    listAdminRooms(auth),
    auth.globalRole === "admin" ? listAllChatProfilePickerUsers([auth.userId]) : Promise.resolve([]),
  ]);
  const adminClient = createAdminClient();
  const roomMembers = new Map<string, string[]>();

  for (const room of rooms) {
    const { data: participants } = await adminClient
      .from("chat_participants")
      .select("chat_profiles(display_name)")
      .eq("room_id", room.id)
      .limit(8);

    roomMembers.set(
      room.id,
      (participants ?? []).map((participant) => {
        const profile = Array.isArray(participant.chat_profiles)
          ? participant.chat_profiles[0]
          : participant.chat_profiles;
        return profile?.display_name ?? "مستخدم";
      })
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">إدارة المحادثات</h1>
          <p className="mt-1 text-sm text-slate-500">صندوق المحادثات والمجموعات والتذاكر</p>
        </div>
        {auth.globalRole === "admin" && (
          <Link
            href="/admin/chat/groups/new"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            مجموعة جديدة
          </Link>
        )}
      </div>
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
        <div className="min-w-0">
          {auth.globalRole === "admin" && (
            <div className="mb-3">
              <AdminDirectMessageModal users={directMessageUsers} />
            </div>
          )}
          <ChatSidebar rooms={rooms} basePath="/admin/chat" showMemberCounts />
        </div>
        <main className="min-h-[560px] rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
          {rooms.length === 0 ? (
            <div className="flex min-h-[500px] items-center justify-center text-center">
              <div>
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <MessageCircle className="h-7 w-7" />
                </span>
                <h2 className="mt-4 text-lg font-bold text-slate-900">لا توجد محادثات</h2>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-slate-900">كل المحادثات</h2>
              {rooms.map((room) => (
                <Link
                  key={room.id}
                  href={`/admin/chat/${room.id}`}
                  className="block rounded-lg border border-slate-100 p-4 transition hover:border-emerald-200"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900">{room.name}</p>
                      <p className="mt-1 break-words text-xs text-slate-500">
                        {(roomMembers.get(room.id) ?? []).join("، ") || "لا يوجد أعضاء"}
                      </p>
                    </div>
                    <span className="w-fit rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500">
                      {room.roomType}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
