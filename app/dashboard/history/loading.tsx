export default function HistoryLoading() {
  return (
    <div dir="rtl" className="max-w-md mx-auto px-4 py-6 animate-pulse">
      <div className="h-8 bg-slate-200/50 rounded-lg w-32 mb-6"></div>

      {/* Tabs Skeleton */}
      <div className="bg-slate-100 rounded-xl p-1 flex gap-1 mb-4">
        <div className="flex-1 py-5 rounded-lg bg-white shadow-sm"></div>
        <div className="flex-1 py-5 rounded-lg bg-transparent"></div>
      </div>

      {/* List Skeleton */}
      <div className="space-y-3">
         {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-start gap-4">
               <div className="p-5 rounded-xl bg-slate-200/50 shrink-0"></div>
               <div className="flex-1 w-full space-y-3 mt-1">
                  <div className="flex items-center justify-between">
                     <div className="h-5 bg-slate-200/50 rounded w-1/2"></div>
                     <div className="h-4 bg-slate-200/50 rounded-full w-16"></div>
                  </div>
                  <div className="flex items-center justify-between">
                     <div className="h-4 bg-slate-200/50 rounded w-16"></div>
                     <div className="h-3 bg-slate-200/50 rounded w-20"></div>
                  </div>
               </div>
            </div>
         ))}
      </div>
    </div>
  );
}
