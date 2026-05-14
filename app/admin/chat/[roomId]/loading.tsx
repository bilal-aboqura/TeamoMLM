export default function AdminChatRoomLoading() {
  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]" dir="rtl">
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-16 animate-pulse rounded-lg bg-white" />
        ))}
      </div>
      <div className="h-[620px] animate-pulse rounded-lg bg-white" />
    </div>
  );
}
