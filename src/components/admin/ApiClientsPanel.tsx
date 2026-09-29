"use client";

import { FormEvent, useEffect, useState } from "react";

type ApiClient = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  status: "ACTIVE" | "REVOKED";
  rateLimit: number;
  lastUsedAt?: string;
};

export function ApiClientsPanel() {
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState("catalog:read,playback:read,profile:read,profile:write");
  const [rateLimit, setRateLimit] = useState("120");
  const [newKey, setNewKey] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/admin/api-clients", { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json();
    setClients(payload.data?.clients || []);
  }

  useEffect(() => { void load(); }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(undefined);
    setNewKey(undefined);
    const response = await fetch("/api/admin/api-clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, scopes: scopes.split(",").map((item) => item.trim()).filter(Boolean), rateLimit: Number(rateLimit) || 120 }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(payload.error?.message || "ساخت API Client انجام نشد.");
    else { setNewKey(payload.data?.apiKey); setName(""); setMessage("کلید ساخته شد؛ آن را همین حالا در اختیار برنامه‌نویس قرار دهید."); await load(); }
    setBusy(false);
  }

  async function revoke(id: string) {
    if (!window.confirm("این دسترسی لغو شود؟")) return;
    await fetch(`/api/admin/api-clients?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="grid gap-3 rounded-xl border border-white/[0.08] bg-[#101117] p-4 lg:grid-cols-[1.3fr_2fr_8rem_auto]">
        <input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} placeholder="نام اپلیکیشن" className="h-11 rounded-lg border border-white/10 bg-[#08090d] px-3 text-sm text-white outline-none focus:border-amber-500/50" />
        <input value={scopes} onChange={(event) => setScopes(event.target.value)} placeholder="Scopeها با کاما جدا شوند" className="h-11 rounded-lg border border-white/10 bg-[#08090d] px-3 text-sm text-white outline-none focus:border-amber-500/50" />
        <input value={rateLimit} onChange={(event) => setRateLimit(event.target.value)} type="number" min={1} max={10000} placeholder="Rate limit" className="h-11 rounded-lg border border-white/10 bg-[#08090d] px-3 text-sm text-white outline-none focus:border-amber-500/50" />
        <button disabled={busy} className="h-11 rounded-lg bg-amber-500 px-5 text-sm font-black text-black disabled:opacity-50">ساخت کلید</button>
      </form>

      {message ? <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">{message}</p> : null}
      {newKey ? <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4"><p className="mb-2 text-sm font-bold text-amber-200">کلید را کپی کنید؛ دوباره نمایش داده نمی‌شود.</p><code className="block break-all rounded bg-black/30 p-3 text-sm text-white">{newKey}</code></div> : null}

      <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#101117]">
        <table className="w-full min-w-[44rem] text-right text-sm">
          <thead className="border-b border-white/[0.08] text-xs text-slate-500"><tr><th className="p-4">نام</th><th className="p-4">Prefix</th><th className="p-4">Scope</th><th className="p-4">وضعیت</th><th className="p-4">آخرین استفاده</th><th className="p-4" /></tr></thead>
          <tbody className="divide-y divide-white/[0.08]">
            {clients.map((client) => <tr key={client.id}><td className="p-4 font-bold text-white">{client.name}</td><td className="p-4 font-mono text-slate-300">{client.keyPrefix}…</td><td className="max-w-sm p-4 text-xs text-slate-400">{client.scopes.join(", ")}</td><td className="p-4"><span className={client.status === "ACTIVE" ? "text-emerald-300" : "text-red-300"}>{client.status === "ACTIVE" ? "فعال" : "لغوشده"}</span></td><td className="p-4 text-xs text-slate-400">{client.lastUsedAt ? new Date(client.lastUsedAt).toLocaleString("fa-IR") : "—"}</td><td className="p-4">{client.status === "ACTIVE" ? <button onClick={() => revoke(client.id)} className="rounded-lg bg-red-500/10 px-3 py-2 text-xs font-bold text-red-200 hover:bg-red-500/20">لغو دسترسی</button> : null}</td></tr>)}
            {!clients.length ? <tr><td colSpan={6} className="p-8 text-center text-slate-500">هنوز API Client ساخته نشده است.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

