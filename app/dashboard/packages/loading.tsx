export default function PackagesLoading() {
  return (
    <div dir="rtl" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 lg:py-24 animate-pulse">
      <div className="text-center max-w-3xl mx-auto mb-16 flex flex-col items-center">
        <div className="h-12 bg-slate-200/50 rounded-lg w-64 mb-6"></div>
        <div className="h-6 bg-slate-200/50 rounded-lg w-full max-w-lg"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 xl:gap-10">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col h-[600px]">
             {/* Header */}
             <div className="p-6 md:p-8 pb-6 border-b border-slate-100/80 bg-slate-50/50 flex flex-col items-center">
                <div className="h-8 bg-slate-200/50 rounded-lg w-32 mb-4"></div>
                <div className="h-10 bg-slate-200/50 rounded-lg w-24"></div>
             </div>

             {/* Body */}
             <div className="p-6 md:p-8 flex-1 flex flex-col">
               <div className="space-y-6 mb-8 flex-1">
                 {[1, 2, 3].map((j) => (
                   <div key={j} className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                       <div className="w-9 h-9 bg-slate-200/50 rounded-lg"></div>
                       <div className="h-4 bg-slate-200/50 rounded w-24"></div>
                     </div>
                     <div className="h-4 bg-slate-200/50 rounded w-16"></div>
                   </div>
                 ))}
               </div>

               <div className="h-10 bg-slate-200/50 rounded-xl w-full mb-6 relative overflow-hidden"></div>
               <div className="h-12 bg-slate-200/50 rounded-xl w-full mt-auto"></div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
