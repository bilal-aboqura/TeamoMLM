export type TreeRow = {
  id: string;
  full_name: string;
  referral_code: string;
  status: "active" | "suspended";
  parent_id: string | null;
  depth: number;
  created_at: string;
};

export type TreeNode = {
  id: string;
  full_name: string;
  referral_code: string;
  status: "active" | "suspended";
  depth: number;
  created_at: string;
  children: TreeNode[];
};

export function buildTree(rows: TreeRow[], rootId: string): TreeNode[] {
  const map = new Map<string, TreeNode[]>();

  for (const row of rows) {
    const parentId = row.parent_id ?? rootId;
    if (!map.has(parentId)) map.set(parentId, []);

    const node: TreeNode = {
      id: row.id,
      full_name: row.full_name,
      referral_code: row.referral_code,
      status: row.status,
      depth: row.depth,
      created_at: row.created_at,
      children: [],
    };

    map.get(parentId)!.push(node);
  }

  function attachChildren(parentId: string): TreeNode[] {
    const nodes = map.get(parentId) ?? [];
    for (const node of nodes) {
      node.children = attachChildren(node.id);
    }
    return nodes;
  }

  return attachChildren(rootId);
}
