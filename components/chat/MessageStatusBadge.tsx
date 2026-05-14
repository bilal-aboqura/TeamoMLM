import { Check, CheckCheck } from "lucide-react";
import type { DeliveryStatus } from "@/lib/chat/types";

type Props = {
  status: DeliveryStatus;
  isDM: boolean;
};

export function MessageStatusBadge({ status, isDM }: Props) {
  if (!isDM) return null;
  if (status === "sent") {
    return (
      <span className="inline-flex items-center text-slate-300" title="مرسلة">
        <Check className="h-3.5 w-3.5" />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center ${status === "read" ? "text-emerald-300" : "text-slate-300"}`}
      title={status === "read" ? "مقروءة" : "تم التسليم"}
    >
      <CheckCheck className="h-3.5 w-3.5" />
    </span>
  );
}
