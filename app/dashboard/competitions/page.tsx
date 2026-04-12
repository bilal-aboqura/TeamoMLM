import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Trophy, Calendar, Gift, Clock } from "lucide-react";
import { LocalDateTime } from "@/components/ui/LocalDate";

export const metadata = {
  title: "المسابقات اليومية",
};

export default async function CompetitionsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: competitions } = await supabase
    .from("competitions")
    .select("id, title, start_time, end_time, reward, terms")
    .eq("is_active", true)
    .order("start_time", { ascending: false });

  const now = Date.now();

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">المسابقات اليومية</h1>
          <p className="text-sm text-slate-500">شارك واربح جوائز حصرية</p>
        </div>
      </div>

      {(!competitions || competitions.length === 0) && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-14 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
            <Trophy className="w-6 h-6 text-slate-300" />
          </div>
          <p className="text-slate-600 font-medium">لا توجد مسابقات حالياً</p>
          <p className="text-slate-400 text-sm mt-1">ترقبوا مسابقات جديدة قريباً</p>
        </div>
      )}

      <div className="space-y-4">
        {(competitions ?? []).map((comp) => {
          const start = new Date(comp.start_time).getTime();
          const end = new Date(comp.end_time).getTime();
          const isUpcoming = now < start;
          const isLive = now >= start && now <= end;
          const isEnded = now > end;

          return (
            <div
              key={comp.id}
              className={`bg-white rounded-3xl border shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden transition-all duration-300 ${
                isLive
                  ? "border-emerald-200 shadow-[0_4px_20px_rgba(5,150,105,0.08)]"
                  : isUpcoming
                    ? "border-amber-100"
                    : "border-slate-100 opacity-60"
              }`}
            >
              {/* Top reward strip */}
              <div className={`px-6 py-3 flex items-center justify-between ${
                isLive
                  ? "bg-gradient-to-l from-emerald-50 to-emerald-100/50"
                  : isUpcoming
                    ? "bg-gradient-to-l from-amber-50 to-amber-100/50"
                    : "bg-slate-50"
              }`}>
                <div className="flex items-center gap-2">
                  <Gift className={`w-4 h-4 ${isLive ? "text-emerald-600" : isUpcoming ? "text-amber-600" : "text-slate-400"}`} />
                  <span className="text-xs font-medium text-slate-500">الجائزة</span>
                </div>
                <span className={`text-base font-black ${isLive ? "text-emerald-700" : isUpcoming ? "text-amber-700" : "text-slate-500"}`}>
                  {comp.reward}
                </span>
              </div>

              {/* Body */}
              <div className="p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h3 className="text-lg font-bold text-slate-900 leading-snug">
                    {comp.title}
                  </h3>

                  {/* Status badge */}
                  {isLive && (
                    <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      قيد التنفيذ
                    </span>
                  )}
                  {isUpcoming && (
                    <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100">
                      <Clock className="w-3 h-3" />
                      ستبدأ قريباً
                    </span>
                  )}
                  {isEnded && (
                    <span className="shrink-0 inline-flex items-center px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 text-xs font-bold">
                      انتهت
                    </span>
                  )}
                </div>

                {/* Timeframe */}
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-4" dir="ltr">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    <LocalDateTime iso={comp.start_time} options={{ month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }} />
                    {" — "}
                    <LocalDateTime iso={comp.end_time} options={{ month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }} />
                  </span>
                </div>

                {/* Terms */}
                {comp.terms && (
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 mb-1.5">الشروط</p>
                    <p className="text-sm text-slate-600 leading-relaxed">{comp.terms}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
