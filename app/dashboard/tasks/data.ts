import { createClient } from "@/lib/supabase/server";
import { PACKAGE_LEVEL_MAP } from "@/lib/constants/packages";

export type TaskWithStatus = {
  id: string;
  title: string;
  platform_label: string;
  action_url: string;
  display_order: number;
  required_vip_level: number;
  completionStatus: "available" | "pending" | "approved" | "rejected";
  logId: string | null;
};

export async function getDailyTasksWithCompletionStatus(
  userId: string,
  dailyTaskCount: number,
  userPackageLevel: string
): Promise<TaskWithStatus[]> {
  const supabase = await createClient();

  const userLevelNum = PACKAGE_LEVEL_MAP[userPackageLevel] ?? 0;

  const today = new Date().toISOString().split("T")[0];

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, platform_label, action_url, display_order, required_vip_level")
    .eq("is_active", true)
    .lte("required_vip_level", userLevelNum)
    .order("display_order", { ascending: true })
    .order("id", { ascending: true });

  if (!tasks) return [];

  const taskIds = tasks.map((t) => t.id);

  const { data: logs } = await supabase
    .from("task_completion_logs")
    .select("id, task_id, status")
    .eq("user_id", userId)
    .eq("completion_date", today)
    .in("task_id", taskIds);

  const logMap = new Map(
    (logs ?? []).map((l) => [
      l.task_id,
      { logId: l.id, status: l.status },
    ])
  );

  return tasks.map((task) => {
    const log = logMap.get(task.id);
    return {
      id: task.id,
      title: task.title,
      platform_label: task.platform_label,
      action_url: task.action_url,
      display_order: task.display_order,
      required_vip_level: task.required_vip_level,
      completionStatus: log
        ? (log.status as "pending" | "approved" | "rejected")
        : "available",
      logId: log?.logId ?? null,
    };
  });
}

export async function getTodaySubmissionCount(
  userId: string
): Promise<number> {
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const { count, error } = await supabase
    .from("task_completion_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("completion_date", today);

  if (error) return 0;
  return count ?? 0;
}
