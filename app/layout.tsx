import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Teamo | المنصة الرائدة للمهام والأرباح",
  description: "Teamo MLM Platform",
  icons: {
    icon: "/logo.jpeg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className="font-[family-name:var(--font-cairo)] bg-slate-50 antialiased">
        {children}
      </body>
    </html>
  );
}
