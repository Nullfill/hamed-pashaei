import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/auth/validation";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;
  const nextPath = safeNextPath(params.next);
  const user = await getCurrentUser();

  if (user) {
    redirect(nextPath);
  }

  return (
    <section className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-md items-center px-4 py-12 sm:px-6">
      <div className="w-full rounded-2xl border border-white/[0.08] bg-[var(--surface)] p-6 shadow-2xl shadow-black/20">
        <div className="mb-6">
          <h1 className="text-3xl font-black text-white">ورود به حساب</h1>
          <p className="mt-2 text-sm text-slate-400">برای پخش محتوا و دسترسی به پنل وارد شوید.</p>
        </div>

        {params.error ? <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{params.error}</div> : null}

        <form action="/api/auth/login" method="post" className="space-y-4">
          <input type="hidden" name="next" value={nextPath} />
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-300">ایمیل</span>
            <input
              name="email"
              type="email"
              required
              className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm outline-none transition-smooth placeholder:text-slate-500 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-slate-300">رمز عبور</span>
            <input
              name="password"
              type="password"
              required
              className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm outline-none transition-smooth placeholder:text-slate-500 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
            />
          </label>
          <button type="submit" className="w-full rounded-xl bg-amber-500 px-5 py-3 text-sm font-black text-black transition-smooth hover:bg-amber-400">
            ورود
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-400">
          حساب ندارید؟{" "}
          <Link href={`/register?next=${encodeURIComponent(nextPath)}`} className="font-bold text-amber-300">
            ثبت نام
          </Link>
        </p>
      </div>
    </section>
  );
}
