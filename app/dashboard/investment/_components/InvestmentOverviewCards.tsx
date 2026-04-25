import type { InvestmentSummary } from "@/lib/investment/calc";

function money(value: number) {
  return `${value.toFixed(2)} USDT`;
}

export function InvestmentOverviewCards({
  summary,
}: {
  summary: InvestmentSummary;
}) {
  const cards = [
    {
      label: "رأس المال",
      value: money(summary.totalCapital),
      className: "bg-slate-900 text-white",
      valueClass: "text-white",
    },
    {
      label: "إجمالي الأرباح",
      value: money(summary.grossProfit),
      className: "bg-white text-slate-900",
      valueClass: "text-emerald-600",
    },
    {
      label: "المتاح للسحب",
      value: money(summary.availableProfit),
      className: "bg-white text-slate-900",
      valueClass: "text-emerald-600",
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-2xl border border-slate-100 p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] ${card.className}`}
        >
          <p className="text-sm font-medium opacity-70">{card.label}</p>
          <p className={`mt-3 text-2xl font-black ${card.valueClass}`} dir="ltr">
            {card.value}
          </p>
        </div>
      ))}
    </section>
  );
}
