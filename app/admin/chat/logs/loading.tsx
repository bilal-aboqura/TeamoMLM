export default function AdminChatLogsLoading() {
  return (
    <div className="space-y-4" dir="rtl">
      <div className="h-8 w-48 rounded-lg bg-slate-100" />
      <div className="h-16 rounded-lg border border-slate-200 bg-white" />
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-20 rounded-lg border border-slate-200 bg-white" />
      ))}
    </div>
  );
}
