// Icon map + variant config for each stat card type
type Variant = "neutral" | "warning" | "success" | "danger";

const variantConfig: Record<
  Variant,
  { bg: string; iconBg: string; iconText: string; valueText: string; ring: string }
> = {
  neutral: {
    bg: "bg-slate-50 shadow-[0_2px_10px_rgba(0,0,0,0.02)]",
    iconBg: "bg-slate-100",
    iconText: "text-slate-500",
    valueText: "text-slate-900",
    ring: "",
  },
  warning: {
    bg: "bg-amber-50 shadow-[0_2px_10px_rgba(0,0,0,0.02)]",
    iconBg: "bg-amber-100/50",
    iconText: "text-amber-600",
    valueText: "text-amber-900",
    ring: "",
  },
  success: {
    bg: "bg-emerald-50 shadow-[0_2px_10px_rgba(0,0,0,0.02)]",
    iconBg: "bg-emerald-100/50",
    iconText: "text-emerald-700",
    valueText: "text-emerald-900",
    ring: "",
  },
  danger: {
    bg: "bg-rose-50 shadow-[0_2px_10px_rgba(0,0,0,0.02)]",
    iconBg: "bg-rose-100/50",
    iconText: "text-rose-700",
    valueText: "text-rose-900",
    ring: "",
  },
};

const defaultIcons: Record<string, React.ReactNode> = {
  users: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  deposits: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  tasks: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export function StatCard({
  title,
  value,
  variant,
  iconType,
  description,
}: {
  title: string;
  value: number;
  variant: Variant;
  iconType?: "users" | "deposits" | "tasks";
  description?: string;
}) {
  const config = variantConfig[variant];
  const icon = iconType ? defaultIcons[iconType] : defaultIcons.users;

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
        {/* Trend indicator placeholder — can be wired up later */}
        <div className="text-end">
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
            الإجمالي
          </span>
        </div>
      </div>

      <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
      <p className={`text-4xl font-black ${config.valueText} tracking-tight`}>{value}</p>

      {description && (
        <p className="text-xs text-slate-400 mt-2">{description}</p>
      )}
    </div>
  );
}
