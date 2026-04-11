import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getPackagesWithUserStatus,
  getActivePaymentSetting,
} from "./data";
import { PackageGrid } from "./_components/PackageGrid";

export default async function PackagesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [packages, paymentSetting] = await Promise.all([
    getPackagesWithUserStatus(user.id),
    getActivePaymentSetting(),
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 lg:py-24">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">
          الباقات وخطط العمل
        </h1>
        <p className="text-lg text-slate-500 leading-relaxed">
          اختر الباقة المناسبة للبدء في تكوين مصدر الدخل واستلام المهام اليومية المربحة.
        </p>
      </div>
      <PackageGrid packages={packages} paymentSetting={paymentSetting} />
    </div>
  );
}
