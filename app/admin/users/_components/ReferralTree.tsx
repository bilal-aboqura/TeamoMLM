"use client";

import { useState } from "react";
import { LocalDate } from "@/components/ui/LocalDate";

type TreeNode = {
  id: string;
  full_name: string;
  referral_code: string;
  leadership_level: number | null;
  created_at: string;
  children: TreeNode[];
};

export function ReferralTree({ root }: { root: TreeNode }) {
  return (
    <div className="w-full text-start" dir="rtl">
      <TreeNodeRow node={root} depth={0} isRoot />
      {root.children.length === 0 && (
        <div className="mt-8 p-6 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-200/50 flex flex-shrink-0 items-center justify-center">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700">لا يوجد إحالات مسجلة</p>
            <p className="text-xs text-slate-400 mt-0.5">هذا المستخدم لم يقم بدعوة أي أعضاء جدد بعد.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function TreeNodeRow({
  node,
  depth,
  isRoot,
}: {
  node: TreeNode;
  depth: number;
  isRoot?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const hasChildren = node.children.length > 0;

  return (
    <div className="relative">
      {/* Visual node line connector for children */}
      {!isRoot && (
        <div
          className="absolute top-0 bottom-0 bg-slate-200 w-px"
          style={{ right: `${Math.max(0, depth * 48 - 24)}px` }}
        />
      )}

      {!isRoot && (
        <div
          className="absolute top-6 h-px bg-slate-200"
          style={{
            right: `${Math.max(0, depth * 48 - 24)}px`,
            width: "24px",
          }}
        />
      )}

      {/* Node Content */}
      <div
        className="relative flex items-start py-2"
        style={{ paddingRight: depth > 0 ? `${depth * 48}px` : "0px" }}
      >
        <div
          className={`group flex items-center gap-3 pe-6 ps-2.5 py-2.5 rounded-2xl border transition-all duration-200 cursor-default ${
            isRoot
              ? "bg-slate-900 border-slate-800 shadow-[0_8px_30px_rgba(15,23,42,0.2)] text-white"
              : "bg-white border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-emerald-200 hover:shadow-sm"
          }`}
        >
          {/* Collapse/Expand Toggle or Spacer if no children */}
          <div className="w-5 h-5 flex items-center justify-center shrink-0 me-1">
            {hasChildren ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCollapsed(!collapsed);
                }}
                className={`w-5 h-5 flex items-center justify-center rounded-md transition-colors ${
                  isRoot
                    ? "bg-white/10 hover:bg-white/20 text-white"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-400"
                }`}
                aria-label={collapsed ? "توسيع" : "طي"}
              >
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d={collapsed ? "M12 4v16m8-8H4" : "M20 12H4"}
                  />
                </svg>
              </button>
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
            )}
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-bold truncate max-w-[150px] sm:max-w-[200px] ${
                  isRoot ? "text-white" : "text-slate-900"
                }`}
              >
                {node.full_name}
              </span>
              {node.leadership_level ? (
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black tracking-widest ${
                    isRoot ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  L{node.leadership_level}
                </span>
              ) : null}
            </div>
            <div
              className={`text-[10px] font-mono mt-0.5 tracking-wider ${
                isRoot ? "text-slate-400" : "text-slate-500"
              }`}
            >
              {node.referral_code}
            </div>
          </div>

          <div className="ms-2 flex flex-col items-end gap-0.5">
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                isRoot ? "bg-white/10 text-slate-300" : "bg-slate-50 text-slate-500"
              }`}
            >
              {node.children.length} عضو
            </span>
            {!isRoot && (
                <LocalDate iso={node.created_at} options={{ day: "numeric", month: "short", year: "numeric" }} className="text-[9px] text-slate-400 font-mono px-1" />
            )}
          </div>
        </div>
      </div>

      {/* Children Container */}
      {!collapsed && hasChildren && (
        <div className="relative">
          {/* Vertical line for children indentation */}
          <div
            className="absolute top-0 bottom-0 bg-slate-200 w-px z-0 pointer-events-none"
            style={{
              right: `${depth * 48 + 24}px`,
              bottom: "28px",
            }}
          />
          <div>
            {node.children.map((child) => (
              <TreeNodeRow key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
