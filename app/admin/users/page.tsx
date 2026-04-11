import { createAdminClient } from "@/lib/supabase/admin";
import { UsersTable } from "./_components/UsersTable";
import { UserSearchForm } from "./_components/UserSearchForm";

const PAGE_SIZE = 20;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const search = params.search ?? "";
  const page = Math.max(0, Number(params.page ?? "0") || 0);

  const supabase = createAdminClient();

  let query = supabase
    .from("users")
    .select(
      "id, full_name, phone_number, current_package_level, wallet_balance, leadership_level, status, created_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,phone_number.ilike.%${search}%`
    );
  }

  const { data: users, count } = await query.range(
    page * PAGE_SIZE,
    page * PAGE_SIZE + PAGE_SIZE - 1
  );

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">المستخدمون</h1>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
            {count ?? 0}
          </span>
        </div>
        <p className="text-slate-500 text-sm mt-1">
          إدارة حسابات المستخدمين ومستويات القيادة
        </p>
      </div>
      <UserSearchForm defaultValue={search} />
      <div className="mt-5">
        <UsersTable
          users={users ?? []}
          totalCount={count ?? 0}
          page={page}
          search={search}
          pageSize={PAGE_SIZE}
        />
      </div>
    </div>
  );
}
