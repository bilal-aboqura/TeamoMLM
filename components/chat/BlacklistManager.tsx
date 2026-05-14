"use client";
// Client boundary: manages form state and a Realtime admin-only blacklist feed.

import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { addBlacklistWord } from "@/app/admin/chat/blacklist/_actions/addBlacklistWord";
import { deleteBlacklistWord } from "@/app/admin/chat/blacklist/_actions/deleteBlacklistWord";
import { createClient } from "@/lib/supabase/client";
import type { BlacklistEntry, BlacklistMatchMode } from "@/lib/chat/types";

type Props = {
  initialWords: BlacklistEntry[];
};

function modeLabel(mode: BlacklistMatchMode) {
  return mode === "whole_word" ? "كلمة كاملة" : "تطابق جزئي";
}

export function BlacklistManager({ initialWords }: Props) {
  const [words, setWords] = useState(initialWords);
  const [wordOriginal, setWordOriginal] = useState("");
  const [matchMode, setMatchMode] = useState<BlacklistMatchMode>("whole_word");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const channel = supabase
      .channel("chat-blacklist")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_blacklist" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setWords((current) => [payload.new as BlacklistEntry, ...current]);
          }
          if (payload.eventType === "DELETE") {
            setWords((current) => current.filter((word) => word.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addBlacklistWord({ wordOriginal, matchMode });
      if (!result.success) {
        setError("تعذر إضافة الكلمة.");
        return;
      }
      setWords((current) =>
        current.some((word) => word.id === result.data.id) ? current : [result.data, ...current]
      );
      setWordOriginal("");
    });
  }

  function handleDelete(wordId: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteBlacklistWord({ wordId });
      if (!result.success) {
        setError("تعذر حذف الكلمة.");
        return;
      }
      setWords((current) => current.filter((word) => word.id !== wordId));
    });
  }

  return (
    <div className="space-y-4" dir="rtl">
      <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
          <label className="space-y-1">
            <span className="text-xs font-bold text-slate-500">الكلمة المحظورة</span>
            <input
              value={wordOriginal}
              onChange={(event) => setWordOriginal(event.target.value.slice(0, 200))}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-emerald-400"
              maxLength={200}
            />
          </label>
          <div className="flex h-10 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            {(["whole_word", "substring"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setMatchMode(mode)}
                className={`px-3 text-xs font-bold transition ${
                  matchMode === mode ? "bg-emerald-600 text-white" : "text-slate-600"
                }`}
                aria-label={modeLabel(mode)}
              >
                {modeLabel(mode)}
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={isPending || wordOriginal.trim().length === 0}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-50"
            aria-label="إضافة كلمة محظورة"
          >
            <Plus className="h-4 w-4" />
            إضافة
          </button>
        </div>
        {error && <p className="mt-2 text-xs font-bold text-rose-600">{error}</p>}
      </form>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3 text-start">الكلمة</th>
              <th className="px-4 py-3 text-start">طريقة التطابق</th>
              <th className="px-4 py-3 text-start">تاريخ الإضافة</th>
              <th className="w-12 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {words.map((word) => (
              <tr key={word.id}>
                <td className="px-4 py-3 font-bold text-slate-800">{word.word_original}</td>
                <td className="px-4 py-3 text-slate-600">{modeLabel(word.match_mode)}</td>
                <td className="px-4 py-3 text-slate-500">
                  {new Intl.DateTimeFormat("ar", { dateStyle: "medium", timeStyle: "short" }).format(
                    new Date(word.created_at)
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => handleDelete(word.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"
                    aria-label="حذف كلمة محظورة"
                    title="حذف"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {words.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-500">
                  لا توجد كلمات محظورة بعد
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
