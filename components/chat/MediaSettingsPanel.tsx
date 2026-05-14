"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Image, Mic } from "lucide-react";
import { updateMediaSettings } from "@/app/admin/chat/_actions/updateMediaSettings";
import { createClient } from "@/lib/supabase/client";
import type { MediaSettings } from "@/lib/chat/types";

type Props = {
  roomId: string;
  initialSettings: MediaSettings;
};

const OPTIONS: Array<{
  key: keyof MediaSettings;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
}> = [
  { key: "images_allowed", label: "الصور", icon: <Image className="h-4 w-4" /> },
  { key: "files_allowed", label: "الملفات", icon: <FileText className="h-4 w-4" /> },
  { key: "audio_allowed", label: "الصوت", icon: <Mic className="h-4 w-4" />, disabled: true },
];

export function MediaSettingsPanel({ roomId, initialSettings }: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const [pendingKey, setPendingKey] = useState<keyof MediaSettings | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const channel = supabase
      .channel(`room-settings-panel:${roomId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_rooms", filter: `id=eq.${roomId}` },
        (payload) => {
          if (payload.new.media_settings) setSettings(payload.new.media_settings as MediaSettings);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId, supabase]);

  async function toggle(key: keyof MediaSettings) {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    setPendingKey(key);
    const result = await updateMediaSettings({ roomId, settings: next });
    setPendingKey(null);
    if (!result.success) setSettings(settings);
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-100 bg-white p-4">
      {OPTIONS.map((option) => (
        <div key={option.key} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
              {option.icon}
            </span>
            {option.label}
          </div>
          <button
            type="button"
            onClick={() => toggle(option.key)}
            disabled={option.disabled || pendingKey !== null}
            className={`relative h-7 w-12 rounded-full transition ${
              settings[option.key] ? "bg-emerald-500" : "bg-slate-200"
            } disabled:cursor-not-allowed disabled:opacity-50`}
            aria-label={option.label}
            title={option.label}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                settings[option.key] ? "start-6" : "start-1"
              }`}
            />
          </button>
        </div>
      ))}
    </div>
  );
}
