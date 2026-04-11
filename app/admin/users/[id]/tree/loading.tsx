export default function TreeLoading() {
  return (
    <div className="space-y-3">
      <div className="animate-pulse bg-slate-100 h-14 rounded-xl w-64" />
      <div className="ps-6 space-y-3 border-e-2 border-slate-100 pe-6">
        <div className="animate-pulse bg-slate-100 h-14 rounded-xl w-56" />
        <div className="ps-6 space-y-3 border-e-2 border-slate-100 pe-6">
          <div className="animate-pulse bg-slate-100 h-14 rounded-xl w-48" />
        </div>
      </div>
    </div>
  );
}
