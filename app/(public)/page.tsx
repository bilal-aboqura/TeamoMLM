import type { Metadata } from "next";
import HeroSection from "./_components/HeroSection";
import FeaturesSection from "./_components/FeaturesSection";
import PackagesPreviewSection from "./_components/PackagesPreviewSection";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Teamo | ابدأ رحلة أرباحك اليوم",
  description: "منصة Teamo للأرباح والمهام. شارك في إكمال المهام اليومية، وقم بدعوة أصدقائك لبناء فريقك وزيادة دخلك اليومي.",
};

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      <HeroSection />
      <FeaturesSection />
      <Suspense fallback={
        <div className="h-96 flex items-center justify-center bg-slate-50 w-full">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div>
        </div>
      }>
        <PackagesPreviewSection />
      </Suspense>
    </div>
  );
}
