"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MediaCard } from "@/components/media/MediaCard";
import type { HomeSection, MediaItem } from "@/lib/providers/types";

type SectionGridProps = {
  initialSection: HomeSection;
  providerCode: string;
  sectionId: string;
  sourceType?: string;
};

function mergeItems(current: MediaItem[], incoming: MediaItem[]) {
  const seen = new Set(current.map((item) => `${item.provider}:${item.type}:${item.id}`));
  return [
    ...current,
    ...incoming.filter((item) => {
      const key = `${item.provider}:${item.type}:${item.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  ];
}

export function SectionGrid({
  initialSection,
  providerCode,
  sectionId,
  sourceType,
}: SectionGridProps) {
  const [items, setItems] = useState(initialSection.items);
  const [page, setPage] = useState(initialSection.page || 1);
  const [hasMore, setHasMore] = useState(Boolean(initialSection.hasMore));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    setLoading(true);
    setError(undefined);

    try {
      const query = new URLSearchParams({
        page: String(page + 1),
        ...(sourceType ? { type: sourceType } : {}),
      });
      const response = await fetch(
        `/api/sections/${encodeURIComponent(providerCode)}/${encodeURIComponent(sectionId)}?${query}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as {
        section?: HomeSection;
        data?: { section?: HomeSection };
        error?: { message?: string };
      };
      if (!response.ok) {
        throw new Error(payload.error?.message || "بارگذاری ادامهٔ سکشن ناموفق بود.");
      }

      const next = payload.section || payload.data?.section;
      if (!next) {
        throw new Error("پاسخ سکشن معتبر نیست.");
      }

      setItems((current) => mergeItems(current, next.items));
      setPage(next.page || page + 1);
      setHasMore(Boolean(next.hasMore));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "بارگذاری ادامهٔ سکشن ناموفق بود.",
      );
    } finally {
      setLoading(false);
    }
  }, [hasMore, loading, page, providerCode, sectionId, sourceType]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMore();
        }
      },
      { rootMargin: "720px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {items.map((item) => (
          <MediaCard key={`${item.provider}-${item.type}-${item.id}`} item={item} />
        ))}
      </div>

      <div ref={sentinelRef} className="min-h-10 py-4 text-center text-sm text-slate-400" aria-live="polite">
        {loading ? "در حال بارگذاری فیلم‌های بیشتر…" : null}
        {error ? (
          <button
            type="button"
            onClick={() => void loadMore()}
            className="rounded-md border border-red-300/20 bg-red-300/10 px-4 py-2 text-red-100"
          >
            {error} تلاش دوباره
          </button>
        ) : null}
        {!loading && !error && hasMore ? "برای دیدن موارد بیشتر اسکرول کنید." : null}
      </div>
    </>
  );
}
