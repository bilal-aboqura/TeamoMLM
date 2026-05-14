"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { MessageCircle, Plus, Ticket, Users } from "lucide-react";
import { createTicket } from "@/app/dashboard/chat/_actions/createTicket";
import type { ChatRoomSummary } from "@/lib/chat/types";

type Props = {
  rooms: ChatRoomSummary[];
  activeRoomId?: string;
  basePath?: "/dashboard/chat" | "/admin/chat";
  showTicketButton?: boolean;
};

function roomHref(basePath: string, id: string) {
  return `${basePath}/${id}`;
}

function RoomLink({
  room,
  active,
  basePath,
}: {
  room: ChatRoomSummary;
  active: boolean;
  basePath: string;
}) {
  const Icon = room.roomType === "blind_group" ? Users : room.roomType === "ticket" ? Ticket : MessageCircle;

  return (
    <Link
      href={roomHref(basePath, room.id)}
      className={`flex items-center gap-3 rounded-lg border p-3 transition ${
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-slate-100 bg-white text-slate-700 hover:border-slate-200"
      }`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">{room.name}</span>
        {room.memberCount !== null && (
          <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
            {room.memberCount} أعضاء
          </span>
        )}
      </span>
    </Link>
  );
}

function TicketForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const result = await createTicket({
      subject: String(form.get("subject") ?? ""),
      initialMessage: String(form.get("initialMessage") ?? ""),
    });
    setPending(false);
    if (!result.success) {
      setError("تعذر فتح التذكرة. راجع البيانات وحاول مرة أخرى.");
      return;
    }
    router.push(`/dashboard/chat/${result.roomId}`);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-emerald-700"
      >
        <Plus className="h-4 w-4" />
        فتح تذكرة دعم
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded-lg border border-emerald-100 bg-emerald-50 p-3">
      <input
        name="subject"
        required
        minLength={5}
        maxLength={120}
        placeholder="عنوان التذكرة"
        className="w-full rounded-lg border border-emerald-100 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-300"
      />
      <textarea
        name="initialMessage"
        required
        minLength={10}
        maxLength={4000}
        rows={3}
        placeholder="اكتب رسالتك"
        className="w-full resize-none rounded-lg border border-emerald-100 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-300"
      />
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          {pending ? "جارٍ الإرسال..." : "إرسال"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600"
        >
          إلغاء
        </button>
      </div>
    </form>
  );
}

export function ChatSidebar({
  rooms,
  activeRoomId,
  basePath = "/dashboard/chat",
  showTicketButton = false,
}: Props) {
  const directRooms = rooms.filter((room) => room.roomType === "direct_message");
  const groupRooms = rooms.filter((room) => room.roomType === "blind_group");
  const ticketRooms = rooms.filter((room) => room.roomType === "ticket");

  return (
    <aside className="space-y-4">
      {showTicketButton && <TicketForm />}
      <section className="space-y-2">
        <h2 className="text-xs font-bold text-slate-400">الرسائل المباشرة</h2>
        {directRooms.map((room) => (
          <RoomLink key={room.id} room={room} active={room.id === activeRoomId} basePath={basePath} />
        ))}
      </section>
      <section className="space-y-2">
        <h2 className="text-xs font-bold text-slate-400">المجموعات</h2>
        {groupRooms.map((room) => (
          <RoomLink key={room.id} room={room} active={room.id === activeRoomId} basePath={basePath} />
        ))}
      </section>
      <section className="space-y-2">
        <h2 className="text-xs font-bold text-slate-400">التذاكر</h2>
        {ticketRooms.map((room) => (
          <RoomLink key={room.id} room={room} active={room.id === activeRoomId} basePath={basePath} />
        ))}
      </section>
      {rooms.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white p-5 text-center text-sm text-slate-500">
          لا توجد محادثات بعد
        </div>
      )}
    </aside>
  );
}
