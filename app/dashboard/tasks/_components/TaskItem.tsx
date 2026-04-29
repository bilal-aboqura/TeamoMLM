import type { TaskWithStatus } from "../data";
import { TaskExecutionModal } from "./TaskExecutionModal";
import { Check } from "lucide-react";

export function TaskItem({
  task,
  rewardPerTask,
  dailyLimitReached,
}: {
  task: TaskWithStatus;
  rewardPerTask: number;
  dailyLimitReached: boolean;
}) {
  const isCompleted =
    task.completionStatus === "pending" || task.completionStatus === "approved";

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <span className="bg-slate-100 text-slate-600 text-xs rounded-full px-2 py-1 inline-block mb-1">
            {task.platform_label}
          </span>
          <p className="text-slate-900 font-medium text-sm truncate">
            {task.title}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            dir="ltr"
            className="text-emerald-600 font-bold text-sm"
          >
            +${rewardPerTask.toFixed(4)}
          </span>

          {isCompleted ? (
            <span className="bg-emerald-50 text-emerald-700 rounded-full px-3 py-1 text-sm whitespace-nowrap flex items-center">
              مكتملة <Check className="w-4 h-4 ms-1" strokeWidth={2} />
            </span>
          ) : task.completionStatus === "rejected" ? (
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-red-50 px-3 py-1 text-sm text-red-700">
                مرفوضة
              </span>
              <TaskExecutionModal task={task} rewardPerTask={rewardPerTask} />
            </div>
          ) : dailyLimitReached ? (
            <span className="bg-slate-100 text-slate-400 rounded-full px-3 py-1 text-sm whitespace-nowrap">
              الحصة الكاملة
            </span>
          ) : (
            <TaskExecutionModal task={task} rewardPerTask={rewardPerTask} />
          )}
        </div>
      </div>
    </div>
  );
}
