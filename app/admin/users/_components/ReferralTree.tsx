"use client";

type TreeNode = {
  id: string;
  full_name: string;
  referral_code: string;
  leadership_level: number | null;
  parent_id: string | null;
  depth: number;
  created_at: string;
  children: TreeNode[];
};

function TreeNodeCard({ node, isRoot }: { node: TreeNode; isRoot?: boolean }) {
  const levelColors: Record<number, string> = {
    1: "bg-amber-100 text-amber-800 border-amber-200",
    2: "bg-emerald-100 text-emerald-800 border-emerald-200",
    3: "bg-blue-100 text-blue-800 border-blue-200",
    4: "bg-purple-100 text-purple-800 border-purple-200",
    5: "bg-rose-100 text-rose-800 border-rose-200",
  };

  return (
    <div className="flex flex-col items-center">
      {/* Card */}
      <div
        className={`relative flex flex-col items-center gap-1 px-4 py-3 rounded-2xl border shadow-[0_2px_10px_rgba(0,0,0,0.04)] min-w-[140px] text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)] ${
          isRoot
            ? "bg-slate-900 border-slate-700 text-white"
            : "bg-white border-slate-100"
        }`}
      >
        {/* Avatar */}
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
            isRoot ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
          }`}
        >
          {node.full_name.charAt(0)}
        </div>

        {/* Name */}
        <p
          className={`text-xs font-semibold leading-tight max-w-[120px] truncate ${
            isRoot ? "text-white" : "text-slate-900"
          }`}
        >
          {node.full_name}
        </p>

        {/* Referral code */}
        <p
          className={`text-[10px] font-mono ${
            isRoot ? "text-slate-300" : "text-slate-400"
          }`}
        >
          {node.referral_code}
        </p>

        {/* Leadership badge */}
        {node.leadership_level && (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              levelColors[node.leadership_level] ??
              "bg-slate-100 text-slate-700 border-slate-200"
            }`}
          >
            L{node.leadership_level}
          </span>
        )}

        {/* Depth badge */}
        {!isRoot && (
          <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center">
            {node.depth}
          </span>
        )}
      </div>

      {/* Children */}
      {node.children.length > 0 && (
        <div className="flex flex-col items-center mt-0">
          {/* Vertical line down from parent */}
          <div className="w-px h-6 bg-slate-200" />

          {/* Horizontal line spanning children */}
          {node.children.length > 1 && (
            <div className="relative flex items-start">
              <div
                className="absolute top-0 left-0 right-0 h-px bg-slate-200"
                style={{
                  left: `calc(50% - ${(node.children.length - 1) * 50}%)`,
                  right: `calc(50% - ${(node.children.length - 1) * 50}%)`,
                }}
              />
            </div>
          )}

          <div className="flex items-start gap-4 md:gap-8">
            {node.children.map((child) => (
              <div key={child.id} className="flex flex-col items-center">
                {/* Vertical line up to horizontal */}
                <div className="w-px h-6 bg-slate-200" />
                <TreeNodeCard node={child} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ReferralTree({ root }: { root: TreeNode }) {
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex justify-center min-w-max px-4">
        <TreeNodeCard node={root} isRoot />
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-8 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-slate-900" />
          <span className="text-xs text-slate-500">المستخدم المحدد</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-white border border-slate-200" />
          <span className="text-xs text-slate-500">عضو عادي</span>
        </div>
        {[1, 2, 3].map((l) => (
          <div key={l} className="flex items-center gap-1.5">
            <div
              className={`w-3 h-3 rounded-full border ${
                {
                  1: "bg-amber-100 border-amber-200",
                  2: "bg-emerald-100 border-emerald-200",
                  3: "bg-blue-100 border-blue-200",
                }[l]
              }`}
            />
            <span className="text-xs text-slate-500">قيادي L{l}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 text-[9px] font-bold flex items-center justify-center">
            N
          </div>
          <span className="text-xs text-slate-500">رقم الجيل</span>
        </div>
      </div>
    </div>
  );
}
