"use client";

import { useState, useCallback } from "react";
import { Share2, Check } from "lucide-react";

export function InviteLinkCard({
  referralCode,
  baseUrl,
}: {
  referralCode: string;
  baseUrl: string;
}) {
  const [copied, setCopied] = useState(false);
  const fullUrl = `${baseUrl}?ref=${referralCode}`;

  const handleCopy = useCallback(async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullUrl);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = fullUrl;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [fullUrl]);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-t-2xl p-4 flex items-center gap-3">
        <Share2 className="h-5 w-5 text-white" strokeWidth={2} />
        <h3 className="text-white font-bold">رابط الدعوة الخاص بك</h3>
      </div>

      <div className="bg-slate-50 rounded-b-2xl p-4 border border-slate-100">
        <p className="font-mono text-sm text-slate-700 break-all text-start">
          {fullUrl}
        </p>
      </div>

      <div className="p-4">
        <button
          onClick={handleCopy}
          aria-label={copied ? "تم نسخ الرابط" : "نسخ الرابط"}
          className="w-full bg-emerald-600 text-white rounded-xl py-3 font-bold shadow-[0_4px_14px_0_rgba(5,150,105,0.39)] hover:bg-emerald-700 active:scale-95 transition-all duration-200"
        >
          {copied ? "تم نسخ الرابط!" : "نسخ الرابط"}
        </button>
      </div>

      {copied && (
        // left-1/2 + -translate-x-1/2 = physically centered, correct on both LTR and RTL.
        // Do NOT use start-1/2 here — it mis-centers in RTL when combined with a physical transform.
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald-600 text-white rounded-xl px-6 py-3 shadow-[0_4px_14px_0_rgba(5,150,105,0.39)] transition-all duration-300 z-50 whitespace-nowrap flex items-center gap-2">
          <Check className="w-5 h-5" strokeWidth={2} /> تم نسخ الرابط!
        </div>
      )}
    </div>
  );
}
