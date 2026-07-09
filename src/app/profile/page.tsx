import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock, Heart, KeyRound, User } from "lucide-react";
import { changePasswordAction } from "@/app/profile/actions";
import { listFavorites, listWatchProgress } from "@/lib/activity/store";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

function mediaHref(item: { type: "movie" | "series"; id: string; provider?: string }) {
  const provider = item.provider === "gapfilm" ? "b" : item.provider === "shabforoosh" ? "a" : item.provider;
  const params = provider && provider !== "default" ? `?src=${encodeURIComponent(provider)}` : "";
  return `/${item.type === "movie" ? "movies" : "series"}/${encodeURIComponent(item.id)}${params}`;
}

function minutes(seconds: number) {
  return Math.floor(seconds / 60).toLocaleString("fa-IR");
}

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ passwordError?: string }> }) {
  const user = await getCurrentUser();
  const params = await searchParams;

  if (!user) {
    redirect("/login?next=/profile");
  }

  const [progress, favorites] = await Promise.all([listWatchProgress(user.id, 50), listFavorites(user.id, 50)]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-3">
        <h1 className="text-3xl font-black text-white">پروفایل</h1>
        <p className="text-sm text-slate-400">اطلاعات حساب، فیلم‌های دیده شده، نشان شده‌ها و تنظیمات امنیتی</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <aside className="space-y-5">
          <div className="rounded-2xl border border-white/[0.08] bg-[var(--surface)] p-5">
            <div className="mb-4 grid size-12 place-items-center rounded-xl bg-amber-500 text-black">
              <User className="size-6" aria-hidden />
            </div>
            <p className="text-xl font-black text-white">{user.name || "کاربر"}</p>
            <p className="mt-1 text-sm text-slate-400">{user.email}</p>
            <p className="mt-3 text-xs text-slate-500">عضویت: {new Date(user.createdAt).toLocaleDateString("fa-IR")}</p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[var(--surface)] p-5">
            <h2 className="mb-4 flex items-center gap-2 font-black text-white">
              <KeyRound className="size-5 text-amber-300" aria-hidden />
              تغییر رمز عبور
            </h2>
            {params.passwordError ? <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-100">{params.passwordError}</div> : null}
            <form action={changePasswordAction} className="space-y-3">
              <input
                name="currentPassword"
                type="password"
                required
                placeholder="رمز فعلی"
                className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm outline-none focus:border-amber-500/50"
              />
              <input
                name="newPassword"
                type="password"
                minLength={8}
                required
                placeholder="رمز جدید"
                className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm outline-none focus:border-amber-500/50"
              />
              <input
                name="confirmPassword"
                type="password"
                minLength={8}
                required
                placeholder="تکرار رمز جدید"
                className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm outline-none focus:border-amber-500/50"
              />
              <button type="submit" className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-black text-black hover:bg-amber-400">
                ذخیره رمز جدید
              </button>
            </form>
          </div>
        </aside>

        <div className="space-y-6">
          <div className="rounded-2xl border border-white/[0.08] bg-[var(--surface)]">
            <div className="flex items-center gap-2 border-b border-white/[0.08] px-5 py-4">
              <Clock className="size-5 text-sky-300" aria-hidden />
              <h2 className="font-black text-white">مشاهده شده‌ها</h2>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {progress.length ? (
                progress.map((item) => (
                  <Link key={`${item.provider}-${item.type}-${item.id}-${item.season}-${item.episode}`} href={mediaHref(item)} className="block px-5 py-4 hover:bg-white/[0.03]">
                    <p className="font-bold text-white">{item.title || `${item.type === "movie" ? "فیلم" : "سریال"} ${item.id}`}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {minutes(item.progressSeconds)} دقیقه دیده شده - {new Date(item.updatedAt).toLocaleString("fa-IR")}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="px-5 py-8 text-sm text-slate-500">هنوز چیزی تماشا نکرده‌اید.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[var(--surface)]">
            <div className="flex items-center gap-2 border-b border-white/[0.08] px-5 py-4">
              <Heart className="size-5 text-red-300" aria-hidden />
              <h2 className="font-black text-white">نشان شده‌ها</h2>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {favorites.length ? (
                favorites.map((item) => (
                  <Link key={`${item.provider}-${item.type}-${item.id}`} href={mediaHref(item)} className="block px-5 py-4 hover:bg-white/[0.03]">
                    <p className="font-bold text-white">{item.title || `${item.type === "movie" ? "فیلم" : "سریال"} ${item.id}`}</p>
                    <p className="mt-1 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString("fa-IR")}</p>
                  </Link>
                ))
              ) : (
                <p className="px-5 py-8 text-sm text-slate-500">هنوز فیلم یا سریالی نشان نکرده‌اید.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
