import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getDailyTasksWithCompletionStatus, getTodaySubmissionCount } from "./data";
import { TaskList } from "./_components/TaskList";
import { NoPackageEmptyState } from "./_components/NoPackageEmptyState";
import { ListTodo } from "lucide-react";

export default async function TasksPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("current_package_level")
    .eq("id", user.id)
    .maybeSingle();

  const { data: overdueDebt } = await supabase
    .from("pay_later_debts")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "overdue")
    .maybeSingle();

  if (overdueDebt) {
    return (
      <div className="max-w-md mx-auto px-4 py-6">
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5 text-center">
          <h1 className="text-lg font-bold text-rose-700">المهام متوقفة مؤقتاً</h1>
          <p className="mt-2 text-sm leading-relaxed text-rose-600">
            لديك دين دفع لاحق متأخر. يرجى سداد الدين من صفحة الدفع لاحقاً
            لإعادة تفعيل المهام.
          </p>
        </div>
      </div>
    );
  }

  if (!profile?.current_package_level) {
    return (
      <div className="max-w-md mx-auto px-4 py-6">
        <NoPackageEmptyState />
      </div>
    );
  }

  const { data: pkg } = await supabase
    .from("packages")
    .select("daily_profit, daily_task_count")
    .eq("name", profile.current_package_level)
    .eq("is_active", true)
    .maybeSingle();

  if (!pkg) {
    return (
      <div className="max-w-md mx-auto px-4 py-6">
        <NoPackageEmptyState />
      </div>
    );
  }

  const [tasks, submittedToday] = await Promise.all([
    getDailyTasksWithCompletionStatus(
      user.id,
      pkg.daily_task_count,
      profile.current_package_level
    ),
    getTodaySubmissionCount(user.id),
  ]);

  const rewardPerTask =
    Math.round((pkg.daily_profit / pkg.daily_task_count) * 10000) / 10000;

  const remaining = Math.max(0, pkg.daily_task_count - submittedToday);

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">المهام اليومية</h1>
        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
          remaining === 0
            ? "bg-rose-50 text-rose-600 border border-rose-100"
            : "bg-emerald-50 text-emerald-700 border border-emerald-100"
        }`}>
          <ListTodo className="w-4 h-4" strokeWidth={2.5} />
          <span dir="ltr">
            {remaining === 0
              ? "تم الانتهاء"
              : `${submittedToday}/${pkg.daily_task_count}`}
          </span>
        </div>
      </div>
      <TaskList
        tasks={tasks}
        rewardPerTask={rewardPerTask}
        dailyLimitReached={remaining === 0}
      />
    </div>
  );
}
