import { Lock } from "lucide-react";

export function AccessLockedState() {
  return (
    <div className="rounded-2xl bg-white p-8 text-center shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
        <Lock className="h-7 w-7" strokeWidth={2} />
      </div>
      <h2 className="mt-4 text-lg font-bold text-slate-900">الميزة غير متاحة لحسابك حالياً</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        الربح بالتطبيقات متاح لقائد مستوى أول أو أعلى، أو باقة B1 فأعلى، أو من خلال باقة تطبيقات مخصصة.
      </p>
    </div>
  );
}
