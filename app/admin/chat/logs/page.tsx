import { redirect } from "next/navigation";
import { ActivityLogFeed } from "@/components/chat/ActivityLogFeed";
import { getChatAuthContext } from "@/lib/chat/server";
import { getActivityLogs } from "./_actions/getActivityLogs";

export default async function AdminChatLogsPage() {
  const auth = await getChatAuthContext();
  if (!auth) redirect("/login");
  if (auth.globalRole !== "admin") redirect("/admin/chat");

  const result = await getActivityLogs({ page: 1 });
  const initialData = result.success ? result.data : [];
  const initialMeta = result.success ? result.meta : { total: 0, page: 1, totalPages: 1 };

  return (
    <div className="space-y-4" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">سجل النشاط</h1>
        <p className="mt-1 text-sm text-slate-500">تدفق تدقيق لحظي دون أدوات حذف أو تعديل.</p>
      </div>
      <ActivityLogFeed initialData={initialData} initialMeta={initialMeta} />
    </div>
  );
}
