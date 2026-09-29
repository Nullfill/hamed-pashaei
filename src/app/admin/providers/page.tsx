import { Network, Route, ShieldCheck, ShieldX } from "lucide-react";
import { getProviderProxyStatus } from "@/lib/http/providerProxy";
import { updateProviderProxyAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProviderSettingsPage() {
  const status = await getProviderProxyStatus();
  const active = status.enabled && status.configured;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">تنظیمات Providerها</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">مسیر خروجی درخواست‌های API سرویس‌های محتوایی را مدیریت کنید.</p>
      </div>
      <div className="rounded-2xl border border-white/[0.08] bg-[#101117] p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <div className={`grid size-12 shrink-0 place-items-center rounded-xl ${active ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-500/15 text-slate-300"}`}>
              {active ? <ShieldCheck className="size-6" /> : <ShieldX className="size-6" />}
            </div>
            <div>
              <h2 className="text-lg font-black text-white">پراکسی درخواست‌های Provider</h2>
              <p className="mt-1 text-sm leading-6 text-slate-400">{active ? "درخواست‌ها از پراکسی تنظیم‌شده عبور می‌کنند." : "درخواست‌ها مستقیماً از سرور فعلی ارسال می‌شوند."}</p>
            </div>
          </div>
          <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-black ${active ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-500/15 text-slate-300"}`}>{active ? "فعال" : "غیرفعال"}</span>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
            <Network className="size-5 text-amber-300" />
            <div><p className="text-xs text-slate-500">تنظیم پراکسی در سرور</p><p className="mt-1 text-sm font-bold text-white">{status.configured ? "موجود" : "تنظیم نشده"}</p></div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
            <Route className="size-5 text-sky-300" />
            <div><p className="text-xs text-slate-500">مسیر فعلی</p><p className="mt-1 text-sm font-bold text-white">{active ? "Proxy" : "Direct"}</p></div>
          </div>
        </div>
        {!status.configured && <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm leading-6 text-amber-200">متغیر محیطی PROVIDER_HTTP_PROXY تنظیم نشده است؛ تا زمان تنظیم آن، روشن‌کردن این گزینه اثری ندارد.</p>}
        <form action={updateProviderProxyAction} className="mt-6">
          <input type="hidden" name="enabled" value={active ? "0" : "1"} />
          <button type="submit" disabled={!status.configured && !active} className={`rounded-lg px-5 py-2.5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${active ? "bg-red-500/15 text-red-200 hover:bg-red-500/25" : "bg-amber-500 text-black hover:bg-amber-400"}`}>
            {active ? "غیرفعال‌کردن پراکسی" : "فعال‌کردن پراکسی"}
          </button>
        </form>
      </div>
    </div>
  );
}
