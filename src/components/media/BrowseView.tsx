"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Filter,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type {
  BrowseResult,
  MediaType,
  ProviderCategory,
  ProviderCountry,
} from "@/lib/providers/types";
import { MediaCard } from "@/components/media/MediaCard";

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

  if (filters.page > 1) params.set("page", String(filters.page));
  if (filters.source) params.set("src", filters.source);
  if (filters.cats.length) params.set("cats", filters.cats.join(","));
  else if (filters.genres) params.set("genres", filters.genres);
  if (filters.country) params.set("country", filters.country);
  if (filters.dubbed) params.set("dubbed", "1");
  if (filters.subtitle) params.set("subtitle", "1");

  return params;
}

function supportsCategory(
  category: ProviderCategory,
  type: MediaType,
  source?: string,
) {
  const provider = source ? sourceToProvider[source] : undefined;
  if (provider) {
    const sourceIds = category.sources?.[provider];
    return Boolean(type === "movie" ? sourceIds?.movieId : sourceIds?.seriesId);
  }

  return Object.values(category.sources ?? {}).some((sourceIds) =>
    Boolean(type === "movie" ? sourceIds.movieId : sourceIds.seriesId),
  );
}

function filterCategories(
  categories: ProviderCategory[] | undefined,
  type: MediaType,
  source?: string,
) {
  return (categories ?? []).filter((category) =>
    supportsCategory(category, type, source),
  );
}

function supportsCountry(country: ProviderCountry, source?: string) {
  const provider = source ? sourceToProvider[source] : undefined;
  if (provider) {
    return Boolean(country.sources?.[provider]?.value);
  }

  return Object.values(country.sources ?? {}).some((sourceValue) =>
    Boolean(sourceValue.value),
  );
}

