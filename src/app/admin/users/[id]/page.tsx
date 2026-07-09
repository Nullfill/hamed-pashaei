import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Eye, Heart } from "lucide-react";
import { listFavorites, listWatchProgress } from "@/lib/activity/store";
import { findUserById } from "@/lib/auth/store";

export const dynamic = "force-dynamic";

function minutes(seconds: number) {
  return Math.floor(seconds / 60).toLocaleString("fa-IR");
}

export default async function AdminUserDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, progress, favorites] = await Promise.all([findUserById(id), listWatchProgress(id, 100), listFavorites(id, 100)]);

  if (!user) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/admin/users" className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white">
            <ArrowRight className="size-4" aria-hidden />
            برگشت به کاربران
          </Link>
          <h1 className="text-3xl font-black text-white">{user.name || "بدون نام"}</h1>
          <p className="mt-2 text-sm text-slate-400">{user.email}</p>
        </div>
        <div className="flex gap-2">
          <span className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm font-bold text-slate-300">{user.role === "ADMIN" ? "مدیر" : "کاربر"}</span>
          <span className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm font-bold text-slate-300">{user.status === "ACTIVE" ? "فعال" : "غیرفعال"}</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/[0.08] bg-[#101117] p-5">
          <Eye className="mb-4 size-5 text-sky-300" aria-hidden />
          <p className="text-3xl font-black text-white">{progress.length.toLocaleString("fa-IR")}</p>
          <p className="mt-1 text-sm text-slate-400">آیتم دیده شده</p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#101117] p-5">
          <Heart className="mb-4 size-5 text-red-300" aria-hidden />
          <p className="text-3xl font-black text-white">{favorites.length.toLocaleString("fa-IR")}</p>
          <p className="mt-1 text-sm text-slate-400">علاقه‌مندی</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-white/[0.08] bg-[#101117]">
          <div className="border-b border-white/[0.08] px-4 py-3">
            <h2 className="font-black text-white">فیلم‌های دیده شده</h2>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {progress.length ? (
              progress.map((item) => (
                <div key={`${item.provider}-${item.type}-${item.id}-${item.season}-${item.episode}`} className="px-4 py-3">
                  <p className="font-bold text-white">{item.title || `${item.type === "movie" ? "فیلم" : "سریال"} ${item.id}`}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {minutes(item.progressSeconds)} دقیقه از {minutes(item.durationSeconds)} دقیقه - {new Date(item.updatedAt).toLocaleString("fa-IR")}
                  </p>
                </div>
              ))
            ) : (
              <p className="px-4 py-6 text-sm text-slate-500">هنوز سابقه تماشا ثبت نشده است.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#101117]">
          <div className="border-b border-white/[0.08] px-4 py-3">
            <h2 className="font-black text-white">علاقه‌مندی‌ها</h2>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {favorites.length ? (
              favorites.map((item) => (
                <div key={`${item.provider}-${item.type}-${item.id}`} className="px-4 py-3">
                  <p className="font-bold text-white">{item.title || `${item.type === "movie" ? "فیلم" : "سریال"} ${item.id}`}</p>
                  <p className="mt-1 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString("fa-IR")}</p>
                </div>
              ))
            ) : (
              <p className="px-4 py-6 text-sm text-slate-500">هنوز علاقه‌مندی ثبت نشده است.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
