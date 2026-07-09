import Link from "next/link";
import { Activity, Eye, Heart, UserCheck, Users } from "lucide-react";
import { getDailyTraffic, getTrafficSummary, listFavorites, listWatchProgress } from "@/lib/activity/store";
import { listUsers } from "@/lib/auth/store";

export const dynamic = "force-dynamic";

function StatCard({ title, value, icon: Icon, tone = "amber" }: { title: string; value: number; icon: React.ElementType; tone?: "amber" | "green" | "sky" | "red" }) {
  const toneClass = {
    amber: "text-amber-300",
    green: "text-green-300",
    sky: "text-sky-300",
    red: "text-red-300",
  }[tone];

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#101117] p-5">
      <Icon className={`mb-4 size-5 ${toneClass}`} aria-hidden />
      <p className="text-3xl font-black text-white">{value.toLocaleString("fa-IR")}</p>
      <p className="mt-1 text-sm text-slate-400">{title}</p>
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
            <div key={item.key} className="px-4 py-3">
              {item.href ? (
                <Link href={item.href} className="font-bold text-white hover:text-amber-300">
                  {item.title}
                </Link>
              ) : (
                <p className="font-bold text-white">{item.title}</p>
              )}
              <p className="mt-1 text-xs text-slate-500">{item.meta}</p>
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
  const [users, traffic, dailyTraffic, latestProgress, latestFavorites] = await Promise.all([
    listUsers(),
    getTrafficSummary(),
    getDailyTraffic(14),
    listWatchProgress(undefined, 8),
    listFavorites(undefined, 8),
  ]);
  const admins = users.filter((user) => user.role === "ADMIN").length;
  const activeUsers = users.filter((user) => user.status === "ACTIVE").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">داشبورد</h1>
          <p className="mt-2 text-sm text-slate-400">نمای کلی کاربران، فعالیت تماشا، علاقه‌مندی‌ها و بازدید سایت</p>
        </div>
        <Link href="/admin/users" className="w-fit rounded-lg bg-amber-500 px-4 py-2 text-sm font-black text-black transition-smooth hover:bg-amber-400">
          مدیریت کاربران
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="کل کاربران" value={users.length} icon={Users} />
        <StatCard title="کاربران فعال" value={activeUsers} icon={UserCheck} tone="green" />
        <StatCard title="مدیران" value={admins} icon={Activity} tone="sky" />
        <StatCard title="بازدید امروز" value={traffic.today} icon={Eye} tone="red" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="بازدید این ماه" value={traffic.thisMonth} icon={Eye} tone="sky" />
        <StatCard title="کل بازدید ثبت شده" value={traffic.total} icon={Eye} />
        <StatCard title="فیلم‌های نشان شده" value={latestFavorites.length} icon={Heart} tone="red" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ActivityList
          title="آخرین تماشاها"
          empty="هنوز سابقه تماشایی ثبت نشده است."
          items={latestProgress.map((item) => ({
            key: `${item.userId}-${item.provider}-${item.type}-${item.id}-${item.season}-${item.episode}`,
            title: item.title || `${item.type === "movie" ? "فیلم" : "سریال"} ${item.id}`,
            meta: `${Math.floor(item.progressSeconds / 60).toLocaleString("fa-IR")} دقیقه دیده شده - ${new Date(item.updatedAt).toLocaleString("fa-IR")}`,
            href: `/admin/users/${encodeURIComponent(item.userId)}`,
          }))}
        />
        <ActivityList
          title="آخرین علاقه‌مندی‌ها"
          empty="هنوز علاقه‌مندی ثبت نشده است."
          items={latestFavorites.map((item) => ({
            key: `${item.userId}-${item.provider}-${item.type}-${item.id}`,
            title: item.title || `${item.type === "movie" ? "فیلم" : "سریال"} ${item.id}`,
            meta: new Date(item.createdAt).toLocaleString("fa-IR"),
            href: `/admin/users/${encodeURIComponent(item.userId)}`,
          }))}
        />
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-[#101117]">
        <div className="border-b border-white/[0.08] px-4 py-3">
          <h2 className="font-black text-white">بازدید ۱۴ روز اخیر</h2>
        </div>
        <div className="grid gap-2 p-4">
          {dailyTraffic.length ? (
            dailyTraffic.map((day) => (
              <div key={day.day} className="grid grid-cols-[7rem_1fr_4rem] items-center gap-3 text-sm">
                <span className="text-slate-400">{new Date(day.day).toLocaleDateString("fa-IR")}</span>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
                  <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.max(6, Math.min(100, day.views * 8))}%` }} />
                </div>
                <span className="text-left font-bold text-white">{day.views.toLocaleString("fa-IR")}</span>
              </div>
            ))
          ) : (
            <p className="py-4 text-sm text-slate-500">هنوز بازدیدی ثبت نشده است.</p>
          )}
        </div>
      </div>
    </div>
  );
}
