"use client";

import { useEffect } from "react";
import Image from "next/image";
import { X } from "lucide-react";

export function ReceiptLightbox({
  imageUrl,
  title,
  onClose,
}: {
  imageUrl: string | null;
  title: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="عرض إيصال الإيداع"
    >
      <div className="relative h-[82vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-slate-900">
        <Image src={imageUrl} alt={title} fill className="object-contain" unoptimized />
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
          className="absolute end-4 top-4 rounded-xl bg-white/10 p-2 text-white backdrop-blur transition-colors hover:bg-white/20"
        >
          <X className="h-5 w-5" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
