"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function UserSearchForm({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      router.push(`/admin/users?search=${encodeURIComponent(value.trim())}&page=0`);
    } else {
      router.push("/admin/users");
    }
  };

  const handleClear = () => {
    setValue("");
    router.push("/admin/users");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <div className="relative flex-1">
        {/* Search icon */}
        <span className="absolute inset-y-0 start-4 flex items-center pointer-events-none text-slate-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="بحث بالاسم أو رقم الهاتف..."
          className="w-full border border-slate-200 rounded-xl ps-10 pe-10 py-2.5 text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
        />
        {/* Clear button */}
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 end-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="مسح البحث"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <button
        type="submit"
        className="bg-slate-900 text-white rounded-xl px-5 py-2.5 text-sm font-semibold hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        بحث
      </button>
    </form>
  );
}
