"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HeroSlider } from "@/components/media/HeroSlider";
import { SectionRail } from "@/components/media/SectionRail";
import type { HomeSection } from "@/lib/providers/types";

function alternateProviderSections(sections: HomeSection[]) {
  const providerOrder = ["shabforoosh", "gapfilm", "filimo"];
  const buckets = providerOrder.map((provider) =>
    sections.filter((section) => section.provider === provider),
  );
  const other = sections.filter((section) => !providerOrder.includes(section.provider || ""));
  const mixed: HomeSection[] = [];
  const max = Math.max(0, ...buckets.map((bucket) => bucket.length));

  for (let index = 0; index < max; index += 1) {
    for (const bucket of buckets) {
      if (bucket[index]) mixed.push(bucket[index]);
    }
  }

  return [...mixed, ...other];
}

function makeSingleBanner(sections: HomeSection[]): HomeSection | undefined {
  const source =
    sections.find((section) => section.items.some((item) => item.backdrop)) ??
    sections[0];
  const item =
    source?.items.find((media) => media.backdrop) ?? source?.items[0];
  if (!item) return undefined;
  return {
    id: "home-single-banner",
    title: "پیشنهاد ویژه",
    type: "rail",
    items: [item],
  };
}

export function HomeFeed({
  initialSections,
  totalSections,
}: {
  initialSections: HomeSection[];
  totalSections: number;
}) {
  const [sections, setSections] = useState(initialSections);
  const [total, setTotal] = useState(totalSections);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasMore = sections.length === 0 || sections.length < total;

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    setError(undefined);
    try {
      const response = await fetch(
        `/api/home?offset=${sections.length}&limit=6`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as {
        sections?: HomeSection[];
        total?: number;
        error?: string;
      };
      if (!response.ok)
        throw new Error(payload.error || "دریافت بخش‌های بیشتر ناموفق بود.");
      if (!payload.sections?.length && !payload.total)
        throw new Error("محتوا موقتاً در دسترس نیست؛ برای تلاش دوباره بزنید.");
      if (typeof payload.total === "number") setTotal(payload.total);
      setSections((current) => {
        const known = new Set(
          current.map(
            (section) => `${section.provider || "mixed"}:${section.id}`,
          ),
        );
        return [
          ...current,
          ...(payload.sections ?? []).filter(
            (section) =>
              !known.has(`${section.provider || "mixed"}:${section.id}`),
          ),
        ];
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "دریافت بخش‌های بیشتر ناموفق بود.",
      );
    } finally {
      setLoading(false);
    }
  }, [hasMore, loading, sections.length]);

  useEffect(() => {
    const element = sentinelRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void loadMore();
      },
      { rootMargin: "720px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [loadMore]);

  const view = useMemo(() => {
    const sliderSections = sections.filter(
      (section) => section.type === "slider",
    );
    const hero = sliderSections.length
      ? {
          id: "combined-featured",
          title: "ویژه",
          type: "slider" as const,
          items: sliderSections
            .flatMap((section) => section.items)
            .slice(0, 12),
        }
      : undefined;
    const rails = alternateProviderSections(
      sections.filter((section) => section.type === "rail"),
    );
    const topRails = rails.slice(0, 2);
    const banner = makeSingleBanner(rails.slice(2));
    const restRails = rails
      .slice(2)
      .filter((section) => section.items[0]?.id !== banner?.items[0]?.id);
    return { hero, rails, topRails, banner, restRails };
  }, [sections]);

  return (
    <>
      <HeroSlider section={view.hero} />
      {view.topRails.map((section, index) => (
        <SectionRail key={`${section.id}-${index}`} section={section} />
      ))}
      {view.banner ? <SectionRail section={view.banner} /> : null}
      {view.restRails.map((section, index) => (
        <SectionRail key={`${section.id}-rest-${index}`} section={section} />
      ))}
      {!view.rails.length && !loading ? (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-md border border-white/10 bg-[#15151f] p-8 text-center text-slate-400">
            بخشی برای نمایش پیدا نشد.
          </div>
        </section>
      ) : null}
      <div
        ref={sentinelRef}
        className="mx-auto flex min-h-20 max-w-7xl items-center justify-center px-4 pb-8"
        aria-live="polite"
      >
        {loading ? (
          <div className="flex items-center gap-3 text-sm text-slate-400">
            <span className="size-5 animate-spin rounded-full border-2 border-amber-500/30 border-t-amber-500" />
            در حال بارگذاری بخش‌های بیشتر...
          </div>
        ) : null}
        {error ? (
          <button
            type="button"
            onClick={() => void loadMore()}
            className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-200 hover:bg-red-500/15"
          >
            تلاش دوباره
          </button>
        ) : null}
      </div>
    </>
  );
}
