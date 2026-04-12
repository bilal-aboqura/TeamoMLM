"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateCompetition, deleteCompetition } from "@/app/admin/actions";
import { Pencil, Trash2, X } from "lucide-react";
import { LocalDateTime } from "@/components/ui/LocalDate";

type CompetitionRow = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  reward: string;
  terms: string;
  is_active: boolean;
  created_at: string;
};

// Convert UTC ISO string to datetime-local value (uses browser's local timezone)
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EditModal({
  comp,
  onClose,
}: {
  comp: CompetitionRow;
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
    const result = await updateCompetition(formData);

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
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="bg-slate-50 w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] flex flex-col max-h-[90vh] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
            <h3 className="text-base font-bold text-slate-900">تعديل المسابقة</h3>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors" aria-label="إغلاق">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <input type="hidden" name="id" value={comp.id} />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">العنوان</label>
                <input name="title" type="text" required defaultValue={comp.title} className="w-full px-4 py-2.5 border border-slate-200 bg-white text-slate-900 focus:border-slate-300 focus:ring-1 focus:ring-slate-200 outline-none transition-all text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">البداية</label>
                  <input name="start_time" type="datetime-local" required dir="ltr" defaultValue={toLocalInput(comp.start_time)} className="w-full px-4 py-2.5 border border-slate-200 bg-white text-slate-900 focus:border-slate-300 focus:ring-1 focus:ring-slate-200 outline-none transition-all text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">النهاية</label>
                  <input name="end_time" type="datetime-local" required dir="ltr" defaultValue={toLocalInput(comp.end_time)} className="w-full px-4 py-2.5 border border-slate-200 bg-white text-slate-900 focus:border-slate-300 focus:ring-1 focus:ring-slate-200 outline-none transition-all text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">الجائزة</label>
                <input name="reward" type="text" required defaultValue={comp.reward} className="w-full px-4 py-2.5 border border-slate-200 bg-white text-slate-900 focus:border-slate-300 focus:ring-1 focus:ring-slate-200 outline-none transition-all text-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">الشروط</label>
                <textarea name="terms" rows={3} defaultValue={comp.terms} className="w-full px-4 py-2.5 border border-slate-200 bg-white text-slate-900 focus:border-slate-300 focus:ring-1 focus:ring-slate-200 outline-none transition-all text-sm resize-none" />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-3 shrink-0">
              <button type="button" onClick={onClose} className="px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-sm font-medium transition-all active:scale-95">إلغاء</button>
              <button type="submit" disabled={loading} className="flex-1 bg-slate-900 text-white rounded-xl py-2.5 px-6 text-sm font-medium hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-60 flex justify-center items-center gap-2">
                {loading && <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                {loading ? "جارٍ الحفظ..." : "حفظ التعديلات"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

export function CompetitionTable({ competitions }: { competitions: CompetitionRow[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    await deleteCompetition(id);
    setDeletingId(null);
    router.refresh();
  }

  if (competitions.length === 0) {
    return (
      <div className="bg-slate-50 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-14 text-center">
        <p className="text-slate-600 font-medium">لا توجد مسابقات بعد</p>
        <p className="text-slate-400 text-sm mt-1">استخدم النموذج أعلاه لإضافة أول مسابقة</p>
      </div>
    );
  }

  const editingComp = competitions.find((c) => c.id === editingId);

  return (
    <>
      <div className="bg-slate-50 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden p-2 sm:p-4">
        <div className="overflow-x-auto pb-4">
          <table className="w-full text-start">
            <thead>
              <tr className="bg-slate-100/50">
                <th className="text-start ps-5 pe-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">المسابقة</th>
                <th className="text-start px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">الفترة</th>
                <th className="text-start px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">الجائزة</th>
                <th className="text-start px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">الحالة</th>
                <th className="text-start px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/50">
              {competitions.map((comp) => {
                const now = Date.now();
                const start = new Date(comp.start_time).getTime();
                const end = new Date(comp.end_time).getTime();
                const isActive = comp.is_active;
                const isLive = isActive && now >= start && now <= end;
                const isUpcoming = isActive && now < start;

                return (
                  <tr key={comp.id} className="hover:bg-slate-100/50 transition-colors">
                    <td className="ps-5 pe-4 py-4">
                      <p className="text-sm font-medium text-slate-900 leading-tight">{comp.title}</p>
                      {comp.terms && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{comp.terms}</p>}
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell" dir="ltr">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <LocalDateTime iso={comp.start_time} options={{ day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }} />
                        <span> → </span>
                        <LocalDateTime iso={comp.end_time} options={{ day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }} />
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-bold text-emerald-600">{comp.reward}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold ${!isActive ? "bg-slate-100 text-slate-400" : isLive ? "bg-emerald-50 text-emerald-700" : isUpcoming ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                        {!isActive ? "معطلة" : isLive ? "جارية" : isUpcoming ? "قادمة" : "منتهية"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setEditingId(comp.id)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" aria-label="تعديل">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(comp.id)} disabled={deletingId === comp.id} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" aria-label="حذف">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editingComp && (
        <EditModal comp={editingComp} onClose={() => setEditingId(null)} />
      )}
    </>
  );
}
