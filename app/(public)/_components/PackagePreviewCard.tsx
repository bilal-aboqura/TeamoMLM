import Link from "next/link";
import { PublicPackage } from "@/app/(public)/_data/public-packages";

export default function PackagePreviewCard({ pkg }: { pkg: PublicPackage }) {
  const isPopular = pkg.display_order === 4;
  const isFree = pkg.price === 0;

  return (
    <div className={`relative bg-white rounded-2xl p-6 md:p-8 border ${isPopular ? 'border-emerald-500 shadow-[0_4px_20px_rgba(0,0,0,0.06)]' : 'border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]'} hover:-translate-y-1 transition-all duration-300 flex flex-col h-full`}>
      {isPopular && (
        <div className="absolute -top-3.5 inset-x-0 flex justify-center">
          <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
            الأكثر شعبية
          </span>
        </div>
      )}
      
      <div className="text-center mb-6">
        <h3 className="text-xl font-semibold text-slate-900 mb-2">{pkg.name}</h3>
        <div className="flex items-baseline justify-center gap-1">
          {isFree ? (
            <span className="text-3xl lg:text-4xl font-bold text-emerald-600">مجاناً</span>
          ) : (
            <>
              <span className="text-3xl lg:text-4xl font-bold text-emerald-600">{pkg.price}</span>
              <span className="text-slate-500 text-sm">/ إيداع</span>
            </>
          )}
        </div>
      </div>

      <ul className="space-y-4 mb-8 flex-1">
        <li className="flex items-center gap-3 text-slate-600 text-sm">
          <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{pkg.daily_task_count} مهام يومية</span>
        </li>
        <li className="flex items-center gap-3 text-slate-600 text-sm">
          <svg className="w-5 h-5 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>أرباح يومية: {pkg.daily_profit}</span>
        </li>
      </ul>

      <Link
        href="/register"
        className={`block text-center w-full py-3 px-4 rounded-xl font-medium transition-all active:scale-95 ${
          isPopular 
            ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-[0_4px_14px_0_rgba(5,150,105,0.39)]' 
            : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
        }`}
        aria-label={`سجل الآن للانضمام في ${pkg.name}`}
      >
        سجّل الآن للانضمام
      </Link>
    </div>
  );
}
