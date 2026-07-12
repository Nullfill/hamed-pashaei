import Link from "next/link";
import {
  Activity,
  ArrowUpLeft,
  Eye,
  Heart,
  UserCheck,
  Users,
} from "lucide-react";
import {
  getActivityCounts,
  getDailyTraffic,
  getTopPages,
  getTrafficSummary,
  listFavorites,
  listWatchProgress,
} from "@/lib/activity/store";
import { listUsers } from "@/lib/auth/store";

export const dynamic = "force-dynamic";

function StatCard({
  title,
  value,
  icon: Icon,
  tone = "amber",
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  tone?: "amber" | "green" | "sky" | "red";
}) {
  const toneClass = {
    amber: "text-amber-300",
    green: "text-green-300",
    sky: "text-sky-300",
    red: "text-red-300",
  }[tone];

  return (
    <div className="group rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.055] to-white/[0.025] p-4 transition-smooth hover:-translate-y-0.5 hover:border-white/[0.14] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            {value.toLocaleString("fa-IR")}
          </p>
          <p className="mt-1.5 text-xs leading-5 text-slate-400 sm:text-sm">
            {title}
          </p>
        </div>
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.06]">
          <Icon className={`size-5 ${toneClass}`} aria-hidden />
        </div>
      </div>
    </div>
  );
}

function ActivityList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: Array<{ key: string; title: string; meta: string; href?: string }>;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#101117]">
      <div className="border-b border-white/[0.08] px-4 py-3">
        <h2 className="font-black text-white">{title}</h2>
      </div>
      <div className="divide-y divide-white/[0.06]">
        {items.length ? (
          items.map((item) => (
            <div
              key={item.key}
              className="px-4 py-3.5 transition-colors hover:bg-white/[0.025]"
            >
              {item.href ? (
                <Link
                  href={item.href}
                  className="font-bold text-white hover:text-amber-300"
                >
                  {item.title}
                </Link>
              ) : (
                <p className="font-bold text-white">{item.title}</p>
              )}
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {item.meta}
              </p>
            </div>
          ))
        ) : (
          <p className="px-4 py-6 text-sm text-slate-500">{empty}</p>
        )}
      </div>
    </div>
  );
}

