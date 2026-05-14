"use client";

import { FileUp, ImageUp, X } from "lucide-react";
import type { MediaSettings } from "@/lib/chat/types";
import { MAX_FILE_SIZE_BYTES, MAX_IMAGE_SIZE_BYTES } from "@/lib/chat/allowlist";

type Props = {
  mediaSettings: MediaSettings;
  selectedFile: File | null;
  onSelect: (file: File | null, error?: string) => void;
};

export function AttachmentPicker({ mediaSettings, selectedFile, onSelect }: Props) {
  function handleFile(file: File | undefined, kind: "image" | "file") {
    if (!file) return;
    const max = kind === "image" ? MAX_IMAGE_SIZE_BYTES : MAX_FILE_SIZE_BYTES;
    if (file.size > max) {
      onSelect(null, "حجم الملف أكبر من الحد المسموح");
      return;
    }
    onSelect(file);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {mediaSettings.images_allowed && (
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700">
          <ImageUp className="h-4 w-4" />
          صورة
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="sr-only"
            onChange={(event) => handleFile(event.target.files?.[0], "image")}
          />
        </label>
      )}
      {mediaSettings.files_allowed && (
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-emerald-200 hover:text-emerald-700">
          <FileUp className="h-4 w-4" />
          ملف
          <input
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip"
            className="sr-only"
            onChange={(event) => handleFile(event.target.files?.[0], "file")}
          />
        </label>
      )}
      {!mediaSettings.images_allowed && !mediaSettings.files_allowed && (
        <span
          title="رفع الوسائط معطل في هذه المجموعة"
          className="text-xs font-medium text-slate-400"
        >
          رفع الوسائط معطل
        </span>
      )}
      {selectedFile && (
        <span className="inline-flex max-w-full items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
          <span className="truncate">{selectedFile.name}</span>
          <button type="button" onClick={() => onSelect(null)} aria-label="إزالة الملف">
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      )}
    </div>
  );
}
