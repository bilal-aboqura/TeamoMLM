import { createAdminClient } from "@/lib/supabase/admin";
import { StatCard } from "./_components/StatCard";

export default async function OverviewPage() {
  const supabase = createAdminClient();

  const [usersRes, depositsRes, tasksRes] = await Promise.all([
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase
      .from("package_subscription_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("task_completion_logs")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">النظرة العامة</h1>
        <p className="text-slate-500 text-sm mt-1">
          ملخص لحالة المنصة في الوقت الفعلي
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <StatCard
          title="إجمالي المستخدمين"
          value={usersRes.count ?? 0}
          variant="neutral"
          iconType="users"
          description="المستخدمون المسجلون في المنصة"
        />
        <StatCard
          title="الإيداعات المعلقة"
          value={depositsRes.count ?? 0}
          variant="warning"
          iconType="deposits"
          description="طلبات الاشتراك بانتظار المراجعة"
        />
        <StatCard
          title="المهام المعلقة"
          value={tasksRes.count ?? 0}
          variant="warning"
          iconType="tasks"
          description="إثباتات المهام بانتظار الموافقة"
        />
      </div>

      {/* Quick-action hints */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-50 rounded-xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <h2 className="text-sm font-semibold text-slate-800 mb-1">
            أولويات اليوم
          </h2>
          <p className="text-sm text-slate-500">
            {(depositsRes.count ?? 0) > 0
              ? `يوجد ${depositsRes.count} طلب إيداع ينتظر المراجعة.`
              : "لا توجد إيداعات معلقة — أحسنت!"}
          </p>
          {(tasksRes.count ?? 0) > 0 && (
            <p className="text-sm text-slate-500 mt-1">
              يوجد {tasksRes.count} إثبات مهام ينتظر الموافقة.
            </p>
          )}
        </div>
        <div className="bg-slate-900 rounded-xl p-6 text-slate-50">
          <h2 className="text-sm font-semibold mb-1">Teamo Admin</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            منصة إدارة متكاملة — المهام، الإيداعات، المستخدمون، والشجرة التحويلية.
          </p>
        </div>
      </div>
    </div>
  );
}
