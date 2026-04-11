// use client — clipboard API requires browser environment
"use client";

import { useState, useCallback } from "react";

export function ReferralTool({ referralCode }: { referralCode: string }) {
  const [copied, setCopied] = useState(false);
  const fullUrl = `https://teamoads.com.com/register?ref=${referralCode}`;

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
    <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] relative overflow-hidden">
      <div className="absolute -bottom-6 -start-6 w-32 h-32 bg-indigo-50 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <p className="text-slate-500 font-medium text-sm mb-4">رابط الإحالة الخاص بك</p>

        <div className={`flex items-center rounded-xl border p-1 transition-all duration-300 ${copied ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 bg-slate-50'}`}>
          <div className="flex-1 overflow-hidden px-4">
            <code className={`font-mono text-sm tracking-wide truncate block dir-ltr text-start transition-colors duration-300 ${copied ? 'text-emerald-700' : 'text-slate-600'}`}>
              {fullUrl}
            </code>
          </div>
          <button
            onClick={handleCopy}
            aria-label={copied ? "تم النسخ" : "نسخ رابط الإحالة"}
            className={`flex-shrink-0 px-6 py-3 rounded-lg font-bold text-sm transition-all duration-300 active:scale-95 ${
              copied 
                ? "bg-emerald-500 text-white shadow-[0_4px_14px_0_rgba(5,150,105,0.39)]" 
                : "bg-slate-900 text-white shadow-md hover:bg-slate-800"
            }`}
          >
            {copied ? "تم النسخ!" : "نسخ"}
          </button>
        </div>

        <noscript>
          <label
            htmlFor="referral-copy"
            className="block text-sm text-slate-500 mt-4 mb-1"
          >
            انسخ الرابط يدوياً
          </label>
          <input
            id="referral-copy"
            readOnly
            value={fullUrl}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 font-mono text-center select-all dir-ltr"
          />
        </noscript>
      </div>
    </div>
  );
}