function filterCountries(
  countries: ProviderCountry[] | undefined,
  source?: string,
) {
  return (countries ?? []).filter((country) =>
    supportsCountry(country, source),
  );
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
  countries,
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
  countries?: ProviderCountry[];
}) {
  const router = useRouter();
  const basePath = type === "movie" ? "/movies" : "/series";
  const initialSource =
    provider === "gapfilm" ? "b" : provider === "shabforoosh" ? "a" : provider;
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
  const [filtersOpen, setFiltersOpen] = useState(
    Boolean(selectedCategories || country || dubbed || subtitle),
  );
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showAllCountries, setShowAllCountries] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [countryQuery, setCountryQuery] = useState("");
  const [openGroup, setOpenGroup] = useState<"categories" | "countries">(
    "categories",
  );

  const visibleCategories = useMemo(
    () => filterCategories(categories, type, filters.source),
    [categories, filters.source, type],
  );
  const visibleCountries = useMemo(
    () => filterCountries(countries, filters.source),
    [countries, filters.source],
  );
  const selectedCategoryLabels = visibleCategories
    .filter((category) => filters.cats.includes(category.key))
    .map((category) => category.label);
  const selectedCountry = visibleCountries.find(
    (item) => item.key === filters.country,
  );
  const activeFilterCount =
    filters.cats.length +
    Number(Boolean(filters.country)) +
    Number(filters.dubbed) +
    Number(filters.subtitle);
  const categoryItems = useMemo(() => {
    const filtered = visibleCategories.filter((item) =>
      item.label
        .toLocaleLowerCase("fa")
        .includes(categoryQuery.trim().toLocaleLowerCase("fa")),
    );
    return showAllCategories ? filtered : filtered.slice(0, 18);
  }, [categoryQuery, showAllCategories, visibleCategories]);
  const countryItems = useMemo(() => {
    const filtered = visibleCountries.filter((item) =>
      item.label
        .toLocaleLowerCase("fa")
        .includes(countryQuery.trim().toLocaleLowerCase("fa")),
    );
    return showAllCountries ? filtered : filtered.slice(0, 18);
  }, [countryQuery, showAllCountries, visibleCountries]);

  async function applyFilters(nextFilters: Filters) {
    setFilters(nextFilters);
    setLoading(true);
    setError(undefined);

    const apiParams = buildParams(type, nextFilters);
    const pageParams = new URLSearchParams(apiParams);
    pageParams.delete("type");

    router.replace(
      `${basePath}${pageParams.toString() ? `?${pageParams.toString()}` : ""}`,
      { scroll: false },
    );

    try {
      const response = await fetch(`/api/browse?${apiParams.toString()}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as BrowseResult & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "خطا در دریافت فهرست.");
      }

      setBrowseResult(data);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "خطا در دریافت فهرست.",
      );
      setBrowseResult({
        items: [],
        page: nextFilters.page,
        totalPages: 1,
        perPage: 0,
      });
    } finally {
      setLoading(false);
    }
  }

  function toggleCategory(key: string) {
    const cats = filters.cats.includes(key)
      ? filters.cats.filter((item) => item !== key)
      : [...filters.cats, key];
    void applyFilters({ ...filters, cats, genres: undefined, page: 1 });
  }

  function setCountry(value?: string) {
    void applyFilters({
      ...filters,
      country: filters.country === value ? undefined : value,
      page: 1,
    });
  }

  function setToggle(key: "dubbed" | "subtitle") {
    void applyFilters({ ...filters, [key]: !filters[key], page: 1 });
  }

  function setPage(nextPage: number) {
    void applyFilters({ ...filters, page: nextPage });
  }

  const chipClass = (active: boolean) =>
    `rounded-lg border px-3 py-2 text-sm font-medium transition-smooth ${
      active
        ? "border-amber-500 bg-amber-500/20 text-amber-400"
        : "border-white/[0.08] bg-white/[0.04] text-slate-300 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
    }`;
  const compactButtonClass = (active: boolean) =>
    `inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition-smooth ${
      active
        ? "border-amber-500 bg-white/[0.08] text-amber-300"
        : "border-white/[0.08] bg-white/[0.04] text-slate-300 hover:border-white/20 hover:bg-white/[0.08]"
    }`;
  const clearFilters = () =>
    applyFilters({
      source: filters.source,
      cats: [],
      dubbed: false,
      subtitle: false,
      page: 1,
    });

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-3">
        <h1 className="text-4xl font-black text-white">{title}</h1>
        <p className="max-w-3xl text-lg text-slate-400">{description}</p>
      </div>

      <div className="sticky top-20 z-40 mb-6 overflow-hidden rounded-2xl border border-white/[0.1] bg-[var(--surface)]/95 shadow-2xl shadow-black/35 backdrop-blur-xl">
        <div className="flex flex-col gap-3 p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <button
              type="button"
              className={compactButtonClass(filters.dubbed)}
              onClick={() => setToggle("dubbed")}
            >
              دوبله فارسی
            </button>
            <button
              type="button"
              className={compactButtonClass(filters.subtitle)}
              onClick={() => setToggle("subtitle")}
            >
              زیرنویس فارسی
            </button>
            <button
              type="button"
              className={`${compactButtonClass(filtersOpen)} col-span-2 justify-center sm:col-span-1`}
              onClick={() => setFiltersOpen((value) => !value)}
            >
              <SlidersHorizontal className="size-4" aria-hidden />
              فیلترهای بیشتر
              {activeFilterCount ? (
                <span className="grid size-5 place-items-center rounded-full bg-amber-500 text-[11px] text-black">
                  {activeFilterCount}
                </span>
              ) : null}
              <ChevronDown
                className={`size-4 transition-smooth ${filtersOpen ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>
            {activeFilterCount ? (
              <button
                type="button"
                className={`${compactButtonClass(false)} col-span-2 justify-center sm:col-span-1`}
                onClick={clearFilters}
              >
                <RotateCcw className="size-4" aria-hidden />
                پاک کردن
              </button>
            ) : null}
          </div>
        </div>

        {activeFilterCount ? (
          <div className="flex flex-wrap gap-2 border-t border-white/[0.06] px-3 py-2.5 text-xs text-slate-300 sm:px-4">
            {selectedCategoryLabels.map((label) => (
              <span
                key={label}
                className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-amber-200"
              >
                {label}
              </span>
            ))}
            {selectedCountry ? (
              <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-amber-200">
                {selectedCountry.label}
              </span>
            ) : null}
            {filters.dubbed ? (
              <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-amber-200">
                دوبله
              </span>
            ) : null}
            {filters.subtitle ? (
              <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-amber-200">
                زیرنویس
              </span>
            ) : null}
          </div>
        ) : null}

        {filtersOpen ? (
          <div className="border-t border-white/[0.08] p-3 sm:p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setOpenGroup("categories")}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-black transition-smooth ${openGroup === "categories" ? "border-amber-500/50 bg-amber-500/10 text-amber-200" : "border-white/[0.08] bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"}`}
              >
                <span className="flex items-center gap-2">
                  <Filter className="size-4" aria-hidden />
                  ژانر
                </span>
                <ChevronDown
                  className={`size-4 transition-smooth ${openGroup === "categories" ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>
              <button
                type="button"
                onClick={() => setOpenGroup("countries")}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-black transition-smooth ${openGroup === "countries" ? "border-amber-500/50 bg-amber-500/10 text-amber-200" : "border-white/[0.08] bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"}`}
              >
                <span>کشور سازنده</span>
                <ChevronDown
                  className={`size-4 transition-smooth ${openGroup === "countries" ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>
            </div>

            {openGroup === "categories" ? (
              <div className="mt-3 rounded-xl border border-white/[0.07] bg-black/10 p-3">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500">
                    چند ژانر را هم‌زمان انتخاب کنید
                  </p>
                  <div className="flex items-center gap-2">
                    <label className="relative block">
                      <Search
                        className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-500"
                        aria-hidden
                      />
                      <input
                        value={categoryQuery}
                        onChange={(event) =>
                          setCategoryQuery(event.target.value)
                        }
                        placeholder="جست‌وجوی ژانر"
                        className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.04] pr-8 pl-3 text-xs text-white outline-none focus:border-amber-500/50 sm:w-44"
                      />
                    </label>
                    {visibleCategories.length > 18 ? (
                      <button
                        type="button"
                        className="text-xs font-bold text-amber-300"
                        onClick={() => setShowAllCategories((value) => !value)}
                      >
                        {showAllCategories ? "کمتر" : "همه"}
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto pr-1">
                  {categoryItems.map((categoryItem) => (
                    <button
                      key={categoryItem.key}
                      type="button"
                      className={chipClass(
                        filters.cats.includes(categoryItem.key),
                      )}
                      onClick={() => toggleCategory(categoryItem.key)}
                    >
                      {categoryItem.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-white/[0.07] bg-black/10 p-3">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-500">
                    کشور تولیدکننده را انتخاب کنید
                  </p>
                  <div className="flex items-center gap-2">
                    <label className="relative block">
                      <Search
                        className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-500"
                        aria-hidden
                      />
                      <input
                        value={countryQuery}
                        onChange={(event) =>
                          setCountryQuery(event.target.value)
                        }
                        placeholder="جست‌وجوی کشور"
                        className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.04] pr-8 pl-3 text-xs text-white outline-none focus:border-amber-500/50 sm:w-44"
                      />
                    </label>
                    {visibleCountries.length > 18 ? (
                      <button
                        type="button"
                        className="text-xs font-bold text-amber-300"
                        onClick={() => setShowAllCountries((value) => !value)}
                      >
                        {showAllCountries ? "کمتر" : "همه"}
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto pr-1">
                  {countryItems.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className={chipClass(filters.country === item.key)}
                      onClick={() => setCountry(item.key)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-200">
          <button
            type="button"
            className="float-left text-red-100"
            onClick={() => setError(undefined)}
            aria-label="بستن"
          >
            <X className="size-4" aria-hidden />
          </button>
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
              <MediaCard
                key={`${item.provider}-${item.type}-${item.id}`}
                item={item}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.08] bg-[var(--surface)] p-12 text-center">
            <p className="text-slate-400">موردی پیدا نشد.</p>
            <p className="mt-2 text-sm text-slate-500">
              لطفا فیلترهای دیگری را امتحان کنید.
            </p>
          </div>
        )}
      </div>

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
