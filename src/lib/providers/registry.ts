import type { BrowseInput, BrowseResult, HomeSection, MediaProvider, ProviderCategory, SearchResult } from "@/lib/providers/types";
import { GapfilmProvider } from "@/lib/providers/gapfilm";
import { ShabforooshProvider } from "@/lib/providers/shabforoosh";

export const providers = {
  shabforoosh: new ShabforooshProvider(),
  gapfilm: new GapfilmProvider(),
};

export type ProviderId = keyof typeof providers;

const providerCodes: Record<ProviderId, string> = {
  shabforoosh: "a",
  gapfilm: "b",
};

const codeProviders = Object.fromEntries(Object.entries(providerCodes).map(([provider, code]) => [code, provider])) as Record<string, ProviderId>;

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

export function fromPublicProviderCode(code?: string | null): ProviderId | undefined {
  if (!code) {
    return undefined;
  }

  return codeProviders[code] || (code in providers ? (code as ProviderId) : undefined);
}

export function getAllProviders(): MediaProvider[] {
  return Object.values(providers);
}

export async function searchAllProviders(query: string): Promise<SearchResult[]> {
  const results = await Promise.allSettled(getAllProviders().map((provider) => provider.search(query)));
  return results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
}

export async function getAllHomeSections(): Promise<HomeSection[]> {
  const sections = await Promise.allSettled(getAllProviders().map((provider) => provider.getHomeSections()));
  return sections
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .map((section) => ({
      ...section,
      href:
        section.provider && section.sourceId
          ? `/sections/${toPublicProviderCode(section.provider)}/${encodeURIComponent(section.sourceId)}${section.sourceType ? `?t=${encodeURIComponent(section.sourceType)}` : ""}`
          : section.href,
    }));
}

export async function browseAllProviders(input: BrowseInput): Promise<BrowseResult> {
  const results = await Promise.allSettled(getAllProviders().map((provider) => provider.browse(input)));
  const fulfilled = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
  const items = dedupeItems(fulfilled.flatMap((result) => result.items));

  return {
    items,
    page: input.page || 1,
    totalPages: Math.max(1, ...fulfilled.map((result) => result.totalPages)),
    perPage: items.length,
  };
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
  return encodeURIComponent(normalizeCategoryLabel(label).toLowerCase().replace(/\s+/g, "-"));
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

export async function getAllCategories(): Promise<ProviderCategory[]> {
  const results = await Promise.allSettled(
    getAllProviders().map(async (provider) => {
      if (!provider.getCategories) {
        return [];
      }

      return provider.getCategories();
    }),
  );
  const raw = results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const merged = new Map<string, ProviderCategory>();

  for (const category of raw) {
    const label = normalizeCategoryLabel(category.label);
    if (!label) {
      continue;
    }

    const key = categoryKey(label);
    const current = merged.get(key) ?? { provider: "mixed", key, label, sources: {} };
    current.movieId ||= category.movieId;
    current.seriesId ||= category.seriesId;
    current.sources ||= {};

    const currentSource = current.sources[category.provider] ?? {};
    currentSource.movieId ||= category.movieId;
    currentSource.seriesId ||= category.seriesId;
    current.sources[category.provider] = currentSource;

    merged.set(key, current);
  }

  return [...merged.values()].sort((a, b) => a.label.localeCompare(b.label, "fa"));
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
    return source ? getProvider(source).browse(input) : browseAllProviders(input);
  }

  const categories = await getAllCategories();
  const selected = categoryKeys.flatMap((key) => categories.filter((category) => matchesCategory(category, key)));

  if (!selected.length) {
    return { items: [], page: input.page || 1, totalPages: 1, perPage: 0 };
  }

  const providerIds = source ? [source] : (Object.keys(providers) as ProviderId[]);
  const tasks: Array<Promise<BrowseResult>> = [];
  const callKeys = new Set<string>();

  for (const providerId of providerIds) {
    for (const category of selected) {
      const sourceIds = category.sources?.[providerId];
      const genres = input.type === "movie" ? sourceIds?.movieId : sourceIds?.seriesId;
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
        }),
      );
    }
  }

  if (!tasks.length) {
    return { items: [], page: input.page || 1, totalPages: 1, perPage: 0 };
  }

  const results = await Promise.allSettled(tasks);
  const fulfilled = results.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
  const items = dedupeItems(fulfilled.flatMap((result) => result.items));

  return {
    items,
    page: input.page || 1,
    totalPages: Math.max(1, ...fulfilled.map((result) => result.totalPages)),
    perPage: items.length,
  };
}

export async function getKidsSections(): Promise<HomeSection[]> {
  const categories = await getAllCategories();
  const categoryKeys = categories.filter((category) => /انیمیشن|کودک|خانوادگی/.test(category.label)).map((category) => category.key);

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

export async function getSection(providerCode: string, id: string, sourceType?: string, page?: number): Promise<HomeSection> {
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
