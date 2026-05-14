"use client";
// Client boundary: Next.js error boundary component for this route segment.

export default function AdminChatBlacklistError() {
  return (
    <div className="rounded-lg border border-rose-100 bg-rose-50 p-5 text-sm font-bold text-rose-700" dir="rtl">
      تعذر تحميل قائمة الكلمات المحظورة.
    </div>
  );
}
