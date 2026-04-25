export default function InvestmentLoading() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 lg:py-12" dir="rtl">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
        <div className="h-48 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    </div>
  );
}
