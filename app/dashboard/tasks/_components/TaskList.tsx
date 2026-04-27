import type { TaskWithStatus } from "../data";
import { TaskItem } from "./TaskItem";

export function TaskList({
  tasks,
  rewardPerTask,
  dailyLimitReached,
}: {
  tasks: TaskWithStatus[];
  rewardPerTask: number;
  dailyLimitReached: boolean;
}) {
  if (tasks.length === 0) {
    return (
      <p className="text-center text-slate-500 py-8">
        لا توجد مهام متاحة اليوم، يرجى العودة لاحقاً
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {dailyLimitReached && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-amber-700 font-medium">
            لقد وصلت للحد الأقصى للمهام اليومية لباقتك
          </p>
        </div>
      )}
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          rewardPerTask={rewardPerTask}
          dailyLimitReached={dailyLimitReached}
        />
      ))}
    </div>
  );
}
