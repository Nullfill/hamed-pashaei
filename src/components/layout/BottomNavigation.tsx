"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Download, Film, House, Search, UserRound, Tv } from "lucide-react";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const items = [
  { href: "/", label: "خانه", icon: House },
  { href: "/movies", label: "فیلم‌ها", icon: Film },
  { href: "/series", label: "سریال‌ها", icon: Tv },
  { href: "/search", label: "جست‌وجو", icon: Search },
  { href: "/profile", label: "حساب", icon: UserRound },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNavigation() {
  const pathname = usePathname();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallPrompt(null);

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  return (
    <nav className="mobile-bottom-nav lg:hidden" aria-label="ناوبری اصلی موبایل">
      <div className={`mobile-bottom-nav-inner ${installPrompt ? "has-install" : ""}`}>
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={`mobile-nav-item ${active ? "is-active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="size-[1.2rem]" strokeWidth={active ? 2.5 : 1.9} aria-hidden />
              <span>{label}</span>
            </Link>
          );
        })}
        {installPrompt ? (
          <button type="button" className="mobile-nav-item mobile-install-item" onClick={() => void installApp()}>
            <Download className="size-[1.2rem]" strokeWidth={2.1} aria-hidden />
            <span>نصب</span>
          </button>
        ) : null}
      </div>
    </nav>
  );
}
