import { createAdminClient } from "@/lib/supabase/admin";
import { ReferralTree } from "../../_components/ReferralTree";

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

export default async function TreePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: rows } = await supabase.rpc("get_referral_tree", {
    p_root_id: id,
    p_max_depth: 5,
  });

  if (!rows || rows.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 border border-slate-100 text-center">
        <p className="text-slate-500">المستخدم غير موجود</p>
      </div>
    );
  }

  const nodeMap = new Map<string, TreeNode>();
  const flatRows = rows as Array<{
    id: string;
    full_name: string;
    referral_code: string;
    leadership_level: number | null;
    parent_id: string | null;
    depth: number;
    created_at: string;
  }>;

  for (const row of flatRows) {
    nodeMap.set(row.id, { ...row, children: [] });
  }

  let root: TreeNode | null = null;
  for (const row of flatRows) {
    const node = nodeMap.get(row.id)!;
    if (row.depth === 0) {
      // The root is the node returned at depth 0 — always the queried user
      root = node;
    } else if (nodeMap.has(row.parent_id!)) {
      nodeMap.get(row.parent_id!)!.children.push(node);
    }
  }

  if (!root) {
    return (
      <div className="bg-white rounded-2xl p-12 border border-slate-100 text-center">
        <p className="text-slate-500">المستخدم غير موجود</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <a
          href="/admin/users"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-600 mb-4 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          العودة لإدارة المستخدمين
        </a>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">
            شجرة الإحالات — {root.full_name}
          </h1>
          {root.leadership_level && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-900 text-white text-xs font-bold shadow-[0_2px_10px_rgba(15,23,42,0.15)]">
              L{root.leadership_level}
            </span>
          )}
        </div>
        <p className="text-slate-500 text-sm mt-1">
          عرض هرمي للأعضاء المشتركين عن طريق الإحالة حتى الجيل الخامس
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-6 md:p-10">
        <ReferralTree root={root} />
      </div>
    </div>
  );
}
