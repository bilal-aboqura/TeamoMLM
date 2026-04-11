import { LogoutButton } from "./LogoutButton";

export function SuspendedBanner({ reason }: { reason?: string | null }) {
  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6"
    >
      <div className="w-full max-w-md text-center space-y-6">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-50 to-rose-100 border border-rose-200/60 flex items-center justify-center shadow-[0_4px_20px_rgba(225,29,72,0.08)]">
          <svg
            className="w-10 h-10 text-rose-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100 space-y-4">
          <h1 className="text-xl font-bold text-slate-900">
            تم تجميد حسابك
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            تم إيقاف حسابك مؤقتاً من قِبل الإدارة. لا يمكنك الوصول إلى
            لوحة التحكم أو إجراء أي عمليات حالياً.
          </p>

          {/* Admin-provided reason */}
          {reason && (
            <div className="bg-rose-50 rounded-xl p-4 border border-rose-200/60 text-start">
              <p className="text-[11px] font-semibold text-rose-400 mb-1.5">سبب التجميد</p>
              <p className="text-sm text-rose-700 leading-relaxed font-medium">
                {reason}
              </p>
            </div>
          )}

          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200/60">
            <p className="text-amber-800 text-xs font-medium leading-relaxed">
              إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع فريق الدعم
              لمراجعة حالة حسابك وإعادة تنشيطه.
            </p>
          </div>
        </div>

        {/* Logout */}
        <LogoutButton />
      </div>
    </div>
  );
}
