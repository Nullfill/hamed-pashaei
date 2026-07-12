import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Heart,
  KeyRound,
  ShieldCheck,
  User,
} from "lucide-react";
import { changePasswordAction } from "@/app/profile/actions";
import {
  getActivityCounts,
  listFavorites,
  listWatchProgress,
} from "@/lib/activity/store";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

function mediaHref(item: {
  type: "movie" | "series";
  id: string;
  provider?: string;
}) {
  const provider =
    item.provider === "gapfilm"
      ? "b"
      : item.provider === "shabforoosh"
        ? "a"
        : item.provider;
  const params =
    provider && provider !== "default"
      ? `?src=${encodeURIComponent(provider)}`
      : "";
  return `/${item.type === "movie" ? "movies" : "series"}/${encodeURIComponent(item.id)}${params}`;
}

function minutes(seconds: number) {
  return Math.floor(seconds / 60).toLocaleString("fa-IR");
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ passwordError?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;

  if (!user) {
    redirect("/login?next=/profile");
  }

  const [progress, favorites, counts] = await Promise.all([
    listWatchProgress(user.id, 50),
    listFavorites(user.id, 50),
    getActivityCounts(user.id),
  ]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-l from-amber-500/[0.12] via-[var(--surface)] to-[var(--surface)] p-5 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-amber-500 text-black shadow-xl shadow-amber-500/15">
              <User className="size-7" aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-black text-white sm:text-3xl">
                {user.name || "کاربر"}
              </h1>
              <p className="mt-1 truncate text-sm text-slate-400">
                {user.email}
              </p>
            </div>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-200">
            <ShieldCheck className="size-4" aria-hidden /> حساب فعال
          </span>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/[0.07] bg-black/15 p-4">
            <p className="text-2xl font-black">
              {counts.watch.toLocaleString("fa-IR")}
            </p>
            <p className="mt-1 text-xs text-slate-400">مشاهده‌شده</p>
          </div>
          <div className="rounded-xl border border-white/[0.07] bg-black/15 p-4">
            <p className="text-2xl font-black">
              {counts.favorites.toLocaleString("fa-IR")}
            </p>
            <p className="mt-1 text-xs text-slate-400">نشان‌شده</p>
          </div>
          <div className="col-span-2 rounded-xl border border-white/[0.07] bg-black/15 p-4 sm:col-span-1">
            <CalendarDays className="mb-2 size-4 text-amber-300" aria-hidden />
            <p className="text-xs text-slate-400">
              عضویت از {new Date(user.createdAt).toLocaleDateString("fa-IR")}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">
        <aside className="space-y-5">
          <div className="rounded-2xl border border-white/[0.08] bg-[var(--surface)] p-5 lg:sticky lg:top-24">
            <h2 className="mb-4 flex items-center gap-2 font-black text-white">
              <KeyRound className="size-5 text-amber-300" aria-hidden />
              تغییر رمز عبور
            </h2>
            {params.passwordError ? (
              <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                {params.passwordError}
              </div>
            ) : null}
            <form action={changePasswordAction} className="space-y-3">
              <label
                className="block text-xs font-bold text-slate-400"
                htmlFor="currentPassword"
              >
                رمز عبور فعلی
              </label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                required
                placeholder="رمز فعلی"
                className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm outline-none focus:border-amber-500/50"
              />
              <label
                className="block text-xs font-bold text-slate-400"
                htmlFor="newPassword"
              >
                رمز عبور جدید
              </label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                minLength={8}
                required
                placeholder="رمز جدید"
                className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm outline-none focus:border-amber-500/50"
              />
              <label
                className="block text-xs font-bold text-slate-400"
                htmlFor="confirmPassword"
              >
                تکرار رمز جدید
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                minLength={8}
                required
                placeholder="تکرار رمز جدید"
                className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm outline-none focus:border-amber-500/50"
              />
              <button
                type="submit"
                className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-black text-black hover:bg-amber-400"
              >
                ذخیره رمز جدید
              </button>
            </form>
          </div>
        </aside>

        <div className="space-y-6">
          <div className="rounded-2xl border border-white/[0.08] bg-[var(--surface)]">
            <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] px-5 py-4">
              <div className="flex items-center gap-2">
                <Clock className="size-5 text-sky-300" aria-hidden />
                <h2 className="font-black text-white">مشاهده شده‌ها</h2>
              </div>
              <span className="text-xs text-slate-500">
                آخرین {progress.length.toLocaleString("fa-IR")} مورد
              </span>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {progress.length ? (
                progress.map((item) => (
                  <Link
                    key={`${item.provider}-${item.type}-${item.id}-${item.season}-${item.episode}`}
                    href={mediaHref(item)}
                    className="block px-5 py-4 hover:bg-white/[0.03]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-bold text-white">
                        {item.title ||
                          `${item.type === "movie" ? "فیلم" : "سریال"} ${item.id}`}
                      </p>
                      {item.completed ? (
                        <CheckCircle2
                          className="size-4 shrink-0 text-emerald-300"
                          aria-label="تماشا کامل شده"
                        />
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {minutes(item.progressSeconds)} دقیقه دیده شده •{" "}
                      {new Date(item.updatedAt).toLocaleString("fa-IR")}
                    </p>
                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.07]">
                      <div
                        className="h-full rounded-full bg-sky-400"
                        style={{
                          width: `${item.durationSeconds ? Math.min(100, (item.progressSeconds / item.durationSeconds) * 100) : 0}%`,
                        }}
                      />
                    </div>
                  </Link>
                ))
              ) : (
                <p className="px-5 py-8 text-sm text-slate-500">
                  هنوز چیزی تماشا نکرده‌اید.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[var(--surface)]">
            <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] px-5 py-4">
              <div className="flex items-center gap-2">
                <Heart className="size-5 text-red-300" aria-hidden />
                <h2 className="font-black text-white">نشان شده‌ها</h2>
              </div>
              <span className="text-xs text-slate-500">
                آخرین {favorites.length.toLocaleString("fa-IR")} مورد
              </span>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {favorites.length ? (
                favorites.map((item) => (
                  <Link
                    key={`${item.provider}-${item.type}-${item.id}`}
                    href={mediaHref(item)}
                    className="block px-5 py-4 hover:bg-white/[0.03]"
                  >
                    <p className="font-bold text-white">
                      {item.title ||
                        `${item.type === "movie" ? "فیلم" : "سریال"} ${item.id}`}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(item.createdAt).toLocaleString("fa-IR")}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="px-5 py-8 text-sm text-slate-500">
                  هنوز فیلم یا سریالی نشان نکرده‌اید.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
