"use client";

import Link from "next/link";
import { Film, Menu, Search, Shield, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { PublicUser } from "@/lib/auth/types";

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
  const [accountOpen, setAccountOpen] = useState(false);
  const [user, setUser] = useState<PublicUser>();

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/auth/me", { signal: controller.signal, cache: "no-store" })
      .then((response) => (response.ok ? response.json() : undefined))
      .then((payload: { user?: PublicUser } | undefined) => {
        if (!controller.signal.aborted) setUser(payload?.user);
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, []);

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/[0.08]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-3 transition-smooth hover:scale-105">
          <div className="relative grid size-11 place-items-center rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 shadow-lg shadow-amber-500/25 transition-smooth group-hover:shadow-amber-500/40">
            <Film className="size-6" aria-hidden />
          </div>
          <div className="hidden flex-col sm:flex">
            <span className="text-lg font-bold leading-tight tracking-tight">فیلیمچی</span>
            <span className="text-[10px] font-medium leading-tight text-slate-400">پلتفرم پخش آنلاین</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 text-sm font-medium lg:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-lg px-4 py-2 text-slate-300 transition-smooth hover:bg-white/10 hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/search"
            className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition-smooth hover:border-amber-500/50 hover:bg-white/10 hover:text-amber-400 lg:hidden"
          >
            <Search className="size-5" aria-hidden />
          </Link>

          <form action="/search" className="relative hidden lg:block">
            <Search className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              name="q"
              type="search"
              placeholder="جستجوی فیلم یا سریال..."
              className="h-10 w-64 rounded-xl border border-white/10 bg-white/5 px-11 text-sm outline-none transition-smooth placeholder:text-slate-500 hover:border-white/20 focus:border-amber-500/50 focus:bg-white/8 focus:ring-2 focus:ring-amber-500/20 xl:w-80"
            />
          </form>

          {user ? (
            <div className="relative hidden lg:block">
              <button
                type="button"
                onClick={() => setAccountOpen((value) => !value)}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-bold text-slate-200 transition-smooth hover:border-amber-500/50 hover:bg-white/10"
                aria-expanded={accountOpen}
              >
                <User className="size-4 text-amber-300" aria-hidden />
                <span className="max-w-28 truncate">{user.name || user.email}</span>
              </button>

              {accountOpen ? (
                <div className="absolute left-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-white/[0.08] bg-[#111118] p-2 shadow-2xl shadow-black/30">
                  <div className="border-b border-white/[0.08] px-3 py-2">
                    <p className="truncate text-sm font-black text-white">{user.name || "حساب کاربری"}</p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                  </div>
                  <Link href="/profile" onClick={() => setAccountOpen(false)} className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-slate-300 hover:bg-white/[0.08] hover:text-white">
                    <User className="size-4 text-amber-300" aria-hidden />
                    پروفایل
                  </Link>
                  {user.role === "ADMIN" ? (
                    <Link href="/admin" onClick={() => setAccountOpen(false)} className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-slate-300 hover:bg-white/[0.08] hover:text-white">
                      <Shield className="size-4 text-amber-300" aria-hidden />
                      پنل مدیریت
                    </Link>
                  ) : null}
                  <form action="/api/auth/logout" method="post" className="mt-1">
                    <button type="submit" className="w-full rounded-lg px-3 py-2 text-right text-sm font-bold text-slate-300 hover:bg-white/[0.08] hover:text-white">
                      خروج
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          ) : (
            <Link href="/login" className="hidden h-10 items-center rounded-xl bg-amber-500 px-4 text-sm font-black text-black transition-smooth hover:bg-amber-400 lg:inline-flex">
              ورود
            </Link>
          )}

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
          {user ? (
            <>
              <Link href="/profile" onClick={() => setMenuOpen(false)} className="rounded-lg px-4 py-2.5 text-slate-300 transition-smooth hover:bg-white/10 hover:text-white">
                پروفایل
              </Link>
              {user.role === "ADMIN" ? (
                <Link href="/admin" onClick={() => setMenuOpen(false)} className="rounded-lg px-4 py-2.5 text-slate-300 transition-smooth hover:bg-white/10 hover:text-white">
                  پنل مدیریت
                </Link>
              ) : null}
              <form action="/api/auth/logout" method="post" className="px-4 py-2">
                <button type="submit" className="text-sm font-bold text-slate-300">
                  خروج
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" onClick={() => setMenuOpen(false)} className="rounded-lg px-4 py-2.5 font-bold text-amber-300 transition-smooth hover:bg-white/10">
              ورود
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
