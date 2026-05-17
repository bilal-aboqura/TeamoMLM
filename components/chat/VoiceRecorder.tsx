"use client";
// Client boundary: records microphone audio and sends it as a chat attachment.

import { useState, useTransition } from "react";
import { Mic, Send, Trash2 } from "lucide-react";
import { createVoiceUploadUrl } from "@/app/dashboard/chat/_actions/createVoiceUploadUrl";
import { sendMessage } from "@/app/dashboard/chat/_actions/sendMessage";
import { createClient } from "@/lib/supabase/client";
import { useVoiceRecorder } from "@/lib/chat/useVoiceRecorder";
import { AudioPlayer } from "./AudioPlayer";

type Props = {
  roomId: string;
  parentMessageId?: string | null;
  onSent?: () => void;
  onError?: (message: string) => void;
};

function extensionForMime(mime: string) {
  return mime.includes("mp4") ? "m4a" : "webm";
}

export function VoiceRecorder({ roomId, parentMessageId, onSent, onError }: Props) {
  const recorder = useVoiceRecorder();
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);

  function handleSend() {
    const audioBlob = recorder.audioBlob;
    if (!audioBlob) return;
    setUploading(true);
    startTransition(async () => {
      const supabase = createClient();
      const ext = extensionForMime(recorder.mimeType);
      const uploadUrl = await createVoiceUploadUrl({ roomId, mimeType: recorder.mimeType });
      if (!uploadUrl.success) {
        setUploading(false);
        onError?.(
          uploadUrl.error === "CANNOT_SEND_MESSAGES"
            ? "تم تقييدك من إرسال الرسائل في هذه المحادثة."
            : "تعذر تجهيز رفع التسجيل الصوتي."
        );
        return;
      }
      const { error: uploadError } = await supabase.storage
        .from("secure-chat-media")
        .uploadToSignedUrl(uploadUrl.path, uploadUrl.token, audioBlob, { contentType: recorder.mimeType });

      if (uploadError) {
        setUploading(false);
        onError?.("تعذر رفع التسجيل الصوتي.");
        return;
      }

      const result = await sendMessage({
        roomId,
        content: undefined,
        parentMessageId: parentMessageId ?? undefined,
        attachment: {
          path: uploadUrl.path,
          name: `voice.${ext}`,
          size: audioBlob.size,
          mimeType: recorder.mimeType,
          metadata: {
            waveform: recorder.waveform,
            duration_seconds: recorder.durationSeconds,
          },
        },
      });

      setUploading(false);
      if (!result.success) {
        onError?.(
          result.error === "CANNOT_SEND_MESSAGES"
            ? "تم تقييدك من إرسال الرسائل في هذه المحادثة."
            : "تعذر إرسال التسجيل الصوتي."
        );
        return;
      }
      recorder.markSent();
      onSent?.();
    });
  }

  if (recorder.state === "recording") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-rose-100 bg-rose-50 px-2 py-1">
        <span className="h-2 w-2 animate-pulse rounded-full bg-rose-600" />
        <span className="text-xs font-bold text-rose-700">جار التسجيل</span>
        <button
          type="button"
          onClick={recorder.stopRecording}
          className="h-8 rounded-lg bg-rose-600 px-3 text-xs font-bold text-white"
          aria-label="إيقاف التسجيل"
        >
          إيقاف
        </button>
      </div>
    );
  }

  if (recorder.state === "preview" && recorder.audioBlob) {
    const src = URL.createObjectURL(recorder.audioBlob);
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-2">
        <AudioPlayer src={src} durationSeconds={recorder.durationSeconds} waveform={recorder.waveform} />
        <button
          type="button"
          onClick={handleSend}
          disabled={uploading || isPending}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white disabled:opacity-50"
          aria-label="إرسال التسجيل"
        >
          <Send className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={recorder.discard}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-rose-600"
          aria-label="حذف التسجيل"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        recorder.startRecording().catch(() => onError?.("تعذر الوصول إلى الميكروفون."));
      }}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-700"
      aria-label="تسجيل رسالة صوتية"
      title="تسجيل رسالة صوتية"
    >
      <Mic className="h-4 w-4" />
    </button>
  );
}
