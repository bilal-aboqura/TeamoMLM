"use client";
// Client boundary: custom controls around the browser audio element.

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

type Props = {
  src: string;
  durationSeconds: number;
  waveform?: number[];
};

function formatTime(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function AudioPlayer({ src, durationSeconds, waveform }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setElapsed(audio.currentTime);
    const onEnd = () => setPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnd);
    };
  }, []);

  async function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    await audio.play();
    setPlaying(true);
  }

  const total = durationSeconds || audioRef.current?.duration || 0;
  const progress = total ? Math.min(1, elapsed / total) : 0;

  return (
    <div className="flex min-w-[220px] items-center gap-3 rounded-lg bg-white/80 px-3 py-2 text-slate-700" dir="rtl">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        type="button"
        onClick={toggle}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white"
        aria-label={playing ? "إيقاف الصوت" : "تشغيل الصوت"}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex h-8 items-end gap-0.5">
          {(waveform?.length ? waveform : Array.from({ length: 28 }, () => 0.25)).map((value, index) => (
            <span
              key={index}
              className={`w-1 rounded-full ${index / (waveform?.length || 28) <= progress ? "bg-emerald-500" : "bg-slate-300"}`}
              style={{ height: `${Math.max(6, value * 28)}px` }}
            />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[11px] font-bold text-slate-500" dir="ltr">
          <span>{formatTime(elapsed)}</span>
          <span>{formatTime(total)}</span>
        </div>
      </div>
    </div>
  );
}
