import { createAdminClient } from "@/lib/supabase/admin";
import { Trophy } from "lucide-react";
import { CompetitionForm } from "./_components/CompetitionForm";
import { CompetitionTable } from "./_components/CompetitionTable";

export const dynamic = "force-dynamic";

export default async function CompetitionsPage() {
  const supabase = createAdminClient();

  const { data: competitions } = await supabase
    .from("competitions")
    .select("id, title, start_time, end_time, reward, terms, is_active, created_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Trophy className="w-6 h-6 text-amber-500" />
          <h1 className="text-2xl font-bold text-slate-900">المسابقات</h1>
        </div>
        <p className="text-slate-500 text-sm">
          إنشاء وإدارة المسابقات اليومية للمستخدمين
        </p>
      </div>

      <CompetitionForm />

      <div className="mb-4 flex items-center justify-between mt-8">
        <h2 className="text-base font-semibold text-slate-900">
          المسابقات الحالية
          <span className="ms-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
            {(competitions ?? []).length}
          </span>
        </h2>
        <p className="text-xs text-slate-400">
          {(competitions ?? []).filter((c) => c.is_active).length} نشطة
        </p>
      </div>

      <CompetitionTable competitions={competitions ?? []} />
    </div>
  );
}
