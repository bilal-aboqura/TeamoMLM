export default function WalletLoading() {
  return (
    <div dir="rtl" className="max-w-3xl mx-auto p-6 space-y-8 animate-pulse">
      <div className="h-8 bg-slate-200/50 rounded-lg w-32"></div>

      {/* Stats Card Skeleton */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="bg-slate-200/50 h-32 w-full"></div>
        <div className="grid grid-cols-2 divide-s divide-slate-100 p-6">
          <div className="h-12 bg-slate-200/50 rounded-lg mx-4"></div>
          <div className="h-12 bg-slate-200/50 rounded-lg mx-4"></div>
        </div>
      </div>

      {/* Form Skeleton */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">
        <div className="h-6 bg-slate-200/50 rounded w-48 mb-6"></div>
        <div className="h-12 bg-slate-200/50 rounded-xl"></div>
        <div className="h-12 bg-slate-200/50 rounded-xl"></div>
        <div className="h-12 bg-slate-200/50 rounded-xl mt-4"></div>
      </div>

      {/* Table/List Skeleton */}
      <div className="space-y-4">
        <div className="h-6 bg-slate-200/50 rounded w-32 px-2"></div>
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="divide-y divide-slate-50">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 sm:p-5 flex items-center justify-between">
                <div className="flex items-center gap-4 w-full">
                  <div className="w-12 h-12 rounded-2xl bg-slate-200/50 shrink-0"></div>
                  <div className="space-y-2 w-1/3">
                    <div className="h-4 bg-slate-200/50 rounded w-full"></div>
                    <div className="h-3 bg-slate-200/50 rounded w-2/3"></div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 w-1/4">
                  <div className="h-5 bg-slate-200/50 rounded w-16"></div>
                  <div className="h-4 bg-slate-200/50 rounded-full w-20"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
