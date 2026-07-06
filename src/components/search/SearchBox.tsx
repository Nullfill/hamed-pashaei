"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";

export function SearchBox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams();
      if (query.trim()) {
        params.set("q", query.trim());
      }

      router.replace(`/search${params.toString() ? `?${params.toString()}` : ""}`);
    }, 450);

    return () => clearTimeout(timeout);
  }, [query, router]);

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute right-5 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        type="search"
        placeholder="نام فیلم یا سریال را وارد کنید..."
        className="h-16 w-full rounded-2xl border border-white/[0.08] bg-[var(--surface)] px-14 text-lg text-white outline-none transition-smooth placeholder:text-slate-500 hover:border-white/20 focus:border-amber-500/50 focus:bg-[var(--surface-soft)] focus:ring-4 focus:ring-amber-500/10"
      />
      {query && (
        <button
          onClick={() => setQuery("")}
          type="button"
          className="absolute left-5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition-smooth hover:bg-white/10 hover:text-white"
          aria-label="پاک کردن"
        >
          <X className="size-5" />
        </button>
      )}
    </div>
  );
}
