"use client";

import { useMemo, useState, useTransition } from "react";
import { Search, Volume2, VolumeX } from "lucide-react";
import { toggleParticipantSendPermission } from "@/app/admin/chat/_actions/toggleParticipantSendPermission";

export type GroupMember = {
  userId: string;
  displayName: string;
  role: string;
  canSendMessages: boolean;
};

type Props = {
  roomId: string;
  members: GroupMember[];
};

export function GroupMembersManager({ roomId, members }: Props) {
  const [query, setQuery] = useState("");
  const [localMembers, setLocalMembers] = useState(members);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredMembers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return localMembers;
    return localMembers.filter((member) =>
      `${member.displayName} ${member.role}`.toLocaleLowerCase().includes(normalized)
    );
  }, [localMembers, query]);

  function toggleMember(member: GroupMember) {
    setError(null);
    setPendingUserId(member.userId);
    const nextCanSend = !member.canSendMessages;
    startTransition(async () => {
      const result = await toggleParticipantSendPermission({
        roomId,
        userId: member.userId,
        canSendMessages: nextCanSend,
      });
      setPendingUserId(null);
      if (!result.success) {
        setError("تعذر تحديث صلاحية الإرسال.");
        return;
      }
      setLocalMembers((current) =>
        current.map((item) =>
          item.userId === member.userId
            ? { ...item, canSendMessages: nextCanSend }
            : item
        )
      );
    });
  }

  return (
    <div className="space-y-3">
      <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          placeholder="ابحث عن عضو"
        />
      </label>

      {error && <p className="text-xs font-bold text-rose-600">{error}</p>}

      <div className="divide-y divide-slate-100">
        {filteredMembers.map((member) => {
          const isAdmin = member.role === "admin";
          const isBusy = isPending && pendingUserId === member.userId;
          return (
            <div key={member.userId} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-800">{member.displayName}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                    {member.role}
                  </span>
                  {!member.canSendMessages && (
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-600">
                      مكتوم
                    </span>
                  )}
                </div>
              </div>
              {!isAdmin && (
                <button
                  type="button"
                  onClick={() => toggleMember(member)}
                  disabled={isBusy}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition disabled:opacity-60 ${
                    member.canSendMessages
                      ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
                >
                  {member.canSendMessages ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )}
                  {isBusy ? "جار التحديث..." : member.canSendMessages ? "كتم" : "إلغاء الكتم"}
                </button>
              )}
            </div>
          );
        })}
        {filteredMembers.length === 0 && (
          <p className="p-6 text-center text-sm text-slate-500">لا توجد نتائج</p>
        )}
      </div>
    </div>
  );
}
