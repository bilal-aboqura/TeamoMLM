import { StatsCardSkeleton } from "./_components/Skeletons";

export default function AdminLoading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Placeholder */}
      <div className="flex items-center justify-between mb-8">
        <div>
           <div className="h-8 w-48 bg-slate-200/80 animate-pulse rounded-lg mb-2" />
           <div className="h-4 w-64 bg-slate-100 animate-pulse rounded-md" />
        </div>
      </div>

      {/* Stats Grid Placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </div>

      {/* Main Content Area Placeholder (e.g., Table or Chart) */}
      <div className="mt-8">
        <div className="bg-white rounded-2xl border border-slate-100 p-6 h-[400px] flex flex-col items-center justify-center gap-4">
            <div className="w-10 h-10 border-4 border-slate-100 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-sm font-medium text-slate-400 animate-pulse">جاري تحميل البيانات...</p>
        </div>
      </div>
    </div>
  );
}
