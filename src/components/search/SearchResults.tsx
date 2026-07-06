"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, Search as SearchIcon } from "lucide-react";
import type { SearchResult } from "@/lib/providers/types";
import { MediaCard } from "@/components/media/MediaCard";

export function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q")?.trim() ?? "";
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!query) {
      setResults([]);
      setError(undefined);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(undefined);

    fetch(`/api/search?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = (await response.json()) as { results?: SearchResult[]; error?: string };
        if (!response.ok) {
          throw new Error(payload.error || "جستجو ناموفق بود.");
        }

        setResults(payload.results ?? []);
      })
      .catch((searchError: unknown) => {
        if (!controller.signal.aborted) {
          setError(searchError instanceof Error ? searchError.message : "خطای جستجو رخ داد.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [query]);

  if (!query) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-[var(--surface)] p-12 text-center">
        <div className="mx-auto flex max-w-md flex-col items-center gap-4">
          <div className="grid size-20 place-items-center rounded-2xl bg-amber-500/10">
            <SearchIcon className="size-10 text-amber-500" />
          </div>
          <p className="text-lg text-slate-300">برای شروع جستجو، نام محتوا را وارد کنید</p>
          <p className="text-sm text-slate-500">می‌توانید نام فیلم، سریال یا بازیگر را جستجو کنید</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="size-5 animate-spin text-amber-500" />
          <p>در حال جستجو...</p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="skeleton aspect-[2/3] rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center">
        <p className="text-red-200">{error}</p>
      </div>
    );
  }

  if (!results.length) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-[var(--surface)] p-12 text-center">
        <div className="mx-auto flex max-w-md flex-col items-center gap-4">
          <div className="grid size-20 place-items-center rounded-2xl bg-white/5">
            <SearchIcon className="size-10 text-slate-500" />
          </div>
          <p className="text-lg text-slate-300">نتیجه‌ای پیدا نشد</p>
          <p className="text-sm text-slate-500">لطفاً با کلمات کلیدی دیگری جستجو کنید</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-slate-400">
        <span className="font-bold text-white">{results.length}</span> نتیجه برای{" "}
        <span className="font-bold text-amber-400">&quot;{query}&quot;</span>
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {results.map((item) => (
          <MediaCard key={`${item.provider}-${item.type}-${item.id}`} item={item} />
        ))}
      </div>
    </div>
  );
}
