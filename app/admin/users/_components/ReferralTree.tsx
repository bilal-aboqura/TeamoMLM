"use client";

import { useState } from "react";
import { ChevronDown, Users, Crown } from "lucide-react";

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

// Flatten the nested tree into a flat array grouped by depth
function flattenByDepth(node: TreeNode, result: TreeNode[] = []): TreeNode[] {
  for (const child of node.children) {
    result.push(child);
    flattenByDepth(child, result);
  }
  return result;
}

function groupByDepth(allNodes: TreeNode[]): Record<number, TreeNode[]> {
  const groups: Record<number, TreeNode[]> = {};
  for (const node of allNodes) {
    const d = node.depth;
    if (!groups[d]) groups[d] = [];
    groups[d].push(node);
  }
  return groups;
}

const LEVEL_STYLES: Record<
  number,
  { bg: string; border: string; badge: string; icon: string; label: string }
> = {
  1: {
    bg: "bg-gradient-to-r from-emerald-50 to-emerald-50/30",
    border: "border-emerald-200",
    badge: "bg-emerald-600 text-white",
    icon: "text-emerald-600",
    label: "الجيل الأول",
  },
  2: {
    bg: "bg-gradient-to-r from-blue-50 to-blue-50/30",
    border: "border-blue-200",
    badge: "bg-blue-600 text-white",
    icon: "text-blue-600",
    label: "الجيل الثاني",
  },
  3: {
    bg: "bg-gradient-to-r from-violet-50 to-violet-50/30",
    border: "border-violet-200",
    badge: "bg-violet-600 text-white",
    icon: "text-violet-600",
    label: "الجيل الثالث",
  },
  4: {
    bg: "bg-gradient-to-r from-amber-50 to-amber-50/30",
    border: "border-amber-200",
    badge: "bg-amber-600 text-white",
    icon: "text-amber-600",
    label: "الجيل الرابع",
  },
  5: {
    bg: "bg-gradient-to-r from-rose-50 to-rose-50/30",
    border: "border-rose-200",
    badge: "bg-rose-600 text-white",
    icon: "text-rose-600",
    label: "الجيل الخامس",
  },
};

function MemberRow({ node }: { node: TreeNode }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600 shrink-0">
        {node.full_name.charAt(0)}
      </div>

      {/* Name + code */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-slate-900 truncate">
            {node.full_name}
          </p>
          {node.leadership_level && (
            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
              <Crown className="w-2.5 h-2.5" />
              L{node.leadership_level}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 font-mono mt-0.5">
          {node.referral_code}
        </p>
      </div>

      {/* Date */}
      <p className="text-xs text-slate-400 shrink-0">
        {new Date(node.created_at).toLocaleDateString("ar-EG", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </p>
    </div>
  );
}

function LevelCard({
  depth,
  members,
}: {
  depth: number;
  members: TreeNode[];
}) {
  const [open, setOpen] = useState(depth === 1);
  const style = LEVEL_STYLES[depth] ?? LEVEL_STYLES[1];

  return (
    <div
      className={`rounded-2xl border ${style.border} overflow-hidden transition-all duration-200`}
    >
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-4 px-5 py-4 ${style.bg} transition-all duration-200 hover:brightness-[0.97]`}
      >
        {/* Level badge */}
        <span
          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${style.badge}`}
        >
          {depth}
        </span>

        {/* Label */}
        <div className="flex-1 text-start">
          <p className="font-semibold text-slate-900 text-sm">{style.label}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {members.length} عضو
          </p>
        </div>

        {/* Members avatars preview */}
        <div className="flex -space-x-2 space-x-reverse me-2">
          {members.slice(0, 4).map((m) => (
            <div
              key={m.id}
              className="w-7 h-7 rounded-full bg-white border-2 border-white flex items-center justify-center text-xs font-bold text-slate-600 shadow-sm"
              style={{ background: "rgb(241 245 249)" }}
              title={m.full_name}
            >
              {m.full_name.charAt(0)}
            </div>
          ))}
          {members.length > 4 && (
            <div className="w-7 h-7 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600">
              +{members.length - 4}
            </div>
          )}
        </div>

        {/* Chevron */}
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-300 shrink-0 ${
            open ? "rotate-180" : "rotate-0"
          }`}
          strokeWidth={2}
        />
      </button>

      {/* Members list */}
      {open && (
        <div className="bg-white px-5 py-1">
          {members.map((m) => (
            <MemberRow key={m.id} node={m} />
          ))}
        </div>
      )}
    </div>
  );
}

export function ReferralTree({ root }: { root: TreeNode }) {
  const allDescendants = flattenByDepth(root);
  const grouped = groupByDepth(allDescendants);
  const depths = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => a - b);

  if (depths.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
        <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" strokeWidth={1.5} />
        <p className="text-slate-700 font-semibold">لا يوجد أعضاء في الشبكة بعد</p>
        <p className="text-sm text-slate-400 mt-1">
          لم يقم هذا المستخدم بدعوة أي أعضاء حتى الآن
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="flex items-center justify-between bg-slate-50 rounded-2xl px-5 py-3 border border-slate-100 mb-1">
        <p className="text-sm font-semibold text-slate-700">
          إجمالي الشبكة
        </p>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-lg font-bold text-slate-900">
              {allDescendants.length}
            </p>
            <p className="text-[10px] text-slate-400">عضو</p>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="text-center">
            <p className="text-lg font-bold text-slate-900">{depths.length}</p>
            <p className="text-[10px] text-slate-400">جيل</p>
          </div>
        </div>
      </div>

      {/* Level cards */}
      {depths.map((depth) => (
        <LevelCard key={depth} depth={depth} members={grouped[depth]} />
      ))}
    </div>
  );
}
