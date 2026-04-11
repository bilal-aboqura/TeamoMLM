export default function TasksLoading() {
  return (
    <div dir="rtl" className="max-w-md mx-auto px-4 py-6 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 bg-slate-200/50 rounded-lg w-40"></div>
        <div className="h-8 bg-slate-200/50 rounded-full w-24"></div>
      </div>
      
      <div className="space-y-3">
         {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 space-y-2">
                   <div className="h-5 bg-slate-200/50 rounded-full w-16"></div>
                   <div className="h-4 bg-slate-200/50 rounded w-3/4"></div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                   <div className="h-5 bg-slate-200/50 rounded w-12"></div>
                   <div className="h-8 bg-slate-200/50 rounded-xl w-16"></div>
                </div>
              </div>
            </div>
         ))}
      </div>
    </div>
  );
}
