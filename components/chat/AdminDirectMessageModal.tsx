"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, Search, X } from "lucide-react";
import { startDirectMessage } from "@/app/admin/chat/_actions/startDirectMessage";
import type { ChatProfilePickerUser } from "@/lib/chat/admin-users";

type Props = {
  users: ChatProfilePickerUser[];
};

export function AdminDirectMessageModal({ users }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return users;
    return users.filter((user) =>
      user.display_name.toLocaleLowerCase().includes(normalized)
    );
  }, [query, users]);

  function startChat(userId: string) {
    setError(null);
    setPendingUserId(userId);
    startTransition(async () => {
      const result = await startDirectMessage({ userId });
      setPendingUserId(null);
      if (!result.success) {
        setError("تعذر فتح المحادثة المباشرة.");
        return;
      }
      setOpen(false);
      router.push(`/admin/chat/${result.roomId}`);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
      >
        <MessageCircle className="h-4 w-4" />
        بدء محادثة مباشرة
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end bg-slate-950/40 p-3 sm:items-center sm:justify-center" dir="rtl">
          <div className="w-full max-w-lg rounded-lg bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">بدء محادثة مباشرة</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="إغلاق"
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
                placeholder="ابحث عن مستخدم"
              />
            </label>

            {error && <p className="mb-2 text-xs font-bold text-rose-600">{error}</p>}

            <div className="max-h-80 space-y-1 overflow-y-auto rounded-lg border border-slate-100 p-2">
              {filteredUsers.map((user) => (
                <button
                  key={user.user_id}
                  type="button"
                  onClick={() => startChat(user.user_id)}
                  disabled={isPending}
                  className="flex w-full items-center justify-between gap-3 rounded-lg p-2 text-start hover:bg-slate-50 disabled:opacity-60"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-slate-700">
                      {user.display_name}
                    </span>
                    <span className="text-xs text-slate-400">{user.global_role}</span>
                  </span>
                  <span className="rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">
                    {pendingUserId === user.user_id ? "جار الفتح..." : "بدء"}
                  </span>
                </button>
              ))}
              {filteredUsers.length === 0 && (
                <p className="p-6 text-center text-sm text-slate-500">لا توجد نتائج</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
