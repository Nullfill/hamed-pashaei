import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  Heart,
  ShieldCheck,
} from "lucide-react";
import {
  getActivityCounts,
  listFavorites,
  listWatchProgress,
} from "@/lib/activity/store";
import { findUserById } from "@/lib/auth/store";

export const dynamic = "force-dynamic";

function minutes(seconds: number) {
  return Math.floor(seconds / 60).toLocaleString("fa-IR");
}

function mediaHref(item: {
  type: "movie" | "series";
  id: string;
  provider?: string;
}) {
  const source =
    item.provider === "gapfilm"
      ? "b"
      : item.provider === "shabforoosh"
        ? "a"
        : item.provider === "filimo"
          ? "c"
        : item.provider;
  const query =
    source && source !== "default" ? `?src=${encodeURIComponent(source)}` : "";
  return `/${item.type === "movie" ? "movies" : "series"}/${encodeURIComponent(item.id)}${query}`;
}

export default async function AdminUserDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, progress, favorites, counts] = await Promise.all([
    findUserById(id),
    listWatchProgress(id, 100),
    listFavorites(id, 100),
    getActivityCounts(id),
  ]);

  if (!user) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-l from-amber-500/[0.08] to-transparent p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/admin/users"
              className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white"
            >
              <ArrowRight className="size-4" aria-hidden />
              برگشت به کاربران
            </Link>
            <h1 className="text-3xl font-black text-white">
              {user.name || "بدون نام"}
            </h1>
            <p className="mt-2 text-sm text-slate-400">{user.email}</p>
            <p
              dir="ltr"
              className="mt-2 text-left font-mono text-[11px] text-slate-600 sm:text-right"
            >
              {user.id}
            </p>
          </div>
          <div className="flex gap-2">
            <span className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm font-bold text-slate-300">
              {user.role === "ADMIN" ? "مدیر" : "کاربر"}
            </span>
            <span className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm font-bold text-slate-300">
              {user.status === "ACTIVE" ? "فعال" : "غیرفعال"}
            </span>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/[0.07] pt-4 text-xs text-slate-400">
          <span className="inline-flex items-center gap-2">
            <CalendarDays className="size-4 text-amber-300" aria-hidden />
            عضویت: {new Date(user.createdAt).toLocaleDateString("fa-IR")}
          </span>
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="size-4 text-sky-300" aria-hidden />
            آخرین تغییر حساب: {new Date(user.updatedAt).toLocaleString("fa-IR")}
          </span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/[0.08] bg-[#101117] p-5">
          <Eye className="mb-4 size-5 text-sky-300" aria-hidden />
          <p className="text-3xl font-black text-white">
            {counts.watch.toLocaleString("fa-IR")}
          </p>
          <p className="mt-1 text-sm text-slate-400">آیتم دیده شده</p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#101117] p-5">
          <Heart className="mb-4 size-5 text-red-300" aria-hidden />
          <p className="text-3xl font-black text-white">
            {counts.favorites.toLocaleString("fa-IR")}
          </p>
          <p className="mt-1 text-sm text-slate-400">علاقه‌مندی</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-white/[0.08] bg-[#101117]">
          <div className="border-b border-white/[0.08] px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-black text-white">مشاهده‌شده‌ها</h2>
              <span className="text-xs text-slate-500">
                {progress.length.toLocaleString("fa-IR")} مورد اخیر
              </span>
            </div>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {progress.length ? (
              progress.map((item) => (
                <Link
                  key={`${item.provider}-${item.type}-${item.id}-${item.season}-${item.episode}`}
                  href={mediaHref(item)}
                  className="block px-4 py-3.5 hover:bg-white/[0.03]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-white">
                        {item.title ||
                          `${item.type === "movie" ? "فیلم" : "سریال"} ${item.id}`}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="size-3.5" aria-hidden />
                          {minutes(item.progressSeconds)} از{" "}
                          {minutes(item.durationSeconds)} دقیقه
                        </span>
                        {item.type === "series" && item.season !== "0" ? (
                          <span>
                            فصل {item.season} • قسمت {item.episode}
                          </span>
                        ) : null}
                      </p>
                    </div>
                    {item.completed ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-300">
                        <CheckCircle2 className="size-3" aria-hidden />
                        کامل
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                    <div
                      className="h-full rounded-full bg-sky-400"
                      style={{
                        width: `${item.durationSeconds ? Math.min(100, (item.progressSeconds / item.durationSeconds) * 100) : 0}%`,
                      }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-slate-600">
                    آخرین تماشا:{" "}
                    {new Date(item.updatedAt).toLocaleString("fa-IR")}
                  </p>
                </Link>
              ))
            ) : (
              <p className="px-4 py-6 text-sm text-slate-500">
                هنوز سابقه تماشا ثبت نشده است.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#101117]">
          <div className="border-b border-white/[0.08] px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-black text-white">نشان‌شده‌ها</h2>
              <span className="text-xs text-slate-500">
                {favorites.length.toLocaleString("fa-IR")} مورد اخیر
              </span>
            </div>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {favorites.length ? (
              favorites.map((item) => (
                <Link
                  key={`${item.provider}-${item.type}-${item.id}`}
                  href={mediaHref(item)}
                  className="flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-white/[0.03]"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold text-white">
                      {item.title ||
                        `${item.type === "movie" ? "فیلم" : "سریال"} ${item.id}`}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.type === "movie" ? "فیلم" : "سریال"} •{" "}
                      {new Date(item.createdAt).toLocaleString("fa-IR")}
                    </p>
                  </div>
                  <Heart
                    className="size-4 shrink-0 fill-red-400/20 text-red-300"
                    aria-hidden
                  />
                </Link>
              ))
            ) : (
              <p className="px-4 py-6 text-sm text-slate-500">
                هنوز علاقه‌مندی ثبت نشده است.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
