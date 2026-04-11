import Link from "next/link";

export function NoPackageEmptyState() {
  return (
    <div className="text-center py-16">
      <div className="mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-16 w-16 mx-auto text-slate-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      </div>
      <p className="text-slate-600 mb-6">
        يجب الاشتراك في باقة للوصول إلى المهام اليومية
      </p>
      <Link
        href="/dashboard/packages"
        className="inline-block bg-emerald-600 text-white rounded-xl px-6 py-3 font-bold hover:bg-emerald-700 active:scale-95 transition-all duration-200"
      >
        تصفح الباقات
      </Link>
    </div>
  );
}
