import Link from "next/link";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export async function NotificationBadge() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { count } = await supabase
    .from("in_app_notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  return (
    <Link
      href="/dashboard/investment"
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-600 shadow-[0_2px_10px_rgba(0,0,0,0.04)]"
      aria-label="الإشعارات"
    >
      <Bell className="h-5 w-5" strokeWidth={2} />
      {(count ?? 0) > 0 ? (
        <span className="absolute -end-1 -top-1 min-w-5 rounded-full bg-emerald-600 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
