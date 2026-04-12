"use client";

import { useState } from "react";
import type { TreeNode } from "./treeUtils";
import { ChevronDown, Users } from "lucide-react";
import { LocalDate } from "@/components/ui/LocalDate";

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <ChevronDown
      className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
        expanded ? "rotate-0" : "rotate-90"
      }`}
      strokeWidth={2}
    />
  );
}

function TreeNodeItem({
  node,
  depth,
  expandedMap,
  toggle,
}: {
  node: TreeNode;
  depth: number;
  expandedMap: Record<string, boolean>;
  toggle: (id: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedMap[node.id] ?? false;

  const statusLabel = node.status === "active" ? "نشط" : "معلق";
  const statusClasses =
    node.status === "active"
      ? "bg-emerald-50 text-emerald-700"
      : "bg-yellow-50 text-yellow-700";

  return (
    <div>
      <button
        onClick={() => hasChildren && toggle(node.id)}
        // marginInlineStart is a logical CSS property (RTL-safe ms- equivalent).
        // We use inline style here because Tailwind JIT cannot process
        // dynamic arbitrary values like ms-[${depth * 1.5}rem] at build time.
        className="w-full text-start bg-white rounded-xl p-4 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all duration-200 hover:border-slate-200 flex items-center gap-3"
        style={{ marginInlineStart: `${depth * 1.5}rem` }}
      >
        {hasChildren && <ChevronIcon expanded={isExpanded} />}

        <span className="bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full px-2 py-0.5">
          L{node.depth}
        </span>

        <span className="font-semibold text-slate-900 flex-1">
          {node.full_name}
        </span>

        <span
          className={`text-xs font-medium rounded-full px-2 py-0.5 ${statusClasses}`}
        >
          {statusLabel}
        </span>

        <span className="text-xs text-slate-400 flex items-center gap-1" dir="ltr">
          <span className="hidden sm:inline text-slate-300 me-0.5" dir="rtl">انضم</span>
          <LocalDate iso={node.created_at} options={{ day: "numeric", month: "short", year: "numeric" }} />
        </span>
      </button>

      {hasChildren && isExpanded && (
        <div className="mt-2 space-y-2">
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedMap={expandedMap}
              toggle={toggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function MyDownlineTree({ tree }: { tree: TreeNode[] }) {
  // Lazy initializer — runs only once on mount, not on every re-render.
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const node of tree) {
      map[node.id] = true; // L1 nodes start expanded
    }
    return map;
  });

  const toggle = (id: string) => {
    setExpandedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (tree.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <Users className="h-12 w-12 mx-auto text-slate-300 mb-3" strokeWidth={1.5} />
        <p className="text-slate-700 font-semibold">
          ليس لديك أعضاء في فريقك بعد
        </p>
        <p className="text-sm text-slate-400 mt-1">
          شارك رابط الدعوة لتبدأ في بناء فريقك
        </p>
        <a
          href="#invite-link"
          className="inline-block mt-4 bg-slate-900 text-white rounded-xl px-6 py-3 font-bold hover:bg-slate-800 active:scale-95 transition-all duration-200"
        >
          شارك رابط الدعوة
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-4">
        <span className="font-bold">أنت (الجذر)</span>
      </div>

      {tree.map((node) => (
        <TreeNodeItem
          key={node.id}
          node={node}
          depth={0}
          expandedMap={expandedMap}
          toggle={toggle}
        />
      ))}
    </div>
  );
}
