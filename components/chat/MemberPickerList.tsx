"use client";

import { useMemo, useState } from "react";
import { CheckSquare, Search, Square, X } from "lucide-react";
import type { ChatProfilePickerUser } from "@/lib/chat/admin-users";

type Props = {
  members: ChatProfilePickerUser[];
};

export function MemberPickerList({ members }: Props) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    if (!q) return members;
    return members.filter((m) => m.display_name.toLocaleLowerCase().includes(q));
  }, [members, query]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((m) => selected.has(m.user_id));

  function toggle(userId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        for (const m of filtered) next.delete(m.user_id);
      } else {
        for (const m of filtered) next.add(m.user_id);
      }
      return next;
    });
  }

  return (
    <div className="space-y-2">
      {/* Search bar */}
      <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-emerald-400 focus-within:bg-white transition-colors">
        <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
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

      {/* Select all / count row */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={toggleAll}
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
          {filtered.length} نتيجة
          {selected.size > 0 && (
            <span className="mr-2 rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-700">
              {selected.size} محدد
            </span>
          )}
        </span>
      </div>

      {/* Member list */}
      <div className="max-h-72 space-y-0.5 overflow-y-auto rounded-xl border border-slate-100 p-1.5">
        {filtered.map((member) => (
          <label
            key={member.user_id}
            className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
              selected.has(member.user_id) ? "bg-emerald-50" : "hover:bg-slate-50"
            }`}
          >
            {/* Hidden real checkbox for form submission */}
            <input
              type="checkbox"
              name="memberIds"
              value={member.user_id}
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
        {filtered.length === 0 && (
          <p className="p-6 text-center text-sm text-slate-500">لا توجد نتائج</p>
        )}
      </div>

      {/* Total count hint */}
      <p className="text-right text-xs text-slate-400">
        إجمالي الأعضاء المتاحين: {members.length}
      </p>
    </div>
  );
}
