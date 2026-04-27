export default function AppProfitsLoading() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6" dir="rtl">
      <div className="h-28 animate-pulse rounded-2xl bg-slate-100" />
      {[1, 2, 3].map((item) => (
        <div key={item} className="h-36 animate-pulse rounded-2xl bg-slate-100" />
      ))}
    </main>
  );
}
