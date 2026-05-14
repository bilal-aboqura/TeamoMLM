export default function AdminChatBlacklistLoading() {
  return (
    <div className="space-y-4" dir="rtl">
      <div className="h-8 w-64 rounded-lg bg-slate-100" />
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_110px]">
          <div className="h-10 rounded-lg bg-slate-100" />
          <div className="h-10 rounded-lg bg-slate-100" />
          <div className="h-10 rounded-lg bg-slate-100" />
        </div>
      </div>
      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-10 rounded-lg bg-slate-100" />
        ))}
      </div>
    </div>
  );
}
