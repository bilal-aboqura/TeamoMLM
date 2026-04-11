import { TableSkeleton } from "../_components/Skeletons";

export default function WithdrawalsLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-48 bg-slate-200/80 animate-pulse rounded-lg mb-2" />
          <div className="h-4 w-64 bg-slate-100 animate-pulse rounded-md" />
        </div>
      </div>
      <TableSkeleton />
    </div>
  );
}
