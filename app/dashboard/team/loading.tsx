export default function TeamLoading() {
  return (
    <div dir="rtl" className="max-w-md mx-auto p-6 space-y-6 animate-pulse">
      <div className="h-8 bg-slate-200/50 rounded-lg w-32"></div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
         {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
               <div className="w-8 h-8 rounded-lg bg-slate-200/50 mb-3"></div>
               <div className="h-4 bg-slate-200/50 rounded w-16 mb-2"></div>
               <div className="h-6 bg-slate-200/50 rounded w-20"></div>
            </div>
         ))}
      </div>

      {/* Invite Link Skeleton */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
         <div className="h-14 bg-slate-200/50 flex items-center px-4">
            <div className="h-4 bg-white/20 rounded w-32"></div>
         </div>
         <div className="h-16 bg-slate-50 border-b border-slate-100 px-4 py-3">
            <div className="h-4 bg-slate-200/50 rounded w-full mt-2"></div>
         </div>
         <div className="p-4">
            <div className="h-12 bg-slate-200/50 rounded-xl w-full"></div>
         </div>
      </div>

      {/* Tree Skeleton */}
      <div className="space-y-2">
         <div className="h-14 bg-slate-200/50 rounded-2xl"></div>
         {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-white border border-slate-100 shadow-sm rounded-xl" style={{ marginInlineStart: `${(i-1)*1.5}rem` }}></div>
         ))}
      </div>
    </div>
  );
}
