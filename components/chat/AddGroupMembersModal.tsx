"use client";
// Client boundary: searchable selection modal for adding existing users to a group.

import { FormEvent, useMemo, useState, useTransition } from "react";
import { CheckSquare, Plus, Search, Square, X } from "lucide-react";
import { addMembersToGroup } from "@/app/admin/chat/_actions/addMembersToGroup";
import type { ChatProfilePickerUser } from "@/lib/chat/admin-users";

type Props = {
  roomId: string;
  availableMembers: ChatProfilePickerUser[];
};

export function AddGroupMembersModal({ roomId, availableMembers }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredMembers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return availableMembers;
    return availableMembers.filter((member) =>
      member.display_name.toLocaleLowerCase().includes(normalized)
    );
  }, [availableMembers, query]);

  const allFilteredSelected =
    filteredMembers.length > 0 &&
    filteredMembers.every((m) => selected.has(m.user_id));

  function toggle(userId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((current) => {
      const next = new Set(current);
      if (allFilteredSelected) {
        // deselect all visible
        for (const m of filteredMembers) next.delete(m.user_id);
      } else {
        // select all visible
        for (const m of filteredMembers) next.add(m.user_id);
      }
      return next;
    });
  }

  function handleOpen() {
    setOpen(true);
    setError(null);
    setMessage(null);
  }

  function handleClose() {
    setOpen(false);
    setQuery("");
    setSelected(new Set());
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const userIds = Array.from(selected);
    if (userIds.length === 0) {
      setError("اختر عضوا واحدا على الأقل.");
      return;
    }

    startTransition(async () => {
      const result = await addMembersToGroup({ roomId, userIds });
      if (!result.success) {
        setError("تعذر إضافة الأعضاء.");
        return;
      }
      setSelected(new Set());
      setQuery("");
      setMessage(`تمت إضافة ${result.addedCount} عضو.`);
      if (result.addedCount > 0) setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-emerald-700"
        aria-label="إضافة أعضاء إلى المجموعة"
      >
        <Plus className="h-4 w-4" />
        إضافة أعضاء
      </button>
      {message && <p className="mt-2 text-xs font-bold text-emerald-700">{message}</p>}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-slate-950/40 p-3 sm:items-center sm:justify-center"
          dir="rtl"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl"
          >
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">إضافة أعضاء</h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  {availableMembers.length} عضو متاح
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100"
                aria-label="إغلاق نافذة إضافة الأعضاء"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search */}
            <label className="mb-3 flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-emerald-400 focus-within:bg-white transition-colors">
              <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                placeholder="ابحث باسم المستخدم..."
                autoComplete="off"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} className="text-slate-400 hover:text-slate-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </label>

            {/* Select All / stats row */}
            <div className="mb-2 flex items-center justify-between px-1">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
              >
                {allFilteredSelected ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                {allFilteredSelected ? "إلغاء تحديد الكل" : "تحديد الكل"}
              </button>
              <span className="text-xs text-slate-400">
                {filteredMembers.length} نتيجة
                {selected.size > 0 && (
                  <span className="mr-2 rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-700">
                    {selected.size} محدد
                  </span>
                )}
              </span>
            </div>

            {/* Member list */}
            <div className="max-h-72 space-y-0.5 overflow-y-auto rounded-xl border border-slate-100 p-1.5">
              {filteredMembers.map((member) => (
                <label
                  key={member.user_id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                    selected.has(member.user_id)
                      ? "bg-emerald-50"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(member.user_id)}
                    onChange={() => toggle(member.user_id)}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-700">
                    {member.display_name}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                    {member.global_role}
                  </span>
                </label>
              ))}
              {filteredMembers.length === 0 && (
                <p className="p-6 text-center text-sm text-slate-500">لا توجد نتائج</p>
              )}
            </div>

            {error && <p className="mt-3 text-xs font-bold text-rose-600">{error}</p>}

            {/* Footer */}
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isPending || selected.size === 0}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
              >
                {isPending ? "جارٍ الإضافة…" : `إضافة ${selected.size > 0 ? selected.size + " عضو" : "المحددين"}`}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
