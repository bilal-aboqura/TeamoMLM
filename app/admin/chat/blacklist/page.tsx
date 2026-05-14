import { redirect } from "next/navigation";
import { BlacklistManager } from "@/components/chat/BlacklistManager";
import { getChatAuthContext } from "@/lib/chat/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BlacklistEntry } from "@/lib/chat/types";

export default async function AdminChatBlacklistPage() {
  const auth = await getChatAuthContext();
  if (!auth) redirect("/login");
  if (auth.globalRole !== "admin") redirect("/admin/chat");

  const { data } = await createAdminClient()
    .from("chat_blacklist")
    .select("id, word_original, word_normalized, match_mode, created_by, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">قائمة الكلمات المحظورة</h1>
        <p className="mt-1 text-sm text-slate-500">تتم مطابقة الكلمات قبل حفظ الرسائل.</p>
      </div>
      <BlacklistManager initialWords={(data ?? []) as BlacklistEntry[]} />
    </div>
  );
}
