"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, Download, CheckSquare, Banknote, Users, Coins, Trophy, Settings, LogOut, TrendingUp, Smartphone, ClipboardList, CreditCard } from "lucide-react";
import { logoutUser } from "@/app/(auth)/actions";

const navLinks = [
  {
    href: "/admin/overview",
    label: "النظرة العامة",
    icon: <LayoutDashboard className="w-4 h-4" strokeWidth={2} />,
  },
  {
    href: "/admin/deposits",
    label: "الإيداعات المعلقة",
    icon: <Download className="w-4 h-4" strokeWidth={2} />,
  },
  {
    href: "/admin/equity-requests",
    label: "طلبات حصص الأرباح",
    icon: <Coins className="w-4 h-4" strokeWidth={2} />,
  },
  {
    href: "/admin/investments",
    label: "الاستثمارات",
    icon: <TrendingUp className="w-4 h-4" strokeWidth={2} />,
  },
  {
    href: "/admin/tasks",
    label: "إدارة المهام",
    icon: <CheckSquare className="w-4 h-4" strokeWidth={2} />,
  },
  {
    href: "/admin/app-profits/manage",
    label: "إدارة تطبيقات الربح",
    icon: <Smartphone className="w-4 h-4" strokeWidth={2} />,
  },
  {
    href: "/admin/app-profits/reviews",
    label: "مراجعة إثباتات التطبيقات",
    icon: <ClipboardList className="w-4 h-4" strokeWidth={2} />,
  },
  {
    href: "/admin/app-profits/withdrawals",
    label: "سحوبات أرباح التطبيقات",
    icon: <Banknote className="w-4 h-4" strokeWidth={2} />,
  },
  {
    href: "/admin/withdrawals",
    label: "طلبات السحب",
    icon: <Banknote className="w-4 h-4" strokeWidth={2} />,
  },
  {
    href: "/admin/pay-later",
    label: "الدفع لاحقاً",
    icon: <CreditCard className="w-4 h-4" strokeWidth={2} />,
  },
  {
    href: "/admin/users",
    label: "المستخدمون",
    icon: <Users className="w-4 h-4" strokeWidth={2} />,
  },
  {
    href: "/admin/salaries",
    label: "رواتب القادة",
    icon: <Coins className="w-4 h-4" strokeWidth={2} />,
  },
  {
    href: "/admin/competitions",
    label: "المسابقات",
    icon: <Trophy className="w-4 h-4" strokeWidth={2} />,
  },
  {
    href: "/admin/settings",
    label: "الإعدادات",
    icon: <Settings className="w-4 h-4" strokeWidth={2} />,
  },
];

function SidebarLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
        isActive
          ? "bg-emerald-50 text-emerald-600 shadow-[inset_0_1px_2px_rgba(5,150,105,0.08)]"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 hover:-translate-y-0.5"
      }`}
    >
      <span
        className={`transition-colors duration-200 ${
          isActive
            ? "text-emerald-600"
            : "text-slate-400 group-hover:text-slate-600"
        }`}
      >
        {icon}
      </span>
      <span>{label}</span>
      {isActive && (
        <span className="ms-auto w-1.5 h-1.5 rounded-full bg-emerald-500" />
      )}
    </Link>
  );
}

export function AdminSidebar() {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logoutUser();
    window.location.href = "/login";
  };

  return (
    <aside className="hidden lg:flex flex-col fixed inset-y-0 start-0 w-64 bg-slate-50 border-e border-slate-200/60 z-30 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
      {/* Brand */}
      <div className="px-6 py-8">
        <Link href="/admin/overview" className="flex flex-col items-start gap-1 p-2">
          <Image
            src="/logo.jpeg"
            alt="Teamo Logo"
            width={140}
            height={56}
            className="h-12 w-auto object-contain drop-shadow-sm"
            priority
          />
          <span className="text-[10px] text-slate-400 font-medium ms-2 tracking-wider">لوحة التحكم</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-3 pb-2 pt-1">
          القائمة الرئيسية
        </p>
        {navLinks.map((link) => (
          <SidebarLink
            key={link.href}
            href={link.href}
            label={link.label}
            icon={link.icon}
          />
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 pt-2 pb-2">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600 w-full disabled:opacity-50"
        >
          <span className="text-rose-400 group-hover:text-rose-500">
            <LogOut className="w-4 h-4" strokeWidth={2} />
          </span>
          <span>{loggingOut ? "جارٍ الخروج..." : "تسجيل الخروج"}</span>
        </button>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-200/60">
        <p className="text-[10px] text-slate-400 text-center">
          Teamo Admin © {new Date().getFullYear()}
        </p>
      </div>
    </aside>
  );
}
