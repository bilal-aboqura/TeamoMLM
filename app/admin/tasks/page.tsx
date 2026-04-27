import { createAdminClient } from "@/lib/supabase/admin";
import { CreateTaskForm } from "./_components/CreateTaskForm";
import { TaskManagementTable } from "./_components/TaskManagementTable";
import { TasksTable } from "./_components/TasksTable";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TasksPage() {
  const supabase = createAdminClient();

  const { data: allTasks } = await supabase
    .from("tasks")
    .select(
      "id, title, platform_label, action_url, reward_amount, required_vip_level, display_order, is_active"
    )
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  const { data: logs, error: logsError } = await supabase
    .from("task_completion_logs")
    .select("id, user_id, task_id, reward_amount_snapshot, created_at, proof_url")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (logsError) {
    console.error("Admin Tasks — pending logs query failed:", logsError.message);
  }

  const pendingLogs = logs ?? [];
  const userIds = [...new Set(pendingLogs.map((l) => l.user_id))];
  const taskIds = [...new Set(pendingLogs.map((l) => l.task_id))];

  const [usersResult, tasksResult] = await Promise.all([
    userIds.length > 0
      ? supabase.from("users").select("id, full_name").in("id", userIds)
      : Promise.resolve({ data: [], error: null }),
    taskIds.length > 0
      ? supabase.from("tasks").select("id, title").in("id", taskIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const userMap = new Map(
    (usersResult.data ?? []).map((u) => [u.id, u.full_name])
  );
  const taskMap = new Map(
    (tasksResult.data ?? []).map((t) => [t.id, t.title])
  );

  const enrichedLogs = await Promise.all(
    pendingLogs.map(async (row) => {
      const { data } = await supabase.storage
        .from("proofs")
        .createSignedUrl(row.proof_url, 300);
      return {
        id: row.id,
        reward_amount_snapshot: row.reward_amount_snapshot,
        created_at: row.created_at,
        full_name: userMap.get(row.user_id) ?? "غير متوفر",
        task_title: taskMap.get(row.task_id) ?? "غير متوفر",
        signed_url: data?.signedUrl ?? "",
      };
    })
  );

  const tasks = allTasks ?? [];

  return (
    <div>
      <div className="mb-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">إدارة المهام اليومية</h1>
          <p className="text-slate-500 text-sm mt-1">
            أضف وعدّل وحذف المهام اليومية المتاحة للمستخدمين
          </p>
        </div>

        <CreateTaskForm />

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">
            المهام اليومية الحالية
            <span className="ms-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
              {tasks.length}
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            {tasks.filter((t) => t.is_active).length} مهمة نشطة
          </p>
        </div>

        <TaskManagementTable tasks={tasks} />
      </div>

      <div className="border-t border-slate-100 my-8" />

      <div>
        <div className="mb-6 flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-900">
            مراجعة الإثباتات المعلقة
          </h2>
          {enrichedLogs.length > 0 && (
            <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
              {enrichedLogs.length} معلقة
            </span>
          )}
        </div>
        <TasksTable logs={enrichedLogs} />
      </div>
    </div>
  );
}
