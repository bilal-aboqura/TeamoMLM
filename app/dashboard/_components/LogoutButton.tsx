// use client — onClick handler requires browser event system
"use client";

import { useState } from "react";
import { logoutUser } from "@/app/(auth)/actions";

export function LogoutButton() {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    await logoutUser();
    window.location.href = "/login";
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      aria-label="تسجيل الخروج"
      className="bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl px-4 py-2 text-sm font-medium transition-all active:scale-95 disabled:opacity-50"
    >
      {loading ? "جاري الخروج..." : "تسجيل الخروج"}
    </button>
  );
}
