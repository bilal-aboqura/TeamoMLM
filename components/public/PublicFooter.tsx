import Link from "next/link";
import Image from "next/image";

export default function PublicFooter() {
  const currentYear = new Date().getUTCFullYear();

  return (
    <footer className="bg-slate-900 py-8 px-6 text-slate-400">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row-reverse items-center justify-between gap-4">
        <div className="text-center md:text-start flex flex-col items-center md:items-start">
          <Link href="/" className="inline-block mb-4 transition-all duration-300 hover:opacity-90 hover:-translate-y-0.5">
            <Image
              src="/logo.jpeg"
              alt="Teamo Logo"
              width={140}
              height={56}
              className="h-12 w-auto object-contain"
            />
          </Link>
          <p className="text-sm">
            &copy; {currentYear} جميع الحقوق محفوظة.
          </p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-6 text-sm">
          <Link href="/privacy" className="hover:text-white transition-colors duration-200">
            سياسة الخصوصية
          </Link>
          <Link href="/terms" className="hover:text-white transition-colors duration-200">
            الشروط والأحكام
          </Link>
        </div>
      </div>
    </footer>
  );
}
