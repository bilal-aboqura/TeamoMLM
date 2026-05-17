"use client";

import { FormEvent, useRef, useState } from "react";
import { Send } from "lucide-react";
import { sendMessage } from "@/app/dashboard/chat/_actions/sendMessage";
import type { MediaSettings, MessagePayload } from "@/lib/chat/types";
import { AttachmentPicker } from "./AttachmentPicker";
import { VoiceRecorder } from "./VoiceRecorder";

type Props = {
  roomId: string;
  mediaSettings: MediaSettings;
  parentMessageId?: string | null;
  onOptimisticMessage?: (message: MessagePayload) => void;
  onMessageSent?: (optimisticId: string) => void;
  onMessageFailed?: (optimisticId: string) => void;
};

export function MessageInput({
  roomId,
  mediaSettings,
  parentMessageId,
  onOptimisticMessage,
  onMessageSent,
  onMessageFailed,
}: Props) {
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sendingRef = useRef(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sendingRef.current) return;
    if (!content.trim() && !file) return;

    sendingRef.current = true;
    setPending(true);
    setError(null);
    const optimisticId = `optimistic-${crypto.randomUUID()}`;
    onOptimisticMessage?.({
      id: optimisticId,
      content: content.trim() || null,
      senderLabel: "أنت",
      senderRole: "member",
      isOwn: true,
      serverTimestamp: new Date().toISOString(),
      isDeleted: false,
      attachment: file
        ? { name: file.name, size: file.size, mimeType: file.type, signedUrl: null }
        : null,
      parentMessageId: parentMessageId ?? null,
      deliveryStatus: "sent",
      isForwarded: false,
      forwardedQuoteSnapshot: null,
      replyPreview: null,
    });

    const form = new FormData();
    form.set("roomId", roomId);
    form.set("content", content.trim());
    if (parentMessageId) form.set("parentMessageId", parentMessageId);
    if (file) form.set("attachment", file);

    const result = await sendMessage(form).catch(() => null);
    sendingRef.current = false;
    setPending(false);
    if (!result) {
      onMessageFailed?.(optimisticId);
      setError("فشل إرسال الرسالة. حاول مرة أخرى.");
      return;
    }
    if (!result.success) {
      onMessageFailed?.(optimisticId);
      if (result.error === "CONTENT_POLICY_VIOLATION") {
        setError("تم رفض رسالتك بسبب انتهاك سياسة المحتوى.");
      } else if (result.error === "CANNOT_SEND_MESSAGES") {
        setError("تم تقييدك من إرسال الرسائل في هذه المحادثة.");
      } else {
        setError("فشل إرسال الرسالة. حاول مرة أخرى.");
      }
      return;
    }
    setContent("");
    setFile(null);
    onMessageSent?.(optimisticId);
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-slate-100 bg-white p-3">
      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value.slice(0, 4000))}
          rows={2}
          maxLength={4000}
          placeholder="اكتب رسالة..."
          className="w-full resize-none bg-transparent px-2 py-1 text-sm text-slate-800 outline-none"
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <AttachmentPicker
            mediaSettings={mediaSettings}
            selectedFile={file}
            onSelect={(nextFile, nextError) => {
              setFile(nextFile);
              setError(nextError ?? null);
            }}
          />
          <div className="flex items-center justify-end gap-2">
            {mediaSettings.audio_allowed && (
              <VoiceRecorder
                roomId={roomId}
                parentMessageId={parentMessageId}
                onSent={() => onMessageSent?.("")}
                onError={setError}
              />
            )}
            {content.length > 3500 && (
              <span className="text-xs font-medium text-amber-600" dir="ltr">
                {content.length}/4000
              </span>
            )}
            <button
              type="submit"
              disabled={pending || (!content.trim() && !file)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:opacity-50"
              aria-label="إرسال"
              title="إرسال"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
        {error && <p className="px-2 text-xs font-medium text-rose-600">{error}</p>}
      </div>
    </form>
  );
}
