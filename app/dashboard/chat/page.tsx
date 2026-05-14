import { redirect } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { getChatAuthContext } from "@/lib/chat/server";
import { listRoomsForUser } from "@/lib/chat/rooms";

export default async function DashboardChatPage({
  searchParams,
}: {
  searchParams: Promise<{ removed?: string }>;
}) {
  const auth = await getChatAuthContext();
  if (!auth) redirect("/login");

  const rooms = await listRoomsForUser(auth.userId);
  if (rooms.length === 1) redirect(`/dashboard/chat/${rooms[0].id}`);
  const query = await searchParams;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6" dir="rtl">
      <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[320px_1fr]">
        <ChatSidebar rooms={rooms} showTicketButton />
        <main className="flex min-h-[620px] items-center justify-center rounded-lg border border-slate-100 bg-white p-8 text-center shadow-sm">
          <div>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <MessageCircle className="h-7 w-7" />
            </span>
            <h1 className="mt-4 text-xl font-bold text-slate-900">المحادثات</h1>
            <p className="mt-2 text-sm text-slate-500">
              {query.removed
                ? "لم تعد عضوًا في هذه المجموعة"
                : rooms.length === 0
                  ? "لا توجد محادثات بعد"
                  : "اختر محادثة من القائمة"}
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
