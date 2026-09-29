"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, KeyRound, Network, Users } from "lucide-react";

const links = [
  { href: "/admin/api-clients", label: "API Clients", icon: KeyRound, exact: false },
  { href: "/admin", label: "داشبورد", icon: Home, exact: true },
  { href: "/admin/users", label: "کاربران", icon: Users, exact: false },
  { href: "/admin/providers", label: "Providerها", icon: Network, exact: false },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      className="scrollbar-none flex gap-1 overflow-x-auto lg:grid"
      aria-label="ناوبری مدیریت"
    >
      {links.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold transition-smooth ${
              active
                ? "bg-amber-500 text-black shadow-lg shadow-amber-500/10"
                : "text-slate-300 hover:bg-white/[0.08] hover:text-white"
            }`}
          >
            <Icon
              className={`size-4 ${active ? "text-black" : "text-amber-300"}`}
              aria-hidden
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
