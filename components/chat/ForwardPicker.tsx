"use client";
// Client boundary: modal state and forwarding action for accessible rooms.

import { useMemo, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { forwardMessage } from "@/app/dashboard/chat/_actions/forwardMessage";
import type { ChatRoomSummary } from "@/lib/chat/types";

type Props = {
  sourceMsgId: string;
  sourceRoomId: string;
  rooms: ChatRoomSummary[];
  open: boolean;
  onClose: () => void;
  onForwarded?: () => void;
};

export function ForwardPicker({ sourceMsgId, sourceRoomId, rooms, open, onClose, onForwarded }: Props) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const filtered = useMemo(
    () =>
      rooms.filter(
        (room) =>
          room.id !== sourceRoomId &&
          room.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
      ),
    [query, rooms, sourceRoomId]
  );

  if (!open) return null;

  function handleForward(destinationRoomId: string) {
    setError(null);
    startTransition(async () => {
      const result = await forwardMessage({ sourceMsgId, destinationRoomId });
      if (!result.success) {
        setError("تعذر إعادة توجيه الرسالة.");
        return;
      }
      onForwarded?.();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/40 p-3 sm:items-center sm:justify-center" dir="rtl">
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">إعادة توجيه</h2>
          <button type="button" onClick={onClose} className="h-8 w-8 rounded-lg text-slate-500" aria-label="إغلاق">
            <X className="h-4 w-4" />
          </button>
        </div>
        <label className="mb-3 flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            placeholder="بحث"
          />
        </label>
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {filtered.map((room) => (
            <button
              key={room.id}
              type="button"
              onClick={() => handleForward(room.id)}
              disabled={isPending}
              className="block w-full rounded-lg border border-slate-100 px-3 py-2 text-start hover:border-emerald-200 disabled:opacity-50"
            >
              <span className="block font-bold text-slate-800">{room.name}</span>
              <span className="text-xs text-slate-500">{room.roomType}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
              لا توجد محادثات أخرى متاحة
            </p>
          )}
        </div>
        {error && <p className="mt-3 text-xs font-bold text-rose-600">{error}</p>}
      </div>
    </div>
  );
}
