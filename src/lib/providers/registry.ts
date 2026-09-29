import type {
  BrowseInput,
  BrowseResult,
  HomeSection,
  MediaProvider,
  ProviderCategory,
  ProviderCountry,
  SearchResult,
} from "@/lib/providers/types";
import { unstable_cache } from "next/cache";
import { GapfilmProvider } from "@/lib/providers/gapfilm";
import { FilimoProvider } from "@/lib/providers/filimo";
import { ShabforooshProvider } from "@/lib/providers/shabforoosh";
import { SheydaProvider } from "@/lib/providers/sheyda";

export const providers = {
  shabforoosh: new ShabforooshProvider(),
  gapfilm: new GapfilmProvider(),
  filimo: new FilimoProvider(),
  sheyda: new SheydaProvider(),
};

export type ProviderId = keyof typeof providers;

const publicProviderIds = ["shabforoosh", "gapfilm", "filimo"] as const satisfies readonly ProviderId[];

const providerCodes: Record<ProviderId, string> = {
  shabforoosh: "a",
  gapfilm: "b",
  filimo: "c",
  sheyda: "d",
};

const codeProviders = Object.fromEntries(
  Object.entries(providerCodes).map(([provider, code]) => [code, provider]),
) as Record<string, ProviderId>;

export function getDefaultProvider() {
  return providers.shabforoosh;
}

export function getProvider(id?: string | null): MediaProvider {
  const normalized = id ? codeProviders[id] || id : undefined;
  if (normalized && normalized in providers) {
    return providers[normalized as ProviderId];
  }

  return getDefaultProvider();
}

export function toPublicProviderCode(id?: string): string | undefined {
  if (!id) {
    return undefined;
  }

  return providerCodes[id as ProviderId] || id;
}

export function fromPublicProviderCode(
  code?: string | null,
): ProviderId | undefined {
  if (!code) {
    return undefined;
  }

  return (
    codeProviders[code] ||
    (code in providers ? (code as ProviderId) : undefined)
  );
}

export function getAllProviders(): MediaProvider[] {
  return publicProviderIds.map((providerId) => providers[providerId]);
}

const cachedHomeSections = {
  shabforoosh: unstable_cache(
    () => providers.shabforoosh.getHomeSections(),
    ["home-sections-shabforoosh-v4"],
    { revalidate: 300 },
  ),
  gapfilm: unstable_cache(
    () => providers.gapfilm.getHomeSections(),
    ["home-sections-gapfilm-v3"],
    { revalidate: 300 },
  ),
  filimo: unstable_cache(
    () => providers.filimo.getHomeSections(),
    ["home-sections-filimo-v3"],
    { revalidate: 300 },
  ),
  sheyda: unstable_cache(
    () => providers.sheyda.getHomeSections(),
    ["home-sections-sheyda-v1"],
    { revalidate: 300 },
  ),
};

const cachedCatalogSections: Record<
  ProviderId,
  Record<BrowseInput["type"], () => Promise<HomeSection[]>>
> = {
  shabforoosh: {
    movie: unstable_cache(
      () => providers.shabforoosh.getCatalogSections?.("movie") ?? providers.shabforoosh.getHomeSections(),
      ["catalog-sections-shabforoosh-movie-v3"],
      { revalidate: 300 },
    ),
    series: unstable_cache(
      () => providers.shabforoosh.getCatalogSections?.("series") ?? providers.shabforoosh.getHomeSections(),
      ["catalog-sections-shabforoosh-series-v3"],
      { revalidate: 300 },
    ),
  },
  gapfilm: {
    movie: unstable_cache(
      () => providers.gapfilm.getCatalogSections?.("movie") ?? providers.gapfilm.getHomeSections(),
      ["catalog-sections-gapfilm-movie-v3"],
      { revalidate: 300 },
    ),
    series: unstable_cache(
      () => providers.gapfilm.getCatalogSections?.("series") ?? providers.gapfilm.getHomeSections(),
      ["catalog-sections-gapfilm-series-v3"],
      { revalidate: 300 },
    ),
  },
  filimo: {
    movie: unstable_cache(
      () => providers.filimo.getCatalogSections?.("movie") ?? providers.filimo.getHomeSections(),
      ["catalog-sections-filimo-movie-v3"],
      { revalidate: 300 },
    ),
    series: unstable_cache(
      () => providers.filimo.getCatalogSections?.("series") ?? providers.filimo.getHomeSections(),
      ["catalog-sections-filimo-series-v3"],
      { revalidate: 300 },
    ),
  },
  sheyda: {
    movie: unstable_cache(
      () => providers.sheyda.getCatalogSections("movie"),
      ["catalog-sections-sheyda-movie-v1"],
      { revalidate: 300 },
    ),
    series: unstable_cache(
      () => providers.sheyda.getCatalogSections("series"),
      ["catalog-sections-sheyda-series-v1"],
      { revalidate: 300 },
    ),
  },
};

