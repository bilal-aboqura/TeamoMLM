import { X } from "lucide-react";

export type QuotedMessage = {
  id: string;
  senderLabel: string;
  contentExcerpt: string;
  isDeleted: boolean;
};

type Props = {
  parentMessage: QuotedMessage | null;
  onCancel: () => void;
};

export function ReplyPreview({ parentMessage, onCancel }: Props) {
  if (!parentMessage) return null;

  return (
    <div className="border-t border-slate-100 bg-slate-50 px-3 py-2" dir="rtl">
      <div className="flex items-start gap-2 rounded-lg border-s-4 border-emerald-500 bg-white px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-emerald-700">{parentMessage.senderLabel}</p>
          <p className="truncate text-sm text-slate-600">
            {parentMessage.isDeleted ? "الرسالة الأصلية محذوفة" : parentMessage.contentExcerpt}
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
          aria-label="إلغاء الرد"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
