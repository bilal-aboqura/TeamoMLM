import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Wallet, Package, CheckSquare, ClipboardList, Users, Rocket, Trophy, CreditCard, Info, Coins, BarChart2 } from "lucide-react";
import { BalanceCard } from "./_components/BalanceCard";
import { PackageStatusBadge } from "./_components/PackageStatusBadge";
import { ReferralTool } from "./_components/ReferralTool";
import { LogoutButton } from "./_components/LogoutButton";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select(
      "id, full_name, phone_number, referral_code, wallet_balance, total_earned, current_package_level, status"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/login");

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 lg:py-12">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              أهلاً بك، {profile.full_name}
            </h1>
            <p className="text-slate-500 mt-1">{profile.phone_number}</p>
          </div>
          <LogoutButton />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Top Row: Balance (Wide) & Status */}
          <div className="md:col-span-2">
            <BalanceCard
              walletBalance={profile.wallet_balance}
              totalEarned={profile.total_earned}
            />
          </div>
          
          <div className="col-span-1 border-none">
            <PackageStatusBadge
              currentPackageLevel={profile.current_package_level}
            />
          </div>

          {/* Middle Row: Referral tool (Wide) */}
          <div className="md:col-span-3 lg:col-span-3">
            <ReferralTool referralCode={profile.referral_code} />
          </div>

          {/* Bottom Row: Navigation Tabs */}
          <div className="md:col-span-3">
            <nav className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link
                href="/dashboard/wallet"
                className="bg-white rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] group flex flex-col items-center justify-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center transition-colors group-hover:bg-emerald-50 text-slate-400 group-hover:text-emerald-600">
                  <Wallet className="w-6 h-6" strokeWidth={2} />
                </div>
                <span className="text-sm font-medium text-slate-700">المحفظة</span>
              </Link>
              <Link
                href="/dashboard/packages"
                className="bg-white rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] group flex flex-col items-center justify-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center transition-colors group-hover:bg-emerald-50 text-slate-400 group-hover:text-emerald-600">
                  <Package className="w-6 h-6" strokeWidth={2} />
                </div>
                <span className="text-sm font-medium text-slate-700">الباقات</span>
              </Link>
              <Link
                href="/dashboard/profit-shares"
                className="bg-white rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] group flex flex-col items-center justify-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center transition-colors group-hover:bg-emerald-50 text-slate-400 group-hover:text-emerald-600">
                  <Coins className="w-6 h-6" strokeWidth={2} />
                </div>
                <span className="text-sm font-medium text-slate-700">حصص الأرباح</span>
              </Link>
              <Link
                href="/dashboard/investment"
                className="bg-white rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] group flex flex-col items-center justify-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center transition-colors group-hover:bg-emerald-50 text-slate-400 group-hover:text-emerald-600">
                  <BarChart2 className="w-6 h-6" strokeWidth={2} />
                </div>
                <span className="text-sm font-medium text-slate-700">الاستثمار</span>
              </Link>
              <Link
                href="/dashboard/tasks"
                className="bg-white rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] group flex flex-col items-center justify-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center transition-colors group-hover:bg-emerald-50 text-slate-400 group-hover:text-emerald-600">
                  <CheckSquare className="w-6 h-6" strokeWidth={2} />
                </div>
                <span className="text-sm font-medium text-slate-700">المهام</span>
              </Link>
              <Link
                href="/dashboard/history"
                className="bg-white rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] group flex flex-col items-center justify-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center transition-colors group-hover:bg-emerald-50 text-slate-400 group-hover:text-emerald-600">
                  <ClipboardList className="w-6 h-6" strokeWidth={2} />
                </div>
                <span className="text-sm font-medium text-slate-700">سجلي</span>
              </Link>
              <Link
                href="/dashboard/team"
                className="bg-white rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] group flex flex-col items-center justify-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center transition-colors group-hover:bg-emerald-50 text-slate-400 group-hover:text-emerald-600">
                  <Users className="w-6 h-6" strokeWidth={2} />
                </div>
                <span className="text-sm font-medium text-slate-700">فريقي</span>
              </Link>
              <Link
                href="/dashboard/boost-earnings"
                className="bg-white rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] group flex flex-col items-center justify-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center transition-colors group-hover:bg-emerald-50 text-slate-400 group-hover:text-emerald-600">
                  <Rocket className="w-6 h-6" strokeWidth={2} />
                </div>
                <span className="text-sm font-medium text-slate-700">زيادة الأرباح</span>
              </Link>
              <Link
                href="/dashboard/competitions"
                className="bg-white rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] group flex flex-col items-center justify-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center transition-colors group-hover:bg-amber-50 text-slate-400 group-hover:text-amber-500">
                  <Trophy className="w-6 h-6" strokeWidth={2} />
                </div>
                <span className="text-sm font-medium text-slate-700">المسابقات</span>
              </Link>
              <Link
                href="/dashboard/pay-later"
                className="bg-white rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] group flex flex-col items-center justify-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center transition-colors group-hover:bg-emerald-50 text-slate-400 group-hover:text-emerald-600">
                  <CreditCard className="w-6 h-6" strokeWidth={2} />
                </div>
                <span className="text-sm font-medium text-slate-700">ترقية بالآجل</span>
              </Link>
              <Link
                href="/dashboard/marketing"
                className="bg-white rounded-2xl p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] group flex flex-col items-center justify-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center transition-colors group-hover:bg-emerald-50 text-slate-400 group-hover:text-emerald-600">
                  <Info className="w-6 h-6" strokeWidth={2} />
                </div>
                <span className="text-sm font-medium text-slate-700">التسويق والمعلومات</span>
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
