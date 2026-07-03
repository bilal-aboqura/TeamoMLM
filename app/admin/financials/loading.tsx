import { StatsCardSkeleton, TableSkeleton } from "../_components/Skeletons";

export default function FinancialsLoading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <div className="h-8 w-48 bg-slate-200/80 animate-pulse rounded-lg mb-2" />
        <div className="h-4 w-64 bg-slate-100 animate-pulse rounded-md" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </div>
      <TableSkeleton />
    </div>
  );
}
