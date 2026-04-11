"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTask, deleteTask, toggleTaskStatus } from "../actions";
import { VIP_LEVELS } from "@/lib/constants/packages";

export type TaskRow = {
  id: string;
  title: string;
  platform_label: string;
  action_url: string;
  reward_amount: number | null;
  required_vip_level: number;
  display_order: number;
  is_active: boolean;
};

function EditTaskModal({
  task,
  onClose,
}: {
  task: TaskRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("taskId", task.id);

    const result = await updateTask(formData);
    setLoading(false);

    if ("error" in result) {
      setError(result.error);
    } else {
      router.refresh();
      onClose();
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="bg-slate-50 w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] flex flex-col max-h-[90vh] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
            <div>
              <h3 className="text-base font-bold text-slate-900">تعديل المهمة</h3>
              <p className="text-xs text-slate-400 mt-0.5">تحديث تفاصيل المهمة الحالية</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              aria-label="إغلاق"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden" noValidate>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <input type="hidden" name="taskId" value={task.id} />

              <div>
                <label htmlFor="edit-title" className="block text-sm font-medium text-slate-700 mb-1.5">
                  عنوان المهمة
                </label>
                <input
                  id="edit-title"
                  name="title"
                  type="text"
                  required
                  defaultValue={task.title}
                  className="w-full px-4 py-2.5 border border-slate-200 bg-white text-slate-900 focus:border-slate-300 focus:ring-1 focus:ring-slate-200 outline-none transition-all text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-platform" className="block text-sm font-medium text-slate-700 mb-1.5">
                    المنصة
                  </label>
                  <input
                    id="edit-platform"
                    name="platform_label"
                    type="text"
                    required
                    defaultValue={task.platform_label}
                    className="w-full px-4 py-2.5 border border-slate-200 bg-white text-slate-900 focus:border-slate-300 focus:ring-1 focus:ring-slate-200 outline-none transition-all text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="edit-order" className="block text-sm font-medium text-slate-700 mb-1.5">
                    ترتيب العرض
                  </label>
                  <input
                    id="edit-order"
                    name="display_order"
                    type="number"
                    min="0"
                    defaultValue={task.display_order}
                    dir="ltr"
                    className="w-full px-4 py-2.5 border border-slate-200 bg-white text-slate-900 focus:border-slate-300 focus:ring-1 focus:ring-slate-200 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="edit-url" className="block text-sm font-medium text-slate-700 mb-1.5">
                  رابط المهمة
                </label>
                <input
                  id="edit-url"
                  name="action_url"
                  type="url"
                  required
                  dir="ltr"
                  defaultValue={task.action_url}
                  className="w-full px-4 py-2.5 border border-slate-200 bg-white text-slate-900 focus:border-slate-300 focus:ring-1 focus:ring-slate-200 outline-none transition-all text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-reward" className="block text-sm font-medium text-slate-700 mb-1.5">
                    المكافأة (USD) <span className="text-slate-400 font-normal">(اختياري)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 end-3 flex items-center text-slate-400 text-sm pointer-events-none">$</span>
                    <input
                      id="edit-reward"
                      name="reward_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      dir="ltr"
                      defaultValue={task.reward_amount ?? ""}
                      placeholder="0.00"
                      className="w-full px-4 pe-8 py-2.5 border border-slate-200 bg-white text-slate-900 focus:border-slate-300 focus:ring-1 focus:ring-slate-200 outline-none transition-all text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="edit-vip" className="block text-sm font-medium text-slate-700 mb-1.5">
                    مستوى VIP
                  </label>
                  <select
                    id="edit-vip"
                    name="required_vip_level"
                    defaultValue={String(task.required_vip_level)}
                    className="w-full px-4 py-2.5 border border-slate-200 bg-white text-slate-900 focus:border-slate-300 focus:ring-1 focus:ring-slate-200 outline-none transition-all text-sm appearance-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2394a3b8%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[position:left_0.75rem_center] bg-no-repeat"
                  >
                    {VIP_LEVELS.map((level) => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-sm font-medium transition-all active:scale-95"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-slate-900 text-white rounded-xl py-2.5 px-6 text-sm font-medium hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-60 flex justify-center items-center gap-2"
              >
                {loading ? (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : null}
                {loading ? "جارٍ الحفظ..." : "حفظ التعديلات"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

function DeleteConfirmModal({
  task,
  onClose,
}: {
  task: TaskRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setError(null);
    setLoading(true);
    const result = await deleteTask(task.id);
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
    } else {
      router.refresh();
      onClose();
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="bg-slate-50 rounded-t-2xl sm:rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] w-full max-w-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300 flex flex-col">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">تأكيد الحذف</h3>
                <p className="text-xs text-slate-400">سيتم إلغاء تفعيل المهمة</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-3 mb-4">
              <span className="font-semibold text-slate-900 text-base mb-1 block">{task.title}</span>
              <span className="text-slate-500 text-xs leading-relaxed inline-block">
                ملاحظة: لن تُحذف المهمة نهائياً للحفاظ على سجلات الإنجاز السابقة، لكنها ستختفي من لوحة المهام اليومية للمستخدمين.
              </span>
            </p>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
            )}
          </div>

          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-sm font-medium transition-all active:scale-95"
            >
              إلغاء
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="flex-1 bg-red-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-red-700 transition-all active:scale-95 disabled:opacity-60 flex justify-center items-center gap-2"
            >
              {loading && (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {loading ? "جارٍ الحذف..." : "تأكيد الحذف"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function TaskManagementTable({ tasks }: { tasks: TaskRow[] }) {
  const router = useRouter();
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
  const [deletingTask, setDeletingTask] = useState<TaskRow | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  async function handleToggle(task: TaskRow) {
    setTogglingId(task.id);
    await toggleTaskStatus(task.id, !task.is_active);
    setTogglingId(null);
    router.refresh();
  }

  return (
    <>
      <div className="bg-slate-50 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden p-2 sm:p-4">
        {tasks.length === 0 ? (
          <div className="p-14 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-slate-600 font-medium">لا توجد مهام حتى الآن</p>
            <p className="text-slate-400 text-sm mt-1">استخدم النموذج أعلاه لإضافة أول مهمة</p>
          </div>
        ) : (
          <div className="overflow-x-auto pb-4">
            <table className="w-full text-start">
              <thead>
                <tr className="bg-slate-100/50">
                  <th className="text-start ps-5 pe-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    المهمة
                  </th>
                  <th className="text-start px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">
                    المنصة
                  </th>
                  <th className="text-start px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">
                    مستوى VIP
                  </th>
                  <th className="text-start px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">
                    المكافأة
                  </th>
                  <th className="text-start px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    الحالة
                  </th>
                  <th className="text-start px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50">
                {tasks.map((task) => (
                  <tr
                    key={task.id}
                    className="hover:bg-slate-100/50 transition-colors duration-200"
                  >
                    {/* Title + URL */}
                    <td className="ps-5 pe-4 py-4">
                      <p className="text-sm font-medium text-slate-900 leading-tight">
                        {task.title}
                      </p>
                      <a
                         href={task.action_url}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="text-xs text-slate-400 hover:text-emerald-600 transition-colors mt-0.5 block truncate max-w-[200px]"
                         dir="ltr"
                      >
                        {task.action_url}
                      </a>
                    </td>

                    {/* Platform */}
                    <td className="px-4 py-4 hidden sm:table-cell">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200/60">
                        {task.platform_label}
                      </span>
                    </td>

                    {/* VIP Level */}
                    <td className="px-4 py-4 hidden md:table-cell">
                      {task.required_vip_level === 0 ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-semibold border border-slate-200/60">
                          الكل
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-semibold border border-indigo-100">
                           {VIP_LEVELS.find((l) => l.value === String(task.required_vip_level))?.label ?? task.required_vip_level}
                        </span>
                      )}
                    </td>

                    {/* Reward */}
                    <td className="px-4 py-4 hidden md:table-cell">
                      {task.reward_amount != null ? (
                        <span className="text-sm font-bold text-emerald-600" dir="ltr">
                          ${Number(task.reward_amount).toFixed(2)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-50 text-slate-500 text-xs font-medium border border-slate-200/50">
                          حسب الباقة
                        </span>
                      )}
                    </td>

                    {/* Status Toggle */}
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleToggle(task)}
                        disabled={togglingId === task.id}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                          task.is_active ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                        aria-label={task.is_active ? "إلغاء تفعيل" : "تفعيل"}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                            task.is_active ? "translate-x-4" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setEditingTask(task)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all duration-150"
                          aria-label="تعديل"
                          title="تعديل المهمة"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeletingTask(task)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-150"
                          aria-label="حذف"
                          title="حذف المهمة"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingTask && (
        <EditTaskModal task={editingTask} onClose={() => setEditingTask(null)} />
      )}
      {deletingTask && (
        <DeleteConfirmModal task={deletingTask} onClose={() => setDeletingTask(null)} />
      )}
    </>
  );
}
