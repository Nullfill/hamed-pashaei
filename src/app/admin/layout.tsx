import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, Home, Shield, Users } from "lucide-react";
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
    <main className="min-h-screen bg-[#08090d] text-white">
      <div className="border-b border-white/[0.08] bg-[#101117]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-amber-500 text-black">
              <Shield className="size-5" aria-hidden />
            </div>
            <div>
              <p className="text-lg font-black">پنل مدیریت</p>
              <p className="text-xs text-slate-400">کنترل کاربران، فعالیت‌ها و آمار سایت</p>
            </div>
          </Link>
          <div className="hidden items-center gap-3 text-sm text-slate-300 sm:flex">
            <BarChart3 className="size-4 text-amber-300" aria-hidden />
            <span>{user.name || user.email}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[15rem_1fr] lg:px-8">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-xl border border-white/[0.08] bg-[#101117] p-3">
            <nav className="grid gap-1">
              {adminLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-300 transition-smooth hover:bg-white/[0.08] hover:text-white">
                    <Icon className="size-4 text-amber-300" aria-hidden />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-3 border-t border-white/[0.08] pt-3">
              <Link href="/" className="mb-2 block rounded-lg px-3 py-2.5 text-sm font-bold text-slate-400 transition-smooth hover:bg-white/[0.08] hover:text-white">
                بازگشت به سایت
              </Link>
              <form action="/api/auth/logout" method="post">
                <button type="submit" className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm font-bold text-slate-300 transition-smooth hover:bg-white/[0.08] hover:text-white">
                  خروج
                </button>
              </form>
            </div>
          </div>
        </aside>
        <section className="min-w-0">{children}</section>
      </div>
    </main>
  );
}
