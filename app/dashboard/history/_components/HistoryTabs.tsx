// use client — useState for active tab toggle
"use client";

import { useState } from "react";
import { SubscriptionRequestList } from "./SubscriptionRequestList";
import { TaskLogList } from "./TaskLogList";
import type { PackageSubscriptionRequest, TaskCompletionLogEntry } from "../data";

export function HistoryTabs({
  packageRequests,
  taskLogs,
}: {
  packageRequests: PackageSubscriptionRequest[];
  taskLogs: TaskCompletionLogEntry[];
}) {
  const [activeTab, setActiveTab] = useState<"packages" | "tasks">("packages");

  return (
    <div>
      <div className="bg-slate-100 rounded-xl p-1 flex gap-1 mb-4">
        <button
          onClick={() => setActiveTab("packages")}
          aria-label="طلبات الاشتراك"
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "packages"
              ? "bg-white shadow-sm text-slate-900"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          طلبات الاشتراك
        </button>
        <button
          onClick={() => setActiveTab("tasks")}
          aria-label="سجل المهام"
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "tasks"
              ? "bg-white shadow-sm text-slate-900"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          سجل المهام
        </button>
      </div>

      {activeTab === "packages" ? (
        <SubscriptionRequestList requests={packageRequests} />
      ) : (
        <TaskLogList logs={taskLogs} />
      )}
    </div>
  );
}