export default async function AdminPage() {
  const [
    users,
    traffic,
    dailyTraffic,
    topPages,
    counts,
    watchItems,
    favoriteItems,
  ] = await Promise.all([
    listUsers(),
    getTrafficSummary(),
    getDailyTraffic(14),
    getTopPages(30, 6),
    getActivityCounts(),
    listWatchProgress(undefined, 8),
    listFavorites(undefined, 8),
  ]);
  const admins = users.filter((user) => user.role === "ADMIN").length;
  const activeUsers = users.filter((user) => user.status === "ACTIVE").length;
  const userInfo = new Map(
    users.map((user) => [
      user.id,
      { name: user.name || "بدون نام", email: user.email },
    ]),
  );
  const latestProgress = watchItems;
  const latestFavorites = favoriteItems;
  const maxDailyViews = Math.max(1, ...dailyTraffic.map((day) => day.views));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">داشبورد مدیریت</h1>
          <p className="mt-2 text-sm text-slate-400">
            نمای روشن از کاربران، بازدید سایت، تماشاها و فیلم‌های نشان‌شده
          </p>
        </div>
        <Link
          href="/admin/users"
          className="w-fit rounded-lg bg-amber-500 px-4 py-2 text-sm font-black text-black transition-smooth hover:bg-amber-400"
        >
          مدیریت کاربران
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard title="کل کاربران" value={users.length} icon={Users} />
        <StatCard
          title="کاربران فعال"
          value={activeUsers}
          icon={UserCheck}
          tone="green"
        />
        <StatCard
          title="بازدید امروز"
          value={traffic.today}
          icon={Eye}
          tone="red"
        />
        <StatCard
          title="بازدیدکننده یکتای امروز"
          value={traffic.uniqueToday}
          icon={UserCheck}
          tone="green"
        />
        <StatCard
          title="بازدید این ماه"
          value={traffic.thisMonth}
          icon={Eye}
          tone="sky"
        />
        <StatCard
          title="بازدیدکننده یکتای ماه"
          value={traffic.uniqueThisMonth}
          icon={Users}
          tone="sky"
        />
        <StatCard
          title="کل آیتم‌های دیده‌شده"
          value={counts.watch}
          icon={Activity}
          tone="green"
        />
        <StatCard
          title="کل آیتم‌های نشان‌شده"
          value={counts.favorites}
          icon={Heart}
          tone="red"
        />
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-slate-400">
        <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5">
          کل بازدید معتبر: {traffic.total.toLocaleString("fa-IR")}
        </span>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5">
          مدیران: {admins.toLocaleString("fa-IR")}
        </span>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5">
          timezone آمار: تهران
        </span>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ActivityList
          title="آخرین تماشاها"
          empty="هنوز سابقه تماشایی ثبت نشده است."
          items={latestProgress.map((item) => ({
            key: `${item.userId}-${item.provider}-${item.type}-${item.id}-${item.season}-${item.episode}`,
            title:
              item.title ||
              `${item.type === "movie" ? "فیلم" : "سریال"} ${item.id}`,
            meta: `${userInfo.get(item.userId)?.name || "کاربر حذف‌شده"} • ${userInfo.get(item.userId)?.email || item.userId} • ${Math.floor(item.progressSeconds / 60).toLocaleString("fa-IR")} دقیقه • ${new Date(item.updatedAt).toLocaleString("fa-IR")}`,
            href: `/admin/users/${encodeURIComponent(item.userId)}`,
          }))}
        />
        <ActivityList
          title="آخرین نشان‌شده‌ها"
          empty="هنوز آیتمی نشان نشده است."
          items={latestFavorites.map((item) => ({
            key: `${item.userId}-${item.provider}-${item.type}-${item.id}`,
            title:
              item.title ||
              `${item.type === "movie" ? "فیلم" : "سریال"} ${item.id}`,
            meta: `${userInfo.get(item.userId)?.name || "کاربر حذف‌شده"} • ${userInfo.get(item.userId)?.email || item.userId} • ${new Date(item.createdAt).toLocaleString("fa-IR")}`,
            href: `/admin/users/${encodeURIComponent(item.userId)}`,
          }))}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(20rem,1fr)]">
        <div className="rounded-xl border border-white/[0.08] bg-[#101117]">
          <div className="border-b border-white/[0.08] px-4 py-3">
            <h2 className="font-black text-white">بازدید ۱۴ روز اخیر</h2>
            <p className="mt-1 text-xs text-slate-500">
              بازدید صفحه / بازدیدکننده یکتا
            </p>
          </div>
          <div className="grid gap-2 p-4">
            {dailyTraffic.length ? (
              dailyTraffic.map((day) => (
                <div
                  key={day.day}
                  className="grid grid-cols-[5.5rem_minmax(4rem,1fr)_4.5rem] items-center gap-2 text-xs sm:grid-cols-[7rem_1fr_8rem] sm:gap-3 sm:text-sm"
                >
                  <span className="whitespace-nowrap text-slate-400">
                    {new Date(`${day.day}T12:00:00Z`).toLocaleDateString(
                      "fa-IR",
                    )}
                  </span>
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
                    <div
                      className="h-full rounded-full bg-gradient-to-l from-amber-400 to-orange-500"
                      style={{
                        width: `${Math.max(4, (day.views / maxDailyViews) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-left font-bold text-white">
                    {day.views.toLocaleString("fa-IR")}{" "}
                    <span className="hidden font-normal text-slate-500 sm:inline">
                      / {day.visitors.toLocaleString("fa-IR")}
                    </span>
                  </span>
                </div>
              ))
            ) : (
              <p className="py-4 text-sm text-slate-500">
                هنوز بازدیدی ثبت نشده است.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-[#101117]">
          <div className="border-b border-white/[0.08] px-4 py-3">
            <h2 className="font-black text-white">صفحات پربازدید</h2>
            <p className="mt-1 text-xs text-slate-500">۳۰ روز اخیر</p>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {topPages.length ? (
              topPages.map((page) => (
                <Link
                  key={page.path}
                  href={page.path}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.03]"
                >
                  <div className="min-w-0">
                    <p
                      dir="ltr"
                      className="truncate text-left text-sm font-bold text-white"
                    >
                      {page.path}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {page.visitors.toLocaleString("fa-IR")} بازدیدکننده یکتا
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 text-sm font-black text-amber-300">
                    {page.views.toLocaleString("fa-IR")}
                    <ArrowUpLeft className="size-3.5" aria-hidden />
                  </span>
                </Link>
              ))
            ) : (
              <p className="px-4 py-6 text-sm text-slate-500">
                داده‌ای برای نمایش وجود ندارد.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
