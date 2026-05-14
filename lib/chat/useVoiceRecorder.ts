"use client";
// Client boundary: wraps browser microphone, MediaRecorder, and waveform sampling APIs.

import { useCallback, useEffect, useRef, useState } from "react";

type RecorderState = "idle" | "recording" | "preview" | "sent" | "discarded";

export function useVoiceRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [mimeType, setMimeType] = useState("audio/webm;codecs=opus");
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [waveform, setWaveform] = useState<number[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const analyserCleanupRef = useRef<(() => void) | null>(null);

  const cleanupStream = useCallback(() => {
    analyserCleanupRef.current?.();
    analyserCleanupRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }, []);

  const startRecording = useCallback(async () => {
    if (state === "recording") return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    chunksRef.current = [];
    setWaveform([]);
    setAudioBlob(null);
    setDurationSeconds(0);

    const detectedMime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/mp4";
    setMimeType(detectedMime);

    const recorder = new MediaRecorder(stream, { mimeType: detectedMime });
    recorderRef.current = recorder;
    startedAtRef.current = Date.now();

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: detectedMime });
      setAudioBlob(blob);
      setDurationSeconds(Math.min(120, Math.ceil((Date.now() - startedAtRef.current) / 1000)));
      setState("preview");
      cleanupStream();
    };

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    const data = new Uint8Array(analyser.frequencyBinCount);
    source.connect(analyser);
    const sample = window.setInterval(() => {
      analyser.getByteTimeDomainData(data);
      const peak = data.reduce((max, value) => Math.max(max, Math.abs(value - 128)), 0);
      setWaveform((current) => [...current.slice(-79), Math.min(1, peak / 128)]);
    }, 100);
    analyserCleanupRef.current = () => {
      window.clearInterval(sample);
      void audioContext.close();
    };

    recorder.start();
    setState("recording");
    timerRef.current = window.setTimeout(() => stopRecording(), 120_000);
  }, [cleanupStream, state, stopRecording]);

  const discard = useCallback(() => {
    cleanupStream();
    setAudioBlob(null);
    setWaveform([]);
    setDurationSeconds(0);
    setState("discarded");
    window.setTimeout(() => setState("idle"), 0);
  }, [cleanupStream]);

  const markSent = useCallback(() => {
    setState("sent");
    window.setTimeout(() => {
      setAudioBlob(null);
      setWaveform([]);
      setDurationSeconds(0);
      setState("idle");
    }, 0);
  }, []);

  useEffect(() => cleanupStream, [cleanupStream]);

  return {
    state,
    startRecording,
    stopRecording,
    discard,
    markSent,
    audioBlob,
    mimeType,
    durationSeconds,
    waveform,
  };
}
