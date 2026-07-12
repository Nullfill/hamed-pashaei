import Link from "next/link";
import {
  Eye,
  Heart,
  Search,
  SlidersHorizontal,
  UserCheck,
  Users,
} from "lucide-react";
import { updateUserAccessAction } from "@/app/admin/users/actions";
import { getActivityCountsByUser } from "@/lib/activity/store";
import { listUsers } from "@/lib/auth/store";

export const dynamic = "force-dynamic";

type UserFilters = { q?: string; role?: string; status?: string };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<UserFilters>;
}) {
  const filters = await searchParams;
  const [users, activityCounts] = await Promise.all([
    listUsers(),
    getActivityCountsByUser(),
  ]);
  const query = (filters.q || "").trim().toLocaleLowerCase("fa");
  const visibleUsers = users.filter((user) => {
    const matchesQuery =
      !query ||
      `${user.name || ""} ${user.email} ${user.id}`
        .toLocaleLowerCase("fa")
        .includes(query);
    const matchesRole =
      !filters.role || filters.role === "ALL" || user.role === filters.role;
    const matchesStatus =
      !filters.status ||
      filters.status === "ALL" ||
      user.status === filters.status;
    return matchesQuery && matchesRole && matchesStatus;
  });
  const activeCount = users.filter((user) => user.status === "ACTIVE").length;
  const adminCount = users.filter((user) => user.role === "ADMIN").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">کاربران</h1>
        <p className="mt-2 text-sm text-slate-400">
          نقش، وضعیت، تماشاها و علاقه‌مندی‌های هر حساب را کنترل کنید.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/[0.08] bg-[#101117] p-4">
          <Users className="mb-3 size-4 text-amber-300" aria-hidden />
          <p className="text-2xl font-black">
            {users.length.toLocaleString("fa-IR")}
          </p>
          <p className="mt-1 text-xs text-slate-500">کل حساب‌ها</p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#101117] p-4">
          <UserCheck className="mb-3 size-4 text-emerald-300" aria-hidden />
          <p className="text-2xl font-black">
            {activeCount.toLocaleString("fa-IR")}
          </p>
          <p className="mt-1 text-xs text-slate-500">فعال</p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-[#101117] p-4">
          <SlidersHorizontal className="mb-3 size-4 text-sky-300" aria-hidden />
          <p className="text-2xl font-black">
            {adminCount.toLocaleString("fa-IR")}
          </p>
          <p className="mt-1 text-xs text-slate-500">مدیر</p>
        </div>
      </div>

      <form
        className="grid gap-3 rounded-xl border border-white/[0.08] bg-[#101117] p-3 sm:grid-cols-[minmax(0,1fr)_10rem_10rem_auto]"
        method="get"
      >
        <label className="relative block">
          <span className="sr-only">جست‌وجوی کاربر</span>
          <Search
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
            aria-hidden
          />
          <input
            name="q"
            defaultValue={filters.q}
            placeholder="نام، ایمیل یا شناسه کاربر"
            className="h-11 w-full rounded-lg border border-white/10 bg-[#08090d] pr-10 pl-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-amber-500/50"
          />
        </label>
        <select
          name="role"
          defaultValue={filters.role || "ALL"}
          aria-label="فیلتر نقش"
          className="h-11 rounded-lg border border-white/10 bg-[#08090d] px-3 text-sm text-white outline-none focus:border-amber-500/50"
        >
          <option value="ALL">همه نقش‌ها</option>
          <option value="USER">کاربر</option>
          <option value="ADMIN">مدیر</option>
        </select>
        <select
          name="status"
          defaultValue={filters.status || "ALL"}
          aria-label="فیلتر وضعیت"
          className="h-11 rounded-lg border border-white/10 bg-[#08090d] px-3 text-sm text-white outline-none focus:border-amber-500/50"
        >
          <option value="ALL">همه وضعیت‌ها</option>
          <option value="ACTIVE">فعال</option>
          <option value="DISABLED">غیرفعال</option>
        </select>
        <button
          type="submit"
          className="h-11 rounded-lg bg-amber-500 px-5 text-sm font-black text-black hover:bg-amber-400"
        >
          اعمال فیلتر
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#101117]">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3 xl:hidden">
          <p className="text-sm font-black text-white">نتایج</p>
          <span className="text-xs text-slate-500">
            {visibleUsers.length.toLocaleString("fa-IR")} کاربر
          </span>
        </div>
        <div className="hidden grid-cols-[minmax(14rem,1fr)_7rem_7rem_6rem_6rem_6rem_6rem] gap-3 border-b border-white/[0.08] px-4 py-3 text-xs font-black text-slate-500 xl:grid">
          <span>کاربر</span>
          <span>نقش</span>
          <span>وضعیت</span>
          <span>تماشا</span>
          <span>نشان شده</span>
          <span>ذخیره</span>
          <span />
        </div>

        <div className="divide-y divide-white/[0.08]">
          {visibleUsers.map((user) => {
            const progressCount = activityCounts.get(user.id)?.watch || 0;
            const favoriteCount = activityCounts.get(user.id)?.favorites || 0;

            return (
              <form
                key={user.id}
                action={updateUserAccessAction}
                className="grid gap-3 px-4 py-4 sm:grid-cols-2 xl:grid-cols-[minmax(14rem,1fr)_7rem_7rem_6rem_6rem_6rem_6rem] xl:items-center"
              >
                <input type="hidden" name="userId" value={user.id} />
                <div className="min-w-0 sm:col-span-2 xl:col-span-1">
                  <p className="truncate font-black text-white">
                    {user.name || "بدون نام"}
                  </p>
                  <p className="truncate text-sm text-slate-400">
                    {user.email}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(user.createdAt).toLocaleDateString("fa-IR")}
                  </p>
                </div>

                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-slate-500 xl:hidden">
                    نقش
                  </span>
                  <select
                    name="role"
                    defaultValue={user.role}
                    className="h-10 w-full rounded-lg border border-white/10 bg-[#08090d] px-3 text-sm text-white outline-none focus:border-amber-500/50"
                  >
                    <option value="USER">کاربر</option>
                    <option value="ADMIN">مدیر</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-slate-500 xl:hidden">
                    وضعیت
                  </span>
                  <select
                    name="status"
                    defaultValue={user.status}
                    className="h-10 w-full rounded-lg border border-white/10 bg-[#08090d] px-3 text-sm text-white outline-none focus:border-amber-500/50"
                  >
                    <option value="ACTIVE">فعال</option>
                    <option value="DISABLED">غیرفعال</option>
                  </select>
                </label>

                <div className="flex items-center gap-2 rounded-lg bg-white/[0.035] px-3 py-2 text-sm text-slate-300 xl:bg-transparent xl:px-0 xl:py-0">
                  <Eye className="size-4 text-sky-300" aria-hidden />
                  <span className="xl:hidden">تماشا:</span>{" "}
                  {progressCount.toLocaleString("fa-IR")}
                </div>

                <div className="flex items-center gap-2 rounded-lg bg-white/[0.035] px-3 py-2 text-sm text-slate-300 xl:bg-transparent xl:px-0 xl:py-0">
                  <Heart className="size-4 text-red-300" aria-hidden />
                  <span className="xl:hidden">نشان‌شده:</span>{" "}
                  {favoriteCount.toLocaleString("fa-IR")}
                </div>

                <button
                  type="submit"
                  className="h-10 rounded-lg bg-white/[0.08] px-4 text-sm font-black text-white transition-smooth hover:bg-amber-500 hover:text-black"
                >
                  ذخیره
                </button>

                <Link
                  href={`/admin/users/${encodeURIComponent(user.id)}`}
                  className="grid h-10 place-items-center rounded-lg border border-white/[0.08] text-sm font-black text-slate-300 transition-smooth hover:bg-white/[0.08] hover:text-white"
                >
                  جزئیات
                </Link>
              </form>
            );
          })}
          {!visibleUsers.length ? (
            <div className="px-4 py-12 text-center">
              <p className="font-bold text-slate-300">
                کاربری با این فیلتر پیدا نشد.
              </p>
              <Link
                href="/admin/users"
                className="mt-3 inline-block text-sm font-bold text-amber-300 hover:text-amber-200"
              >
                پاک کردن فیلترها
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
