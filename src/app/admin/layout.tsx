import Link from "next/link";
import { redirect } from "next/navigation";
import { Shield, Users, Home } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const adminLinks = [
  { href: "/admin", label: "داشبورد", icon: Home },
  { href: "/admin/users", label: "کاربران", icon: Users },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  if (user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[16rem_1fr] lg:px-8">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl border border-white/[0.08] bg-[var(--surface)] p-4">
          <div className="mb-5 flex items-center gap-3 border-b border-white/[0.08] pb-4">
            <div className="grid size-10 place-items-center rounded-xl bg-amber-500 text-black">
              <Shield className="size-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-white">{user.name || user.email}</p>
              <p className="text-xs text-slate-400">مدیر سایت</p>
            </div>
          </div>
          <nav className="grid gap-2">
            {adminLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-300 transition-smooth hover:bg-white/[0.08] hover:text-white">
                  <Icon className="size-4 text-amber-300" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <form action="/api/auth/logout" method="post" className="mt-4 border-t border-white/[0.08] pt-4">
            <button type="submit" className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm font-bold text-slate-300 transition-smooth hover:bg-white/[0.08] hover:text-white">
              خروج
            </button>
          </form>
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
