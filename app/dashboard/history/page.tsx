import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUserRequestHistory } from "./data";
import { HistoryTabs } from "./_components/HistoryTabs";

export default async function HistoryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { packageRequests, taskLogs } = await getUserRequestHistory(user.id);

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">سجلي</h1>
      <HistoryTabs
        packageRequests={packageRequests}
        taskLogs={taskLogs}
      />
    </div>
  );
}
