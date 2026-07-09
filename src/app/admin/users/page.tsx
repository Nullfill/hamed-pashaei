import Link from "next/link";
import { Eye, Heart } from "lucide-react";
import { updateUserAccessAction } from "@/app/admin/users/actions";
import { listFavorites, listWatchProgress } from "@/lib/activity/store";
import { listUsers } from "@/lib/auth/store";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const [users, allProgress, allFavorites] = await Promise.all([listUsers(), listWatchProgress(undefined, 500), listFavorites(undefined, 500)]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">کاربران</h1>
        <p className="mt-2 text-sm text-slate-400">نقش، وضعیت، تماشاها و علاقه‌مندی‌های هر حساب را کنترل کنید.</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#101117]">
        <div className="hidden grid-cols-[minmax(0,1fr)_8rem_8rem_7rem_7rem_8rem_6rem] gap-3 border-b border-white/[0.08] px-4 py-3 text-xs font-black text-slate-500 md:grid">
          <span>کاربر</span>
          <span>نقش</span>
          <span>وضعیت</span>
          <span>تماشا</span>
          <span>نشان شده</span>
          <span>ذخیره</span>
          <span />
        </div>

        <div className="divide-y divide-white/[0.08]">
          {users.map((user) => {
            const progressCount = allProgress.filter((item) => item.userId === user.id).length;
            const favoriteCount = allFavorites.filter((item) => item.userId === user.id).length;

            return (
              <form key={user.id} action={updateUserAccessAction} className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(0,1fr)_8rem_8rem_7rem_7rem_8rem_6rem] md:items-center">
                <input type="hidden" name="userId" value={user.id} />
                <div className="min-w-0">
                  <p className="truncate font-black text-white">{user.name || "بدون نام"}</p>
                  <p className="truncate text-sm text-slate-400">{user.email}</p>
                  <p className="mt-1 text-xs text-slate-500">{new Date(user.createdAt).toLocaleDateString("fa-IR")}</p>
                </div>

                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-slate-500 md:hidden">نقش</span>
                  <select name="role" defaultValue={user.role} className="h-10 w-full rounded-lg border border-white/10 bg-[#08090d] px-3 text-sm text-white outline-none focus:border-amber-500/50">
                    <option value="USER">کاربر</option>
                    <option value="ADMIN">مدیر</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-slate-500 md:hidden">وضعیت</span>
                  <select name="status" defaultValue={user.status} className="h-10 w-full rounded-lg border border-white/10 bg-[#08090d] px-3 text-sm text-white outline-none focus:border-amber-500/50">
                    <option value="ACTIVE">فعال</option>
                    <option value="DISABLED">غیرفعال</option>
                  </select>
                </label>

                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Eye className="size-4 text-sky-300" aria-hidden />
                  {progressCount.toLocaleString("fa-IR")}
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Heart className="size-4 text-red-300" aria-hidden />
                  {favoriteCount.toLocaleString("fa-IR")}
                </div>

                <button type="submit" className="h-10 rounded-lg bg-white/[0.08] px-4 text-sm font-black text-white transition-smooth hover:bg-amber-500 hover:text-black">
                  ذخیره
                </button>

                <Link href={`/admin/users/${encodeURIComponent(user.id)}`} className="grid h-10 place-items-center rounded-lg border border-white/[0.08] text-sm font-black text-slate-300 transition-smooth hover:bg-white/[0.08] hover:text-white">
                  جزئیات
                </Link>
              </form>
            );
          })}
        </div>
      </div>
    </div>
  );
}
