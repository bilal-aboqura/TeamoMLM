export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 lg:py-12">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header Skeleton */}
        <div className="animate-pulse flex items-center justify-between">
          <div className="space-y-3">
            <div className="h-8 bg-slate-200/60 rounded-md w-48" />
            <div className="h-5 bg-slate-200/60 rounded-md w-32" />
          </div>
          <div className="h-10 bg-slate-200/60 rounded-xl w-28" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Balance Card Skeleton */}
          <div className="md:col-span-2 animate-pulse bg-white rounded-2xl p-8 border-none h-[220px]">
            <div className="space-y-6">
              <div className="h-5 bg-slate-100 rounded w-28" />
              <div className="h-12 bg-slate-100 rounded w-48" />
              <div className="pt-6 border-t border-slate-50 flex justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-24" />
                  <div className="h-6 bg-slate-100 rounded w-20" />
                </div>
                <div className="w-12 h-12 bg-slate-100 rounded-xl" />
              </div>
            </div>
          </div>

          {/* Status Badge Skeleton */}
          <div className="col-span-1 animate-pulse bg-white rounded-2xl p-6 border-none h-[220px] flex flex-col justify-center">
            <div className="h-5 bg-slate-100 rounded w-20 mb-4" />
            <div className="h-10 bg-slate-100 rounded-xl w-32" />
          </div>

          {/* Referral Tool Skeleton */}
          <div className="md:col-span-3 lg:col-span-3 animate-pulse bg-white rounded-2xl p-6 h-[180px]">
            <div className="h-5 bg-slate-100 rounded w-40 mb-5" />
            <div className="h-14 bg-slate-50 rounded-xl mb-4" />
          </div>

          {/* Nav Tabs Skeleton */}
          <div className="md:col-span-3">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`animate-pulse bg-white rounded-2xl p-4 h-28 flex flex-col items-center justify-center gap-3 ${i === 4 ? 'col-span-2 md:col-span-1' : ''}`}>
                  <div className="w-12 h-12 bg-slate-50 rounded-full" />
                  <div className="h-4 bg-slate-100 rounded w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
