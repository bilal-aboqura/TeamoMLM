"use client";
// Client boundary: owns filters, pagination, archive toggle, and Realtime prepend behavior.

import { useEffect, useMemo, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { getActivityLogs } from "@/app/admin/chat/logs/_actions/getActivityLogs";
import { createClient } from "@/lib/supabase/client";
import type { ActivityLogEvent, ActivityLogEventType } from "@/lib/chat/types";
import { ActivityLogEventRow } from "./ActivityLogEventRow";

type Filter = ActivityLogEventType | "all";

type Props = {
  initialData: ActivityLogEvent[];
  initialMeta: { total: number; page: number; totalPages: number };
};

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "الكل" },
  { value: "message_sent", label: "مرسلة" },
  { value: "message_blocked", label: "محظورة" },
  { value: "session_event", label: "جلسات" },
];

export function ActivityLogFeed({ initialData, initialMeta }: Props) {
  const [events, setEvents] = useState(initialData);
  const [meta, setMeta] = useState(initialMeta);
  const [eventType, setEventType] = useState<Filter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [includeArchive, setIncludeArchive] = useState(false);
  const [isPending, startTransition] = useTransition();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const channel = supabase
      .channel("chat-activity-log")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_activity_log" },
        (payload) => {
          const next = payload.new as ActivityLogEvent;
          if (includeArchive) return;
          if (eventType !== "all" && next.event_type !== eventType) return;
          setEvents((current) => [next, ...current].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [eventType, includeArchive, supabase]);

  function load(page = 1) {
    startTransition(async () => {
      const result = await getActivityLogs({
        eventType,
        dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        dateTo: dateTo ? new Date(dateTo).toISOString() : undefined,
        page,
        includeArchive,
      });
      if (result.success) {
        setEvents(result.data);
        setMeta(result.meta);
      }
    });
  }

  function reset() {
    setEventType("all");
    setDateFrom("");
    setDateTo("");
    setIncludeArchive(false);
    startTransition(async () => {
      const result = await getActivityLogs({ page: 1 });
      if (result.success) {
        setEvents(result.data);
        setMeta(result.meta);
      }
    });
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 lg:flex-row lg:items-end">
        <div className="flex h-10 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {filters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setEventType(filter.value)}
              className={`px-3 text-xs font-bold transition ${
                eventType === filter.value ? "bg-emerald-600 text-white" : "text-slate-600"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <label className="space-y-1">
          <span className="text-xs font-bold text-slate-500">من</span>
          <input
            type="datetime-local"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-bold text-slate-500">إلى</span>
          <input
            type="datetime-local"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
          />
        </label>
        <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-600">
          <input
            type="checkbox"
            checked={includeArchive}
            onChange={(event) => setIncludeArchive(event.target.checked)}
          />
          عرض الأرشيف
        </label>
        <button
          type="button"
          onClick={() => load(1)}
          disabled={isPending}
          className="h-10 rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white disabled:opacity-50"
        >
          تطبيق
        </button>
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600"
          aria-label="إعادة ضبط الفلاتر"
          title="إعادة ضبط"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2">
        {events.map((event) => (
          <ActivityLogEventRow key={event.id} event={event} />
        ))}
        {events.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            لا توجد أحداث مطابقة
          </div>
        )}
      </div>

      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
        <button
          type="button"
          onClick={() => load(meta.page + 1)}
          disabled={isPending || meta.page >= meta.totalPages}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-2 font-bold text-slate-600 disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
          التالي
        </button>
        <span className="font-bold text-slate-500">
          {meta.page} / {meta.totalPages}
        </span>
        <button
          type="button"
          onClick={() => load(meta.page - 1)}
          disabled={isPending || meta.page <= 1}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-2 font-bold text-slate-600 disabled:opacity-40"
        >
          السابق
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