function interleaveProviderSections(sections: HomeSection[]): HomeSection[] {
  const buckets = new Map<string, HomeSection[]>();
  for (const section of sections) {
    const key = section.provider || "mixed";
    buckets.set(key, [...(buckets.get(key) ?? []), section]);
  }
  const result: HomeSection[] = [];
  const providerOrder: readonly string[] = publicProviderIds;
  const max = Math.max(0, ...[...buckets.values()].map((bucket) => bucket.length));
  for (let index = 0; index < max; index += 1) {
    for (const provider of providerOrder) {
      const section = buckets.get(provider)?.[index];
      if (section) result.push(section);
    }
  }
  for (const [provider, bucket] of buckets) {
    if (!providerOrder.includes(provider)) result.push(...bucket);
  }
  return result;
}

export async function searchAllProviders(
  query: string,
): Promise<SearchResult[]> {
  const results = await Promise.allSettled(
    getAllProviders().map((provider) => provider.search(query)),
  );
  const buckets = results.map((result) =>
    result.status === "fulfilled" ? result.value : [],
  );
  const interleaved: SearchResult[] = [];
  const max = Math.max(0, ...buckets.map((bucket) => bucket.length));
  for (let index = 0; index < max; index += 1) {
    for (const bucket of buckets) {
      const item = bucket[index];
      if (item) interleaved.push(item);
    }
  }
  return interleaved;
}

export async function getAllHomeSections(): Promise<HomeSection[]> {
  const sections = await Promise.allSettled(
    publicProviderIds.map((providerId) => cachedHomeSections[providerId]()),
  );
  return withSectionHrefs(interleaveProviderSections(
    sections.flatMap((result) =>
      result.status === "fulfilled" ? result.value : [],
    ),
  ));
}

export async function getCatalogSections(
  type: BrowseInput["type"],
): Promise<HomeSection[]> {
  const sections = await Promise.allSettled(
    publicProviderIds.map((providerId) =>
      cachedCatalogSections[providerId][type](),
    ),
  );

  return withSectionHrefs(interleaveProviderSections(
    sections
      .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.type === type),
      }))
      .filter((section) => section.items.length),
  ));
}

function withSectionHrefs(sections: HomeSection[]): HomeSection[] {
  return sections.map((section) => ({
    ...section,
    href:
      section.provider && section.sourceId
        ? `/sections/${toPublicProviderCode(section.provider)}/${encodeURIComponent(section.sourceId)}${section.sourceType ? `?t=${encodeURIComponent(section.sourceType)}` : ""}`
        : section.href,
  }));
}

export async function browseAllProviders(
  input: BrowseInput,
): Promise<BrowseResult> {
  const countries = input.country ? await getAllCountries() : [];
  const results = await Promise.allSettled(
    getAllProviders()
      .map((provider) => ({
        provider,
        country: resolveCountryForProvider(
          countries,
          provider.id,
          input.country,
        ),
      }))
      .filter(({ country }) => !input.country || country)
      .map(({ provider, country }) => provider.browse({ ...input, country })),
  );
  const fulfilled = results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );
  const items = dedupeItems(fulfilled.flatMap((result) => result.items));

  return {
    items,
    page: input.page || 1,
    totalPages: Math.max(1, ...fulfilled.map((result) => result.totalPages)),
    perPage: items.length,
  };
}

export async function browseProvider(
  providerId: string,
  input: BrowseInput,
): Promise<BrowseResult> {
  const provider = getProvider(providerId);
  const countries = input.country ? await getAllCountries() : [];
  const country = resolveCountryForProvider(
    countries,
    provider.id,
    input.country,
  );

  if (input.country && !country) {
    return { items: [], page: input.page || 1, totalPages: 1, perPage: 0 };
  }

  return provider.browse({ ...input, country });
}

