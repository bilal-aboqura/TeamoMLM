import type { ReactNode } from "react";

type Variant = "neutral" | "success" | "warning" | "danger";

const variantConfig: Record<
  Variant,
  { bg: string; iconBg: string; iconText: string; valueText: string }
> = {
  neutral: {
    bg: "bg-slate-50 shadow-[0_2px_10px_rgba(0,0,0,0.02)]",
    iconBg: "bg-slate-100",
    iconText: "text-slate-500",
    valueText: "text-slate-900",
  },
  success: {
    bg: "bg-emerald-50 shadow-[0_2px_10px_rgba(0,0,0,0.02)]",
    iconBg: "bg-emerald-100/50",
    iconText: "text-emerald-700",
    valueText: "text-emerald-900",
  },
  warning: {
    bg: "bg-amber-50 shadow-[0_2px_10px_rgba(0,0,0,0.02)]",
    iconBg: "bg-amber-100/50",
    iconText: "text-amber-600",
    valueText: "text-amber-900",
  },
  danger: {
    bg: "bg-rose-50 shadow-[0_2px_10px_rgba(0,0,0,0.02)]",
    iconBg: "bg-rose-100/50",
    iconText: "text-rose-700",
    valueText: "text-rose-900",
  },
};

export function FinancialSummaryCard({
  title,
  value,
  icon,
  variant = "neutral",
  description,
}: {
  title: string;
  value: string;
  icon: ReactNode;
  variant?: Variant;
  description?: string;
}) {
  const config = variantConfig[variant];

  return (
    <div
      className={`${config.bg} rounded-xl p-6 hover:-translate-y-1 transition-all duration-300 group`}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-10 h-10 rounded-xl ${config.iconBg} ${config.iconText} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}
        >
          {icon}
        </div>
        <div className="text-end">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
            الإجمالي
          </span>
        </div>
      </div>

      <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
      <p
        className={`text-4xl font-black ${config.valueText} tracking-tight`}
        dir="ltr"
      >
        {value}
      </p>

      {description && <p className="text-xs text-slate-400 mt-2">{description}</p>}
    </div>
  );
}
