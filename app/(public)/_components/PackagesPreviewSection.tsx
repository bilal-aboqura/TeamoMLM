import Link from "next/link";
import { getPublicPackages } from "@/app/(public)/_data/public-packages";
import PackagePreviewCard from "./PackagePreviewCard";

export default async function PackagesPreviewSection() {
  const packages = await getPublicPackages();

  return (
    <section className="py-20 flex flex-col px-6 bg-slate-50">
      <div className="max-w-7xl mx-auto w-full">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">باقات VIP للاشتراك</h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            اختر الباقة التي تناسب طموحاتك وابدأ في مضاعفة أرباحك اليومية
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <PackagePreviewCard key={pkg.name} pkg={pkg} />
          ))}
        </div>

        <div className="text-center mt-16">
          <Link
            href="/register"
            className="inline-block w-full sm:w-auto text-center bg-slate-900 text-white rounded-xl py-4 px-10 text-lg font-medium hover:bg-slate-800 transition-all active:scale-95 shadow-sm"
          >
            سجّل الآن وابدأ الربح
          </Link>
        </div>
      </div>
    </section>
  );
}
