export default function ChatRoomLoading() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6" dir="rtl">
      <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-lg bg-white" />
          ))}
        </div>
        <div className="h-[620px] animate-pulse rounded-lg bg-white" />
      </div>
    </div>
  );
}
