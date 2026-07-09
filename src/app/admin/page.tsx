import Link from "next/link";
import { Film, UserCheck, Users } from "lucide-react";
import { listUsers } from "@/lib/auth/store";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const users = await listUsers();
  const admins = users.filter((user) => user.role === "ADMIN").length;
  const activeUsers = users.filter((user) => user.status === "ACTIVE").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">پنل ادمین</h1>
        <p className="mt-2 text-sm text-slate-400">وضعیت کاربران و دسترسی‌های سایت</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.08] bg-[var(--surface)] p-5">
          <Users className="mb-4 size-6 text-amber-300" aria-hidden />
          <p className="text-3xl font-black text-white">{users.length}</p>
          <p className="mt-1 text-sm text-slate-400">کل کاربران</p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-[var(--surface)] p-5">
          <UserCheck className="mb-4 size-6 text-green-300" aria-hidden />
          <p className="text-3xl font-black text-white">{activeUsers}</p>
          <p className="mt-1 text-sm text-slate-400">کاربران فعال</p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-[var(--surface)] p-5">
          <Film className="mb-4 size-6 text-sky-300" aria-hidden />
          <p className="text-3xl font-black text-white">{admins}</p>
          <p className="mt-1 text-sm text-slate-400">مدیران</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-[var(--surface)] p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-white">مدیریت کاربران</h2>
            <p className="mt-1 text-sm text-slate-400">نقش و وضعیت حساب‌ها را کنترل کنید.</p>
          </div>
          <Link href="/admin/users" className="w-fit rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-black transition-smooth hover:bg-amber-400">
            مشاهده کاربران
          </Link>
        </div>
      </div>
    </div>
  );
}
