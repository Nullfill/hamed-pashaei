import { Film, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/[0.08] bg-[var(--background-elevated)]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 text-center">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600">
              <Film className="size-5" aria-hidden />
            </div>
            <span className="text-xl font-bold text-white">فیلیمچی</span>
          </div>

          {/* Description */}
          <p className="max-w-md text-sm leading-relaxed text-slate-400">
            آرشیو ترکیبی فیلم و سریال برای تماشا و جستجوی سریع. پلتفرم پخش آنلاین با کیفیت بالا
          </p>

          {/* Copyright */}
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>ساخته شده با</span>
            <Heart className="size-4 fill-amber-500 text-amber-500" aria-hidden />
            <span>در ایران</span>
          </div>

          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} فیلیمچی. تمامی حقوق محفوظ است.
          </p>
        </div>
      </div>
    </footer>
  );
}
