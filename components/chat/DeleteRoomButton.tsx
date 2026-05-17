"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteRoom } from "@/app/admin/chat/_actions/deleteRoom";

type Props = {
  roomId: string;
};

export function DeleteRoomButton({ roomId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    const confirmed = window.confirm("هل تريد حذف هذه المحادثة من قوائم الجميع؟");
    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteRoom({ roomId });
      if (!result.success) {
        window.alert("تعذر حذف المحادثة.");
        return;
      }
      router.replace("/admin/chat");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
    >
      <Trash2 className="h-4 w-4" />
      {isPending ? "جار الحذف..." : "حذف المحادثة"}
    </button>
  );
}
