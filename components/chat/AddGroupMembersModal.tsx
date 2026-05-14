"use client";
// Client boundary: searchable selection modal for adding existing users to a group.

import { FormEvent, useMemo, useState, useTransition } from "react";
import { Plus, Search, X } from "lucide-react";
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

  function toggle(userId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
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
        onClick={() => {
          setOpen(true);
          setError(null);
          setMessage(null);
        }}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
        aria-label="إضافة أعضاء إلى المجموعة"
      >
        <Plus className="h-4 w-4" />
        إضافة أعضاء
      </button>
      {message && <p className="mt-2 text-xs font-bold text-emerald-700">{message}</p>}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/40 p-3 sm:items-center sm:justify-center" dir="rtl">
          <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-lg bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">إضافة أعضاء</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="إغلاق نافذة إضافة الأعضاء"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mb-3 flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                placeholder="ابحث باسم المستخدم"
              />
            </label>

            <div className="max-h-80 space-y-1 overflow-y-auto rounded-lg border border-slate-100 p-2">
              {filteredMembers.map((member) => (
                <label
                  key={member.user_id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-slate-50"
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
                  <span className="text-xs text-slate-400">{member.global_role}</span>
                </label>
              ))}
              {filteredMembers.length === 0 && (
                <p className="p-6 text-center text-sm text-slate-500">لا توجد نتائج</p>
              )}
            </div>

            {error && <p className="mt-3 text-xs font-bold text-rose-600">{error}</p>}
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isPending || selected.size === 0}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                إضافة المحددين
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
