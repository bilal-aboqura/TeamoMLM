import { LocalDate } from "@/components/ui/LocalDate";

type BalanceAdjustment = {
  id: string;
  old_balance: number;
  new_balance: number;
  delta: number;
  reason: string;
  created_at: string;
};

export function BalanceAdjustmentsList({
  adjustments,
}: {
  adjustments: BalanceAdjustment[];
}) {
  if (adjustments.length === 0) return null;

  return (
    <section className="rounded-2xl bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
      <h2 className="mb-4 text-base font-bold text-slate-900">
        تعديلات الرصيد اليدوية
      </h2>
      <div className="space-y-3">
        {adjustments.map((item) => (
          <div key={item.id} className="rounded-xl bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-slate-900" dir="ltr">
                {item.delta >= 0 ? "+" : ""}${item.delta.toFixed(2)}
              </span>
              <LocalDate iso={item.created_at} className="text-xs text-slate-400" />
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {item.reason}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