function normalizeCategoryLabel(label: string): string {
  return label
    .replace(/\s+/g, " ")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ـ-]/g, " ")
    .trim();
}

function categoryKey(label: string): string {
  return encodeURIComponent(
    normalizeCategoryLabel(label).toLowerCase().replace(/\s+/g, "-"),
  );
}

function countryKey(label: string): string {
  return categoryKey(label);
}

function dedupeItems(items: BrowseResult["items"]): BrowseResult["items"] {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = `${item.provider}:${item.type}:${item.id}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function splitCategoryKeys(keys?: string | string[] | null): string[] {
  const values = Array.isArray(keys) ? keys : (keys ?? "").split(",");
  return [...new Set(values.map((key) => key.trim()).filter(Boolean))];
}

function matchesCategory(category: ProviderCategory, key: string): boolean {
  const decoded = decodeURIComponent(key);
  return (
    category.key === key ||
    category.key === encodeURIComponent(decoded) ||
    category.movieId === key ||
    category.seriesId === key ||
    normalizeCategoryLabel(category.label) === normalizeCategoryLabel(decoded)
  );
}

async function loadAllCategories(): Promise<ProviderCategory[]> {
  const results = await Promise.allSettled(
    getAllProviders().map(async (provider) => {
      if (!provider.getCategories) {
        return [];
      }

      return provider.getCategories();
    }),
  );
  const raw = results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );
  const merged = new Map<string, ProviderCategory>();

  for (const category of raw) {
    const label = normalizeCategoryLabel(category.label);
    if (!label) {
      continue;
    }

    const key = categoryKey(label);
    const current = merged.get(key) ?? {
      provider: "mixed",
      key,
      label,
      sources: {},
    };
    current.movieId ||= category.movieId;
    current.seriesId ||= category.seriesId;
    current.sources ||= {};

    const currentSource = current.sources[category.provider] ?? {};
    currentSource.movieId ||= category.movieId;
    currentSource.seriesId ||= category.seriesId;
    current.sources[category.provider] = currentSource;

    merged.set(key, current);
  }

  return [...merged.values()].sort((a, b) =>
    a.label.localeCompare(b.label, "fa"),
  );
}

const cachedAllCategories = unstable_cache(
  loadAllCategories,
  ["provider-categories-v3"],
  { revalidate: 3600 },
);

export async function getAllCategories(): Promise<ProviderCategory[]> {
  return cachedAllCategories();
}

async function loadAllCountries(): Promise<ProviderCountry[]> {
  const results = await Promise.allSettled(
    getAllProviders().map(async (provider) => {
      if (!provider.getCountries) {
        return [];
      }

      return provider.getCountries();
    }),
  );
  const raw = results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );
  const merged = new Map<string, ProviderCountry>();

  for (const country of raw) {
    const label = normalizeCategoryLabel(country.label);
    if (!label) {
      continue;
    }

    const key = countryKey(label);
    const current = merged.get(key) ?? {
      provider: "mixed",
      key,
      label,
      value: label,
      sources: {},
    };
    current.englishLabel ||= country.englishLabel;
    current.sources ||= {};
    current.sources[country.provider] = {
      value: country.value,
      englishLabel: country.englishLabel,
    };

    merged.set(key, current);
  }

  return [...merged.values()].sort((a, b) =>
    a.label.localeCompare(b.label, "fa"),
  );
}

const cachedAllCountries = unstable_cache(
  loadAllCountries,
  ["provider-countries-v3"],
  { revalidate: 3600 },
);

export async function getAllCountries(): Promise<ProviderCountry[]> {
  return cachedAllCountries();
}

function matchesCountry(country: ProviderCountry, key: string): boolean {
  const decoded = decodeURIComponent(key);
  return (
    country.key === key ||
    country.key === encodeURIComponent(decoded) ||
    country.value === key ||
    normalizeCategoryLabel(country.label) === normalizeCategoryLabel(decoded)
  );
}

function resolveCountryForProvider(
  countries: ProviderCountry[],
  providerId: string,
  key?: string,
): string | undefined {
  if (!key) {
    return undefined;
  }

  const country = countries.find((item) => matchesCountry(item, key));
  return country?.sources?.[providerId]?.value;
}

export async function browseByCategoryKeys(
  input: BrowseInput & {
    categoryKeys?: string[] | string;
    source?: string | null;
  },
): Promise<BrowseResult> {
  const categoryKeys = splitCategoryKeys(input.categoryKeys);
  const source = fromPublicProviderCode(input.source) ?? undefined;

  if (!categoryKeys.length) {
    return source ? browseProvider(source, input) : browseAllProviders(input);
  }

  const categories = await getAllCategories();
  const selected = categoryKeys.flatMap((key) =>
    categories.filter((category) => matchesCategory(category, key)),
  );

  if (!selected.length) {
    return { items: [], page: input.page || 1, totalPages: 1, perPage: 0 };
  }

  const providerIds = source
    ? [source]
    : (Object.keys(providers) as ProviderId[]);
  const tasks: Array<Promise<BrowseResult>> = [];
  const callKeys = new Set<string>();
  const countries = input.country ? await getAllCountries() : [];

  for (const providerId of providerIds) {
    const country = resolveCountryForProvider(
      countries,
      providerId,
      input.country,
    );
    if (input.country && !country) {
      continue;
    }

    for (const category of selected) {
      const sourceIds = category.sources?.[providerId];
      const genres =
        input.type === "movie" ? sourceIds?.movieId : sourceIds?.seriesId;
      if (!genres) {
        continue;
      }

      const callKey = `${providerId}:${input.type}:${genres}`;
      if (callKeys.has(callKey)) {
        continue;
      }

      callKeys.add(callKey);
      tasks.push(
        getProvider(providerId).browse({
          ...input,
          genres,
          country,
        }),
      );
    }
  }

  if (!tasks.length) {
    return { items: [], page: input.page || 1, totalPages: 1, perPage: 0 };
  }

  const results = await Promise.allSettled(tasks);
  const fulfilled = results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );
  const items = dedupeItems(fulfilled.flatMap((result) => result.items));

  return {
    items,
    page: input.page || 1,
    totalPages: Math.max(1, ...fulfilled.map((result) => result.totalPages)),
    perPage: items.length,
  };
}

export async function getKidsSections(): Promise<HomeSection[]> {
  const [gapfilmKids, filimoKids] = await Promise.all([
    providers.gapfilm.getKidsSections?.().catch(() => []) ?? Promise.resolve([]),
    providers.filimo.getKidsSections?.().catch(() => []) ?? Promise.resolve([]),
  ]);
  const providerSections = [...gapfilmKids, ...filimoKids].map((section) => ({
    ...section,
    href:
      section.provider && section.sourceId
        ? `/sections/${toPublicProviderCode(section.provider)}/${encodeURIComponent(section.sourceId)}${section.sourceType ? `?t=${encodeURIComponent(section.sourceType)}` : ""}`
        : section.href,
  }));
  if (providerSections.length) return providerSections;

  const categories = await getAllCategories();
  const categoryKeys = categories
    .filter((category) => /انیمیشن|کودک|خانوادگی/.test(category.label))
    .map((category) => category.key);

  if (!categoryKeys.length) {
    return [];
  }

  const [movies, series] = await Promise.all([
    browseByCategoryKeys({ type: "movie", page: 1, categoryKeys }),
    browseByCategoryKeys({ type: "series", page: 1, categoryKeys }),
  ]);

  return [
    {
      id: "kids-movies",
      title: "فیلم‌های کودک و انیمیشن",
      type: "rail" as const,
      items: movies.items,
    },
    {
      id: "kids-series",
      title: "سریال‌های کودک و انیمیشن",
      type: "rail" as const,
      items: series.items,
    },
  ].filter((section) => section.items.length);
}

export async function getSection(
  providerCode: string,
  id: string,
  sourceType?: string,
  page?: number,
): Promise<HomeSection> {
  const provider = getProvider(providerCode);
  if (!provider.getSection) {
    throw new Error("Section is unavailable.");
  }

  const section = await provider.getSection({ id, sourceType, page });
  return {
    ...section,
    href: `/sections/${toPublicProviderCode(section.provider)}/${encodeURIComponent(section.sourceId || id)}${section.sourceType ? `?t=${encodeURIComponent(section.sourceType)}` : ""}`,
  };
}
