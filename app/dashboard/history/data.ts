import { createClient } from "@/lib/supabase/server";

export type PackageSubscriptionRequest = {
  id: string;
  package_id: string;
  package_name: string;
  amount_paid: number;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  created_at: string;
};

export type TaskCompletionLogEntry = {
  id: string;
  task_id: string;
  task_title: string;
  reward_amount_snapshot: number;
  completion_date: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  created_at: string;
};

export type RequestHistory = {
  packageRequests: PackageSubscriptionRequest[];
  taskLogs: TaskCompletionLogEntry[];
};

export async function getUserRequestHistory(
  userId: string
): Promise<RequestHistory> {
  const supabase = await createClient();

  const [packageResult, taskResult] = await Promise.all([
    supabase
      .from("package_subscription_requests")
      .select(
        "id, package_id, amount_paid, status, rejection_reason, created_at, packages(name)"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("task_completion_logs")
      .select(
        "id, task_id, reward_amount_snapshot, completion_date, status, rejection_reason, created_at, tasks(title)"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  const packageRequests: PackageSubscriptionRequest[] = (
    packageResult.data ?? []
  ).map((r) => ({
    id: r.id,
    package_id: r.package_id,
    package_name: (r.packages as unknown as { name: string })?.name ?? "—",
    amount_paid: r.amount_paid,
    status: r.status,
    rejection_reason: r.rejection_reason,
    created_at: r.created_at,
  }));

  const taskLogs: TaskCompletionLogEntry[] = (taskResult.data ?? []).map(
    (l) => ({
      id: l.id,
      task_id: l.task_id,
      task_title: (l.tasks as unknown as { title: string })?.title ?? "—",
      reward_amount_snapshot: l.reward_amount_snapshot,
      completion_date: l.completion_date,
      status: l.status,
      rejection_reason: l.rejection_reason,
      created_at: l.created_at,
    })
  );

  return { packageRequests, taskLogs };
}
