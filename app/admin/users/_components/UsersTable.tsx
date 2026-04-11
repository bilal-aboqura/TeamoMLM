"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EditLevelPanel } from "./EditLevelPanel";
import { AdjustBalancePanel } from "./AdjustBalancePanel";
import { toggleUserStatus, deleteUserAction } from "@/app/admin/actions";

type UserRow = {
  id: string;
  full_name: string;
  phone_number: string;
  current_package_level: string | null;
  wallet_balance: number;
  leadership_level: number | null;
  status: string;
  created_at: string;
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active: {
      label: "نشط",
      cls: "bg-emerald-50 text-emerald-700",
    },
    suspended: {
      label: "موقوف",
      cls: "bg-rose-50 text-rose-700",
    },
    pending: {
      label: "معلق",
      cls: "bg-amber-50 text-amber-700",
    },
  };
  const cfg = map[status] ?? {
    label: status,
    cls: "bg-slate-100 text-slate-600",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function SuspendModal({
  userName,
  onClose,
  onConfirm,
}: {
  userName: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  return (
    <>
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.12)] w-full max-w-sm p-6"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Icon */}
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>

          <h3 className="text-base font-bold text-slate-900 mb-1">
            تجميد حساب {userName}
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            أدخل سبب التجميد ليظهر للمستخدم عند محاولة الوصول لحسابه
          </p>

          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="سبب التجميد..."
            rows={3}
            maxLength={500}
            className="w-full border border-slate-200 rounded-xl bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 outline-none transition-all resize-none"
          />
          <p className="text-[10px] text-slate-400 mt-1 text-start">{reason.length}/500</p>

          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={onClose}
              className="flex-1 bg-slate-100 text-slate-700 rounded-xl py-2.5 text-sm font-medium hover:bg-slate-200 transition-all active:scale-95"
            >
              إلغاء
            </button>
            <button
              onClick={() => {
                onConfirm(reason.trim());
              }}
              className="flex-1 bg-rose-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-rose-500 transition-all active:scale-95 shadow-[0_2px_8px_rgba(225,29,72,0.25)]"
            >
              تأكيد التجميد
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function DeleteModal({
  userName,
  onClose,
  onConfirm,
}: {
  userName: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [code, setCode] = useState("");
  const [verificationCode] = useState(() => Math.floor(1000 + Math.random() * 9000).toString());
  const [error, setError] = useState("");

  const handleConfirm = () => {
    if (code !== verificationCode) {
      setError("الكود غير صحيح");
      return;
    }
    onConfirm();
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.12)] w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center mb-3">
             <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
             </svg>
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">
             حذف المستخدم {userName}
          </h3>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
             هذا الإجراء لا يمكن التراجع عنه. للحذف النهائي، يرجى كتابة كود التأكيد 
             (<span className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">{verificationCode}</span>)
             أدناه.
          </p>
          <input
            type="text"
            value={code}
            onChange={(e) => { setCode(e.target.value); setError(""); }}
            placeholder="أدخل الكود هنا"
            autoFocus
            dir="ltr"
            className="w-full text-center tracking-widest font-mono border border-slate-200 rounded-xl bg-white px-4 py-3 text-lg text-slate-900 placeholder:text-slate-400 placeholder:text-sm placeholder:tracking-normal focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 outline-none transition-all"
          />
          {error && <p className="text-xs text-rose-600 mt-2">{error}</p>}
          <div className="flex items-center gap-3 mt-5">
            <button
              onClick={onClose}
              className="flex-1 bg-slate-100 text-slate-700 rounded-xl py-2.5 text-sm font-medium hover:bg-slate-200 transition-all active:scale-95"
            >
              إلغاء
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 bg-rose-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-rose-500 transition-all active:scale-95 shadow-[0_2px_8px_rgba(225,29,72,0.25)]"
            >
              تأكيد الحذف
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function UsersTable({
  users,
  totalCount,
  page,
  search,
  pageSize,
}: {
  users: UserRow[];
  totalCount: number;
  page: number;
  search: string;
  pageSize: number;
}) {
  const router = useRouter();
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [adjustingBalanceUser, setAdjustingBalanceUser] = useState<UserRow | null>(null);
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null);
  const [suspendingUser, setSuspendingUser] = useState<UserRow | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [isPending, startTransition] = useTransition();

  const totalPages = Math.ceil(totalCount / pageSize);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleToggleStatus = (user: UserRow) => {
    if (user.status !== "active" && user.status !== "suspended") return;

    if (user.status === "active") {
      // Open suspend modal to enter reason
      setSuspendingUser(user);
      return;
    }

    // Unsuspend — simple confirm
    const isConfirm = window.confirm(
      "هل أنت متأكد أنك تريد إعادة تنشيط هذا الحساب؟"
    );
    if (!isConfirm) return;

    executeSuspendToggle(user.id, "suspended");
  };

  const handleConfirmSuspend = (reason: string) => {
    if (!suspendingUser) return;
    const userId = suspendingUser.id;
    setSuspendingUser(null);
    executeSuspendToggle(userId, "active", reason);
  };

  const executeSuspendToggle = (userId: string, currentStatus: "active" | "suspended", reason?: string) => {
    setTogglingStatusId(userId);
    startTransition(async () => {
      const result = await toggleUserStatus(userId, currentStatus, reason);
      if ("success" in result) {
        showToast(
          currentStatus === "active" ? "تم تجميد الحساب بنجاح" : "تم إعادة تنشيط الحساب",
          "success"
        );
        router.refresh();
      } else {
        showToast(result.error, "error");
      }
      setTogglingStatusId(null);
    });
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    const userId = deletingUser.id;
    setDeletingUser(null);
    setIsDeleting(true);
    startTransition(async () => {
       const result = await deleteUserAction(userId);
       setIsDeleting(false);
       if ("success" in result) {
         showToast("تم حذف المستخدم نهائياً بنجاح", "success");
         router.refresh();
       } else {
         showToast(result.error, "error");
       }
    });
  };

  const buildUrl = (newPage: number) => {
    const base = "/admin/users";
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    params.set("page", String(newPage));
    return `${base}?${params.toString()}`;
  };

  return (
    <>
      <div className="bg-slate-50 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden p-2 sm:p-4">
        <div className="overflow-x-auto pb-4">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-100/50">
                <th className="text-start ps-5 pe-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  المستخدم
                </th>
                <th className="text-start px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">
                  الهاتف
                </th>
                <th className="text-start px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">
                  الباقة
                </th>
                <th className="text-start px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  الرصيد
                </th>
                <th className="text-start px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">
                  المستوى
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
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-slate-100/50 transition-colors duration-200"
                >
                  {/* User avatar + name */}
                  <td className="ps-5 pe-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-slate-600">
                          {user.full_name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900 leading-tight">
                          {user.full_name}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {new Date(user.created_at).toLocaleDateString("ar")}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Phone */}
                  <td className="px-4 py-4 hidden lg:table-cell">
                    <span className="text-sm text-slate-500 font-mono" dir="ltr">
                      {user.phone_number}
                    </span>
                  </td>

                  {/* Package */}
                  <td className="px-4 py-4 hidden md:table-cell">
                    {user.current_package_level ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-100">
                        {user.current_package_level}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-sm italic">غير متوفر</span>
                    )}
                  </td>

                  {/* Balance */}
                  <td className="px-4 py-4">
                    <span className="text-sm font-bold text-slate-900" dir="ltr">
                      ${Number(user.wallet_balance).toFixed(2)}
                    </span>
                  </td>

                  {/* Leadership Level */}
                  <td className="px-4 py-4 hidden sm:table-cell">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold ${user.leadership_level ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-slate-50 text-slate-400"}`}>
                      {user.leadership_level ? `قائد ${user.leadership_level}` : "عضو"}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-4">
                    <StatusBadge status={user.status} />
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5">
                      {/* Suspend / Unsuspend toggle */}
                      <button
                        onClick={() => handleToggleStatus(user)}
                        disabled={togglingStatusId === user.id || isPending || (user.status !== "active" && user.status !== "suspended")}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                          user.status === "active"
                            ? "bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200/60"
                            : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200/60"
                        }`}
                        title={user.status === "active" ? "تجميد الحساب" : "فك التجميد"}
                      >
                        {togglingStatusId === user.id ? (
                          <span className="inline-block w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                        ) : user.status === "active" ? (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        )}
                        {user.status === "active" ? "تجميد" : "فك التجميد"}
                      </button>
                      {/* Adjust Balance */}
                      <button
                        onClick={() => setAdjustingBalanceUser(user)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-150"
                        title="تعديل الرصيد يدوياً"
                        aria-label="تعديل الرصيد"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      {/* Edit Level */}
                      <button
                        onClick={() => setEditingUser(user)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all duration-150"
                        title="تعديل المستوى"
                        aria-label="تعديل"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {/* Referral Tree */}
                      <Link
                        href={`/admin/users/${user.id}/tree`}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all duration-150"
                        title="عرض شجرة الإحالات"
                        aria-label="شجرة الإحالات"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M3 7h18M3 7a2 2 0 011-1.732M3 7a2 2 0 000 2M3 9v8a2 2 0 002 2h14a2 2 0 002-2V9M15 3h-6M12 3v4" />
                        </svg>
                      </Link>
                      {/* Delete User */}
                      <button
                        onClick={() => setDeletingUser(user)}
                        disabled={isDeleting || isPending}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all duration-150 disabled:opacity-50"
                        title="حذف المستخدم نهائياً"
                        aria-label="حذف"
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

        {/* Pagination footer */}
        <div className="px-5 py-4 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            {totalCount} مستخدم مجموعاً
          </p>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push(buildUrl(page - 1))}
                disabled={page <= 0}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-slate-100/50 hover:bg-slate-200/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                السابق
              </button>
              <span className="text-xs text-slate-500 font-medium px-2">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => router.push(buildUrl(page + 1))}
                disabled={page >= totalPages - 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-slate-100/50 hover:bg-slate-200/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                التالي
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {editingUser && (
        <EditLevelPanel
          user={editingUser}
          onClose={() => {
            setEditingUser(null);
            router.refresh();
          }}
        />
      )}

      {adjustingBalanceUser && (
        <AdjustBalancePanel
          user={adjustingBalanceUser}
          onClose={() => {
            setAdjustingBalanceUser(null);
            router.refresh();
          }}
        />
      )}

      {/* Suspend Reason Modal */}
      {suspendingUser && (
        <SuspendModal
          userName={suspendingUser.full_name}
          onClose={() => setSuspendingUser(null)}
          onConfirm={handleConfirmSuspend}
        />
      )}

      {/* Delete User Modal */}
      {deletingUser && (
        <DeleteModal
          userName={deletingUser.full_name}
          onClose={() => setDeletingUser(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 start-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 text-white px-5 py-3 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.15)] text-sm font-medium animate-in fade-in slide-in-from-bottom-2 duration-300 ${toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"}`}>
          {toast.type === "success" ? (
             <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
               <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
             </svg>
          ) : (
             <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
               <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
             </svg>
          )}
          {toast.message}
        </div>
      )}
    </>
  );
}
