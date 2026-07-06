"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { BrowseResult, MediaType, ProviderCategory } from "@/lib/providers/types";
import { MediaCard } from "@/components/media/MediaCard";
import { COUNTRIES } from "@/lib/constants/catalog";

type Filters = {
  source?: string;
  cats: string[];
  genres?: string;
  country?: string;
  dubbed: boolean;
  subtitle: boolean;
  page: number;
};

const sourceToProvider: Record<string, string> = {
  a: "shabforoosh",
  b: "gapfilm",
};

function splitValues(value?: string): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildParams(type: MediaType, filters: Filters) {
  const params = new URLSearchParams();
  params.set("type", type);

  if (filters.page > 1) {
    params.set("page", String(filters.page));
  }

  if (filters.source) {
    params.set("src", filters.source);
  }

  if (filters.cats.length) {
    params.set("cats", filters.cats.join(","));
  } else if (filters.genres) {
    params.set("genres", filters.genres);
  }

  if (filters.country) {
    params.set("country", filters.country);
  }

  if (filters.dubbed) {
    params.set("dubbed", "1");
  }

  if (filters.subtitle) {
    params.set("subtitle", "1");
  }

  return params;
}

function supportsCategory(category: ProviderCategory, type: MediaType, source?: string) {
  const provider = source ? sourceToProvider[source] : undefined;
  if (provider) {
    const sourceIds = category.sources?.[provider];
    return Boolean(type === "movie" ? sourceIds?.movieId : sourceIds?.seriesId);
  }

  return Object.values(category.sources ?? {}).some((sourceIds) => Boolean(type === "movie" ? sourceIds.movieId : sourceIds.seriesId));
}

function filterCategories(categories: ProviderCategory[] | undefined, type: MediaType, source?: string) {
  return (categories ?? []).filter((category) => supportsCategory(category, type, source));
}

