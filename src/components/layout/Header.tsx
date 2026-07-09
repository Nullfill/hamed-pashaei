"use client";

import Link from "next/link";
import { Film, Search, Menu, X } from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/", label: "خانه" },
  { href: "/movies", label: "فیلم‌ها" },
  { href: "/series", label: "سریال‌ها" },
  { href: "/kids", label: "کودک" },
  { href: "/genres", label: "ژانرها" },
  { href: "/dubbed", label: "دوبله" },
  { href: "/subtitled", label: "زیرنویس" },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/[0.08]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-3 transition-smooth hover:scale-105">
          <div className="relative grid size-11 place-items-center rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 shadow-lg shadow-amber-500/25 transition-smooth group-hover:shadow-amber-500/40">
            <Film className="size-6" aria-hidden />
          </div>
          <div className="hidden flex-col sm:flex">
            <span className="text-lg font-bold leading-tight tracking-tight">شب نمایش</span>
            <span className="text-[10px] font-medium leading-tight text-slate-400">پلتفرم پخش آنلاین</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 text-sm font-medium lg:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-lg px-4 py-2 text-slate-300 transition-smooth hover:bg-white/10 hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Search & Mobile Menu */}
        <div className="flex items-center gap-3">
          {/* Search Button/Form */}
          <Link
            href="/search"
            className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition-smooth hover:border-amber-500/50 hover:bg-white/10 hover:text-amber-400 lg:hidden"
          >
            <Search className="size-5" aria-hidden />
          </Link>

          {/* Desktop Search */}
          <form action="/search" className="relative hidden lg:block">
            <Search className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              name="q"
              type="search"
              placeholder="جستجوی فیلم یا سریال..."
              className="h-10 w-64 rounded-xl border border-white/10 bg-white/5 px-11 text-sm outline-none transition-smooth placeholder:text-slate-500 hover:border-white/20 focus:border-amber-500/50 focus:bg-white/8 focus:ring-2 focus:ring-amber-500/20 xl:w-80"
            />
          </form>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition-smooth hover:bg-white/10 lg:hidden"
            aria-label="منوی اصلی"
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
          >
            {menuOpen ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </div>

      <div id="mobile-navigation" className={`${menuOpen ? "block" : "hidden"} border-t border-white/[0.08] lg:hidden`}>
        <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 text-sm font-medium">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="rounded-lg px-4 py-2.5 text-slate-300 transition-smooth hover:bg-white/10 hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
