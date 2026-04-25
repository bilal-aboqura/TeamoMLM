"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Download, CheckSquare, Banknote, Users, Coins, Trophy, Settings, Menu, X, LogOut } from "lucide-react";
import { logoutUser } from "@/app/(auth)/actions";

const navLinks = [
  {
    href: "/admin/overview",
    label: "النظرة العامة",
    icon: <LayoutDashboard className="w-5 h-5" strokeWidth={2} />,
  },
  {
    href: "/admin/deposits",
    label: "الإيداعات المعلقة",
    icon: <Download className="w-5 h-5" strokeWidth={2} />,
  },
  {
    href: "/admin/equity-requests",
    label: "طلبات حصص الأرباح",
    icon: <Coins className="w-5 h-5" strokeWidth={2} />,
  },
  {
    href: "/admin/tasks",
    label: "إدارة المهام",
    icon: <CheckSquare className="w-5 h-5" strokeWidth={2} />,
  },
  {
    href: "/admin/withdrawals",
    label: "طلبات السحب",
    icon: <Banknote className="w-5 h-5" strokeWidth={2} />,
  },
  {
    href: "/admin/users",
    label: "المستخدمون",
    icon: <Users className="w-5 h-5" strokeWidth={2} />,
  },
  {
    href: "/admin/salaries",
    label: "رواتب القادة",
    icon: <Coins className="w-5 h-5" strokeWidth={2} />,
  },
  {
    href: "/admin/competitions",
    label: "المسابقات",
    icon: <Trophy className="w-5 h-5" strokeWidth={2} />,
  },
  {
    href: "/admin/settings",
    label: "الإعدادات",
    icon: <Settings className="w-5 h-5" strokeWidth={2} />,
  },
];

export function AdminDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logoutUser();
    window.location.href = "/login";
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
        onClick={onClose}
      />
      {/* Drawer panel */}
      <div className="fixed inset-y-0 start-0 w-72 bg-slate-50 z-50 flex flex-col shadow-[4px_0_40px_rgba(0,0,0,0.12)] lg:hidden">
        {/* Header */}
        <div className="px-5 py-6 flex items-center justify-between border-b border-slate-100 mb-2">
          <Link href="/admin/overview" onClick={onClose} className="flex items-center gap-3">
            <Image
              src="/logo.jpeg"
              alt="Teamo Logo"
              width={100}
              height={40}
              className="h-8 w-auto object-contain drop-shadow-sm"
              priority
            />
            <span className="text-xs font-bold text-slate-400 mt-1">Admin</span>
          </Link>
          <button
            onClick={onClose}
            aria-label="إغلاق القائمة"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-3 pb-2">
            القائمة الرئيسية
          </p>
          {navLinks.map((link) => {
            const isActive =
              pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-emerald-50 text-emerald-600"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <span className={isActive ? "text-emerald-600" : "text-slate-400"}>
                  {link.icon}
                </span>
                <span>{link.label}</span>
                {isActive && (
                  <span className="ms-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pt-2 pb-2">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200 w-full text-rose-500 hover:bg-rose-50 disabled:opacity-50"
          >
            <span className="text-rose-400"><LogOut className="w-5 h-5" strokeWidth={2} /></span>
            <span>{loggingOut ? "جارٍ الخروج..." : "تسجيل الخروج"}</span>
          </button>
        </div>

        <div className="px-5 py-4 border-t border-slate-200/60">
          <p className="text-[10px] text-slate-400 text-center">
            Teamo Admin © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </>
  );
}

export function AdminMobileHeader() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 lg:hidden bg-slate-50/80 backdrop-blur-md border-b border-slate-200/60 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setOpen(true)}
          aria-label="فتح القائمة"
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <Menu className="w-5 h-5" strokeWidth={2} />
        </button>
        <Link href="/admin/overview" className="flex items-center justify-center">
          <Image
            src="/logo.jpeg"
            alt="Teamo Logo"
            width={100}
            height={40}
            className="h-7 w-auto object-contain"
            priority
          />
        </Link>
        <div className="w-9" />
      </header>
      <AdminDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
