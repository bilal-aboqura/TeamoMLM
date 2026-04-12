"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveTask, rejectTask } from "@/app/admin/actions";
import { ProofViewerModal } from "@/app/admin/_components/ProofViewerModal";
import { LocalDate } from "@/components/ui/LocalDate";

type TaskLog = {
  id: string;
  reward_amount_snapshot: number;
  created_at: string;
  full_name: string;
  task_title: string;
  signed_url: string;
};

export function TasksTable({ logs }: { logs: TaskLog[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<TaskLog | null>(null);

  if (logs.length === 0) {
    return (
      <div className="bg-slate-50 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-14 text-center">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-slate-600 font-medium">المهام مكتملة</p>
        <p className="text-slate-400 text-sm mt-1">لا توجد إثباتات مهام معلقة حالياً</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-slate-50 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden p-2 sm:p-4">
        <div className="overflow-x-auto pb-4">
          <table className="w-full text-start">
            <thead>
              <tr className="bg-slate-100/50">
                <th className="text-start ps-5 pe-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  المستخدم
                </th>
                <th className="text-start px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  المهمة
                </th>
                <th className="text-start px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  المكافأة
                </th>
                <th className="text-start px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">
                  التاريخ
                </th>
                <th className="text-start px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  الإجراء
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/50">
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-slate-100/50 transition-colors duration-200"
                >
                  <td className="ps-5 pe-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-slate-600">
                          {log.full_name.charAt(0)}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-slate-900">
                        {log.full_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm font-medium text-slate-800 line-clamp-2 max-w-[200px]">
                      {log.task_title}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg" dir="ltr">
                      +${Number(log.reward_amount_snapshot).toFixed(2)}
                    </span>
                  </td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      <LocalDate iso={log.created_at} className="text-sm text-slate-500" />
                    </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => setSelected(log)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-700 active:scale-95 transition-all duration-150"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      مراجعة
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-4 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            {logs.length} إثبات معلق
          </p>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 text-[10px] font-semibold">
            قيد المراجعة
          </span>
        </div>
      </div>

      <ProofViewerModal
        open={!!selected}
        imageUrl={selected?.signed_url ?? ""}
        title={`إثبات مهمة — ${selected?.full_name ?? ""}`}
        onClose={() => setSelected(null)}
        onApprove={async () => {
          if (!selected) return { error: "لا يوجد طلب محدد" };
          const result = await approveTask(selected.id);
          if ("success" in result) router.refresh();
          return result;
        }}
        onReject={async (reason) => {
          if (!selected) return { error: "لا يوجد طلب محدد" };
          const result = await rejectTask(selected.id, reason);
          if ("success" in result) router.refresh();
          return result;
        }}
      />
    </>
  );
}