export function BrowseView({
  title,
  description,
  result,
  type,
  page,
  genres,
  selectedCategories,
  country,
  dubbed,
  subtitle,
  provider,
  categories,
}: {
  title: string;
  description: string;
  result: BrowseResult;
  type: MediaType;
  page: number;
  genres?: string;
  selectedCategories?: string;
  country?: string;
  dubbed?: boolean;
  subtitle?: boolean;
  provider?: string;
  categories?: ProviderCategory[];
}) {
  const router = useRouter();
  const basePath = type === "movie" ? "/movies" : "/series";
  const initialSource = provider === "gapfilm" ? "b" : provider === "shabforoosh" ? "a" : provider;
  const [filters, setFilters] = useState<Filters>({
    source: initialSource,
    cats: splitValues(selectedCategories),
    genres,
    country,
    dubbed: Boolean(dubbed),
    subtitle: Boolean(subtitle),
    page,
  });
  const [browseResult, setBrowseResult] = useState(result);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const visibleCategories = useMemo(() => filterCategories(categories, type, filters.source), [categories, filters.source, type]);

  async function applyFilters(nextFilters: Filters) {
    setFilters(nextFilters);
    setLoading(true);
    setError(undefined);

    const apiParams = buildParams(type, nextFilters);
    const pageParams = new URLSearchParams(apiParams);
    pageParams.delete("type");

    router.replace(`${basePath}${pageParams.toString() ? `?${pageParams.toString()}` : ""}`, { scroll: false });

    try {
      const response = await fetch(`/api/browse?${apiParams.toString()}`, { cache: "no-store" });
      const data = (await response.json()) as BrowseResult & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "خطا در دریافت فهرست.");
      }

      setBrowseResult(data);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "خطا در دریافت فهرست.");
      setBrowseResult({ items: [], page: nextFilters.page, totalPages: 1, perPage: 0 });
    } finally {
      setLoading(false);
    }
  }

  function toggleCategory(key: string) {
    const cats = filters.cats.includes(key) ? filters.cats.filter((item) => item !== key) : [...filters.cats, key];
    void applyFilters({ ...filters, cats, genres: undefined, page: 1 });
  }

  function setSource(source?: string) {
    const supportedCategories = filters.cats.filter((key) => {
      const category = categories?.find((item) => item.key === key);
      return category ? supportsCategory(category, type, source) : false;
    });

    void applyFilters({ ...filters, source, cats: supportedCategories, page: 1 });
  }

  function setCountry(value?: string) {
    void applyFilters({ ...filters, country: filters.country === value ? undefined : value, page: 1 });
  }

  function setToggle(key: "dubbed" | "subtitle") {
    void applyFilters({ ...filters, [key]: !filters[key], page: 1 });
  }

  function setPage(nextPage: number) {
    void applyFilters({ ...filters, page: nextPage });
  }

  const sourceButtonClass = (active: boolean) =>
    `rounded-xl border px-4 py-2.5 text-sm font-medium transition-smooth ${
      active
        ? "border-amber-500 bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/30"
        : "border-white/[0.08] bg-white/[0.04] text-slate-300 hover:border-amber-500/30 hover:bg-white/[0.08]"
    }`;
  const chipClass = (active: boolean) =>
    `rounded-xl border px-4 py-2.5 text-sm font-medium transition-smooth ${
      active
        ? "border-amber-500 bg-amber-500/20 text-amber-400"
        : "border-white/[0.08] bg-white/[0.04] text-slate-300 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
    }`;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-3">
        <h1 className="text-4xl font-black text-white">{title}</h1>
        <p className="max-w-3xl text-lg text-slate-400">{description}</p>
      </div>

      {/* Quick Filters */}
      <div className="mb-6 rounded-2xl border border-white/[0.08] bg-[var(--surface)] p-5">
        <div className="flex flex-wrap gap-2">
          <button type="button" className={sourceButtonClass(!filters.source)} onClick={() => setSource(undefined)}>
            همه محتواها
          </button>
          <button type="button" className={sourceButtonClass(filters.source === "a")} onClick={() => setSource("a")}>
            بدون سانسور
          </button>
          <button type="button" className={sourceButtonClass(filters.source === "b")} onClick={() => setSource("b")}>
            سانسور شده
          </button>
          <button type="button" className={chipClass(filters.dubbed)} onClick={() => setToggle("dubbed")}>
            دوبله فارسی
          </button>
          <button type="button" className={chipClass(filters.subtitle)} onClick={() => setToggle("subtitle")}>
            زیرنویس فارسی
          </button>
          <button
            type="button"
            className={chipClass(!filters.cats.length && !filters.country && !filters.dubbed && !filters.subtitle)}
            onClick={() => applyFilters({ source: filters.source, cats: [], dubbed: false, subtitle: false, page: 1 })}
          >
            پاک کردن فیلترها
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="mb-10 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
        <div>
          <h2 className="mb-4 text-lg font-bold text-white">ژانرها</h2>
          <div className="max-h-48 overflow-y-auto rounded-2xl border border-white/[0.08] bg-[var(--surface)] p-4">
            <div className="flex flex-wrap gap-2">
              {visibleCategories.map((category) => (
                <button
                  key={category.key}
                  type="button"
                  className={chipClass(filters.cats.includes(category.key))}
                  onClick={() => toggleCategory(category.key)}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <h2 className="mb-4 text-lg font-bold text-white">کشورها</h2>
          <div className="rounded-2xl border border-white/[0.08] bg-[var(--surface)] p-4">
            <div className="flex flex-wrap gap-2">
              {COUNTRIES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={chipClass(filters.country === item.id)}
                  onClick={() => setCountry(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="relative min-h-96">
        {loading ? (
          <div className="absolute inset-0 z-10 grid place-items-center rounded-2xl bg-[var(--background)]/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="size-10 animate-spin rounded-full border-4 border-amber-500/30 border-t-amber-500" />
              <p className="text-sm text-slate-300">در حال دریافت...</p>
            </div>
          </div>
        ) : null}
        {browseResult.items.length ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {browseResult.items.map((item) => (
              <MediaCard key={`${item.provider}-${item.type}-${item.id}`} item={item} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.08] bg-[var(--surface)] p-12 text-center">
            <p className="text-slate-400">موردی پیدا نشد.</p>
            <p className="mt-2 text-sm text-slate-500">لطفاً فیلترهای دیگری را امتحان کنید</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="mt-10 flex items-center justify-center gap-3">
        <button
          type="button"
          disabled={filters.page <= 1 || loading}
          onClick={() => setPage(filters.page - 1)}
          className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-slate-300 transition-smooth hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
        >
          قبلی
        </button>
        <span className="rounded-xl border border-white/[0.08] bg-[var(--surface)] px-5 py-2.5 text-sm font-medium text-white">
          صفحه {browseResult.page} از {browseResult.totalPages}
        </span>
        <button
          type="button"
          disabled={filters.page >= browseResult.totalPages || loading}
          onClick={() => setPage(filters.page + 1)}
          className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-slate-300 transition-smooth hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
        >
          بعدی
        </button>
      </div>
    </section>
  );
}
