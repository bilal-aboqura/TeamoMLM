export function StatsCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-slate-100 animate-pulse" />
        <div className="w-8 h-4 rounded-full bg-slate-100 animate-pulse" />
      </div>
      <div>
        <div className="h-4 w-24 bg-slate-100 animate-pulse rounded-md mb-2" />
        <div className="h-8 w-32 bg-slate-200/60 animate-pulse rounded-lg" />
      </div>
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
      {/* Table Header Placeholder */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-50/80 border-b border-slate-100">
        <div className="flex items-center gap-4 w-full">
          <div className="h-4 w-1/6 bg-slate-200/50 animate-pulse rounded-md" />
          <div className="h-4 w-1/4 bg-slate-200/50 animate-pulse rounded-md" />
          <div className="h-4 w-1/5 bg-slate-200/50 animate-pulse rounded-md" />
          <div className="h-4 w-1/12 bg-slate-200/50 animate-pulse rounded-md ml-auto" />
        </div>
      </div>
      {/* Table Rows */}
      <div className="divide-y divide-slate-50">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center justify-between px-6 py-5">
            <div className="flex items-center gap-4 w-full">
              <div className="h-4 w-1/5 bg-slate-100 animate-pulse rounded-md" />
              <div className="h-4 w-1/3 bg-slate-100 animate-pulse rounded-md" />
              <div className="h-6 w-16 bg-slate-100 animate-pulse rounded-full" />
              <div className="h-8 w-8 bg-slate-100 animate-pulse rounded-lg ml-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] p-6 md:p-8 space-y-8">
      {/* Section 1 */}
      <div>
         <div className="h-6 w-48 bg-slate-200/60 animate-pulse rounded-md mb-2" />
         <div className="h-4 w-64 bg-slate-100 animate-pulse rounded-md mb-6" />
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-2">
             <div className="h-4 w-24 bg-slate-100 animate-pulse rounded-md" />
             <div className="h-12 w-full bg-slate-50 border border-slate-100 animate-pulse rounded-xl" />
           </div>
           <div className="space-y-2">
             <div className="h-4 w-32 bg-slate-100 animate-pulse rounded-md" />
             <div className="h-12 w-full bg-slate-50 border border-slate-100 animate-pulse rounded-xl" />
           </div>
         </div>
      </div>
      {/* Divider */}
      <div className="h-px w-full bg-slate-50" />
      {/* Section 2 */}
      <div>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="space-y-2">
             <div className="h-4 w-20 bg-slate-100 animate-pulse rounded-md" />
             <div className="h-12 w-full bg-slate-50 border border-slate-100 animate-pulse rounded-xl" />
           </div>
           <div className="space-y-2">
             <div className="h-4 w-24 bg-slate-100 animate-pulse rounded-md" />
             <div className="h-12 w-full bg-slate-50 border border-slate-100 animate-pulse rounded-xl" />
           </div>
         </div>
      </div>
    </div>
  );
}
