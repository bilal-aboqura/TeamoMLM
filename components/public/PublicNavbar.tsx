"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

const SCROLL_THRESHOLD = 64; // px before glassmorphic effect activates

export default function PublicNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > SCROLL_THRESHOLD);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Check on mount
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      aria-label="التنقل الرئيسي"
      className={`fixed top-0 start-0 end-0 z-50 transition-all duration-300 ease-out will-change-auto ${
        isScrolled
          ? "bg-white/80 backdrop-blur-md border-b border-slate-200/50 py-4 shadow-sm"
          : "bg-transparent py-6"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo at Start (Right side in RTL) */}
        <Link
          href="/"
          className="flex items-center transition-all duration-300 hover:opacity-90"
        >
          <Image
            src="/logo.jpeg"
            alt="Teamo Logo"
            width={120}
            height={48}
            className="h-10 w-auto md:h-12 object-contain"
            priority
          />
        </Link>

        {/* Auth CTAs at End (Left side in RTL) */}
        <div className="flex items-center gap-3 md:gap-4">
          <Link
            href="/login"
            className={`text-sm md:text-base font-medium transition-all duration-300 hover:opacity-80 ${
              isScrolled ? "text-slate-700" : "text-white/90"
            }`}
          >
            تسجيل الدخول
          </Link>
          <Link
            href="/register"
            className="bg-emerald-600 text-white text-sm md:text-base font-medium py-2 md:py-2.5 px-4 md:px-5 rounded-xl hover:bg-emerald-500 transition-all active:scale-95 shadow-[0_4px_14px_0_rgba(5,150,105,0.39)]"
          >
            حساب جديد
          </Link>
        </div>
      </div>
    </nav>
  );
}
