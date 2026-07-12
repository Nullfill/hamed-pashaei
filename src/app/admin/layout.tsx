import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, ExternalLink, LogOut, Shield } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { AdminNav } from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  if (user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-[#08090d] text-white">
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[#101117]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[92rem] items-center justify-between gap-3 px-4 py-3 sm:px-5 lg:px-8">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-amber-500 text-black">
              <Shield className="size-5" aria-hidden />
            </div>
            <div>
              <p className="text-base font-black sm:text-lg">پنل مدیریت</p>
              <p className="hidden text-xs text-slate-400 sm:block">
                کاربران، فعالیت‌ها و آمار بازدید
              </p>
            </div>
          </Link>
          <div className="flex min-w-0 items-center gap-2 text-sm text-slate-300 sm:gap-3">
            <BarChart3
              className="hidden size-4 text-amber-300 sm:block"
              aria-hidden
            />
            <span className="hidden max-w-44 truncate sm:block">
              {user.name || user.email}
            </span>
            <Link
              href="/"
              className="grid size-9 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08]"
              aria-label="بازگشت به سایت"
            >
              <ExternalLink className="size-4" aria-hidden />
            </Link>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="grid size-9 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-slate-300 hover:bg-red-500/15 hover:text-red-200"
                aria-label="خروج"
              >
                <LogOut className="size-4" aria-hidden />
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[92rem] gap-4 px-3 py-4 sm:px-5 sm:py-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-6 lg:px-8">
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-white/[0.08] bg-[#101117] p-2 lg:p-3">
            <AdminNav />
            <div className="mt-3 hidden border-t border-white/[0.08] pt-3 lg:block">
              <Link
                href="/"
                className="mb-2 block rounded-lg px-3 py-2.5 text-sm font-bold text-slate-400 transition-smooth hover:bg-white/[0.08] hover:text-white"
              >
                بازگشت به سایت
              </Link>
              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm font-bold text-slate-300 transition-smooth hover:bg-white/[0.08] hover:text-white"
                >
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
