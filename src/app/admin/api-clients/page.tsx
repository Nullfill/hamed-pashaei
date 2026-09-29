import { ApiClientsPanel } from "@/components/admin/ApiClientsPanel";

export const dynamic = "force-dynamic";

export default function AdminApiClientsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">دسترسی اپلیکیشن</h1>
        <p className="mt-2 text-sm text-slate-400">برای اپلیکیشن موبایل کلید بسازید، Scope تعیین کنید و در صورت نیاز دسترسی را لغو کنید.</p>
      </div>
      <ApiClientsPanel />
    </div>
  );
}

