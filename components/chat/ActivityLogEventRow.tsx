import { Ban, CheckCircle2, LogIn } from "lucide-react";
import type { ActivityLogEvent } from "@/lib/chat/types";

type Props = {
  event: ActivityLogEvent;
};

function eventMeta(type: ActivityLogEvent["event_type"]) {
  if (type === "message_blocked") {
    return { label: "رسالة محظورة", icon: Ban, className: "border-amber-200 bg-amber-50 text-amber-700" };
  }
  if (type === "session_event") {
    return { label: "حدث جلسة", icon: LogIn, className: "border-slate-200 bg-slate-50 text-slate-700" };
  }
  return { label: "رسالة مرسلة", icon: CheckCircle2, className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
}

export function ActivityLogEventRow({ event }: Props) {
  const meta = eventMeta(event.event_type);
  const Icon = meta.icon;
  const roomName = typeof event.details.room_name === "string" ? event.details.room_name : "محادثة";
  const matchedWord = typeof event.details.matched_word === "string" ? event.details.matched_word : null;

  return (
    <article className={`rounded-lg border p-3 ${meta.className}`} dir="rtl">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/80">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-bold">{meta.label}</p>
            <time className="text-xs opacity-75">
              {new Intl.DateTimeFormat("ar", { dateStyle: "medium", timeStyle: "short" }).format(
                new Date(event.created_at)
              )}
            </time>
          </div>
          <p className="mt-1 text-sm opacity-90">
            {event.actor_display_name} · {roomName}
          </p>
          {matchedWord && <p className="mt-1 text-xs font-bold opacity-80">الكلمة: {matchedWord}</p>}
        </div>
      </div>
    </article>
  );
}
