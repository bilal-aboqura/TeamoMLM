export default function AppProfitHistoryLoading() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6" dir="rtl">
      {[1, 2, 3].map((item) => (
        <div key={item} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
      ))}
    </main>
  );
}
