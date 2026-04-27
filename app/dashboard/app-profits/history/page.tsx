import Image from "next/image";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getAppProfitAccess } from "@/lib/app-profits/access";

export const dynamic = "force-dynamic";

const statusLabels = {
  pending_review: "قيد المراجعة",
  approved: "تم القبول",
  rejected: "مرفوض",
};

export default async function AppProfitHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const access = await getAppProfitAccess(user.id);
  if (!access.allowed) redirect("/dashboard/app-profits");

  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from("app_profit_submissions")
    .select("id, screenshot_url, status, created_at, app_profit_offers(title, reward_usd)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const rows = await Promise.all(
    (data ?? []).map(async (row) => {
      const { data: signed } = await adminClient.storage
        .from("app-profit-proofs")
        .createSignedUrl(row.screenshot_url, 900);
      const offer = row.app_profit_offers as unknown as { title: string; reward_usd: number } | null;
      return {
        id: row.id,
        title: offer?.title ?? "غير متوفر",
        reward: Number(offer?.reward_usd ?? 0),
        status: row.status as keyof typeof statusLabels,
        created_at: row.created_at,
        signedUrl: signed?.signedUrl ?? "",
      };
    })
  );

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">سجل تطبيقاتي</h1>
        <p className="mt-1 text-sm text-slate-500">كل إثباتات الربح بالتطبيقات الخاصة بك</p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">لا توجد إثباتات تطبيقات بعد</div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <article key={row.id} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <a href={row.signedUrl} target="_blank" rel="noopener noreferrer" className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                <Image src={row.signedUrl} alt={row.title} fill className="object-cover" unoptimized />
              </a>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-bold text-slate-900">{row.title}</h2>
                <p className="mt-1 text-xs text-slate-400">{new Date(row.created_at).toLocaleDateString("ar-EG")}</p>
                <p className="mt-1 text-sm font-bold text-emerald-600" dir="ltr">{row.reward.toFixed(2)} USD</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                {statusLabels[row.status]}
              </span>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
