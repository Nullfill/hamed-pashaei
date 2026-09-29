import type {
  BrowseInput,
  BrowseResult,
  HomeSection,
  MediaDetails,
  MediaPath,
  MediaProvider,
  PlaybackData,
  PlaybackInput,
  ProviderCategory,
  ProviderCountry,
  SearchResult,
} from "@/lib/providers/types";
import { getDetailsPath } from "@/lib/utils/url";
import { ShabforooshClient } from "./client";
import { SHABFOROOSH_PROVIDER_ID } from "./normalizers";
import {
  parseDetails,
  parseArchiveMediaItems,
  parseHomeSections,
  parseMApiBrowse,
  parseMApiDetails,
  parseMApiEpisodePlayback,
  parseMApiHomeSections,
  parseMApiMoviePlayback,
  parseMApiSearchResults,
  parsePlayback,
  parseSearchResults,
} from "./parsers";

const SEARCH_PATHS = ["/search/?q=", "/search/?search=", "/?s="] as const;

function decodeSectionPath(id: string): string {
  return Buffer.from(id, "base64url").toString("utf8");
}

function encodeSectionPath(path: string): string {
  return Buffer.from(path, "utf8").toString("base64url");
}

function normalizeCategoryLabel(label: string): string {
  return label
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, " ")
    .replace(/[-–—_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTaxonomyLabel(label: string): string {
  return normalizeCategoryLabel(label).toLowerCase();
}

const GENRE_IDS_BY_NAME: Record<string, { movieId: string; seriesId?: string }> = {
  "\u0627\u0646\u06CC\u0645\u06CC\u0634\u0646": { movieId: "735", seriesId: "94519" },
  "\u0627\u0646\u06CC\u0645\u0647": { movieId: "195387", seriesId: "195658" },
  "\u0627\u06A9\u0634\u0646": { movieId: "29", seriesId: "108" },
  "\u062F\u0631\u0627\u0645": { movieId: "13", seriesId: "74" },
  "\u062A\u0631\u0633\u0646\u0627\u06A9": { movieId: "117202", seriesId: "169" },
  "\u062C\u0646\u06AF\u06CC": { movieId: "117205", seriesId: "94" },
  "\u06A9\u0645\u062F\u06CC": { movieId: "379", seriesId: "94526" },
  "\u0639\u0627\u0634\u0642\u0627\u0646\u0647": { movieId: "117181", seriesId: "187" },
  "\u0641\u0627\u0646\u062A\u0632\u06CC": { movieId: "129", seriesId: "178" },
  "\u0645\u0627\u062C\u0631\u0627\u062C\u0648\u06CC\u06CC": { movieId: "56", seriesId: "109" },
  "\u0645\u0648\u0632\u06CC\u06A9\u0627\u0644": { movieId: "1044", seriesId: "152658" },
  "\u0639\u0644\u0645\u06CC \u062a\u062e\u06CC\u0644\u06CC": { movieId: "520", seriesId: "110" },
  "\u0647\u06CC\u062C\u0627\u0646 \u0627\u0646\u06AF\u06CC\u0632": { movieId: "468", seriesId: "75" },
  "\u062C\u0646\u0627\u06CC\u06CC": { movieId: "21", seriesId: "73" },
  "\u0631\u0627\u0632\u0622\u0644\u0648\u062F": { movieId: "117203", seriesId: "117" },
  "\u062e\u0627\u0646\u0648\u0627\u062f\u06af\u06CC": { movieId: "772", seriesId: "94527" },
  "\u0645\u0633\u062a\u0646\u062f": { movieId: "117204", seriesId: "86" },
  "\u062a\u0627\u0631\u06cc\u062e\u06cc": { movieId: "47", seriesId: "93" },
  "\u0648\u0631\u0632\u0634\u06cc": { movieId: "1138", seriesId: "117209" },
  "\u0648\u0633\u062a\u0631\u0646": { movieId: "699", seriesId: "117210" },
  "\u0628\u06cc\u0648\u06af\u0631\u0627\u0641\u06cc": { movieId: "46", seriesId: "289" },
};

function genreNameFromPath(path: string): string | undefined {
  const match = path.match(/^\/(?:genre|seriegenre)\/([^/?#]+)\/?/);
  return match?.[1] ? normalizeCategoryLabel(decodeURIComponent(match[1]).replace(/-/g, " ")) : undefined;
}

function countryNameFromPath(path: string): string | undefined {
  const match = path.match(/^\/country\/([^/?#]+)\/?/);
  return match?.[1] ? normalizeCategoryLabel(decodeURIComponent(match[1]).replace(/-/g, " ")) : undefined;
}

export class ShabforooshProvider implements MediaProvider {
  readonly id = SHABFOROOSH_PROVIDER_ID;
  readonly name = "Shabforoosh";
  private readonly client = new ShabforooshClient();
  private categoriesCache?: Promise<ProviderCategory[]>;
  private countriesCache?: Promise<ProviderCountry[]>;
  private genreIdsCache?: Promise<Map<string, { movieId?: string; seriesId?: string }>>;

  async search(query: string): Promise<SearchResult[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      return [];
    }

    try {
      const url = new URL("/wp-json/mapi/v1/post/search", this.client.baseUrl);
      url.searchParams.set("search", cleanQuery);
      const jsonText = await this.client.get(url.toString());
      const results = parseMApiSearchResults(jsonText, this.client.baseUrl);

      if (results.length) {
        return results;
      }
    } catch {
      // Fall back to HTML candidates below.
    }

    for (const path of SEARCH_PATHS) {
      try {
        const html = await this.client.get(`${path}${encodeURIComponent(cleanQuery)}`);
        const results = parseSearchResults(html, this.client.baseUrl);

        if (results.length) {
          return results;
        }
      } catch {
        // Try the next known search URL shape.
      }
    }

    return [];
  }

  async getHomeSections(): Promise<HomeSection[]> {
    try {
      const jsonText = await this.client.get("/wp-json/mapi/v1/post/all");
      const sections = parseMApiHomeSections(jsonText, this.client.baseUrl);
      if (sections.length) {
        const suggestionsSection = sections.find((section) =>
          /پیشنهاد/.test(section.title),
        );
        if (suggestionsSection) {
          try {
            const suggestions = parseMApiBrowse(
              await this.client.get(
                "/wp-json/mapi/v1/post/suggestions?page=1&per_page=20",
              ),
              this.client.baseUrl,
            );
            const typeById = new Map(
              suggestions.items.map((item) => [item.id, item.type]),
            );
            suggestionsSection.items = suggestionsSection.items.map((item) => ({
              ...item,
              type: typeById.get(item.id) || item.type,
            }));
          } catch {
            // The home snapshot remains usable if the enrichment request fails.
          }
        }
        if (!sections.some((section) => /کارتون/.test(section.title))) {
          try {
            const cartoons = parseMApiBrowse(
              await this.client.get(
                "/wp-json/mapi/v1/post/cartoons?page=1&per_page=20",
              ),
              this.client.baseUrl,
            );
            if (cartoons.items.length) {
              sections.push({
                id: `${this.id}-mapi-cartoons`,
                title: "کارتون",
                type: "rail",
                items: cartoons.items,
                provider: this.id,
                sourceId: encodeSectionPath(
                  "/wp-json/mapi/v1/post/cartoons",
                ),
                sourceType: "mapi",
                page: cartoons.page,
                perPage: cartoons.perPage,
                totalPages: cartoons.totalPages,
                hasMore:
                  cartoons.page < cartoons.totalPages &&
                  cartoons.items.length > 0,
              });
            }
          } catch {
            // The main /post/all response remains usable without cartoons.
          }
        }
        return sections;
      }
    } catch {
      // The JSON endpoint is the primary source, but keep the legacy HTML
      // parser as a compatibility fallback for older deployments.
    }

    try {
      const html = await this.client.get("/");
      return parseHomeSections(html, this.client.baseUrl);
    } catch {
      return [];
    }
  }

  async getCatalogSections(type: "movie" | "series"): Promise<HomeSection[]> {
    const sections = await this.getHomeSections();

    const filtered = sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.type === type),
      }))
      .filter((section) => section.items.length);

    if (filtered.length) {
      return filtered;
    }

    // Some older mirrors do not expose /post/all.  Build a small, stable
    // catalogue from the provider's genre ids as a last-resort fallback.
    const ids = await this.getGenreIdsFromMApi().catch(() => new Map());
    const entries = new Map<string, string>();
    for (const [label, known] of Object.entries(GENRE_IDS_BY_NAME)) {
      const id = type === "series" ? known.seriesId : known.movieId;
      if (id) entries.set(label, id);
    }
    for (const [label, value] of ids) {
      const id = type === "series" ? value.seriesId : value.movieId;
      if (id) entries.set(label, id);
    }

    const results = await Promise.allSettled(
      [...entries].map(async ([label, genres]) => {
        const result = await this.browse({ type, genres, page: 1 });
        return {
          id: `${this.id}-genre-${type}-${genres}`,
          title: `${type === "movie" ? "فیلم‌های" : "سریال‌های"} ${label}`,
          type: "rail" as const,
          items: result.items,
          provider: this.id,
          sourceId: encodeSectionPath(
            `/wp-json/mapi/v1/post/${type === "movie" ? "movies" : "series"}?genres=${encodeURIComponent(genres)}`,
          ),
          sourceType: "mapi",
          page: result.page,
          perPage: result.perPage,
          totalPages: result.totalPages,
          hasMore: result.page < result.totalPages && result.items.length > 0,
        } satisfies HomeSection;
      }),
    );

    return results.flatMap((result) =>
      result.status === "fulfilled" && result.value.items.length
        ? [result.value]
        : [],
    );
  }

  async getCategories(): Promise<ProviderCategory[]> {
    this.categoriesCache ??= this.fetchCategories();
    return this.categoriesCache;
  }

  private async fetchCategories(): Promise<ProviderCategory[]> {
    const byLabel = new Map<string, ProviderCategory>();
    const add = (label: string, ids: { movieId?: string; seriesId?: string }) => {
      const normalized = normalizeTaxonomyLabel(label);
      if (!normalized || (!ids.movieId && !ids.seriesId)) return;
      const current = byLabel.get(normalized);
      byLabel.set(normalized, {
        provider: this.id,
        key: encodeURIComponent(label.toLowerCase().replace(/\s+/g, "-")),
        label: current?.label || label,
        movieId: current?.movieId || ids.movieId,
        seriesId: current?.seriesId || ids.seriesId,
      });
    };

    for (const [label, ids] of Object.entries(GENRE_IDS_BY_NAME)) {
      add(label, ids);
    }

    return [...byLabel.values()];
  }

  async getCountries() {
    this.countriesCache ??= this.fetchCountriesFromMApi();
    return this.countriesCache;
  }

  private async fetchCountriesFromMApi() {
    const countries = new Map<string, { id: string; name: string }>();
    const endpoints = ["movies", "series"] as const;
    const pages = [1, 2, 3, 4];

    await Promise.allSettled(
      endpoints.flatMap((endpoint) =>
        pages.map(async (page) => {
          const text = await this.client.get(`/wp-json/mapi/v1/post/${endpoint}?page=${page}&per_page=50`);
          const payload = JSON.parse(text) as {
            data?: Array<{ countries?: Array<{ id?: number | string; name?: string }> }>;
          };

          for (const item of payload.data ?? []) {
            for (const country of item.countries ?? []) {
              const id = country.id ? String(country.id) : "";
              const name = normalizeCategoryLabel(country.name ?? "");

              if (id && name && !/^(unknown|ناشناخته)$/i.test(name)) {
                countries.set(name, { id, name });
              }
            }
          }
        }),
      ),
    );

    return [...countries.values()].map((country) => ({
      provider: this.id,
      key: encodeURIComponent(country.name.toLowerCase().replace(/\s+/g, "-")),
      label: country.name,
      value: country.id,
    }));
  }

  async browse(input: BrowseInput): Promise<BrowseResult> {
    const endpoint = input.type === "movie" ? "/wp-json/mapi/v1/post/movies" : "/wp-json/mapi/v1/post/series";
    const url = new URL(endpoint, this.client.baseUrl);
    url.searchParams.set("page", String(input.page || 1));

    if (input.genres) {
      url.searchParams.set("genres", input.genres);
    }

    if (input.country) {
      url.searchParams.set("country", input.country);
    }

    if (input.dubbed) {
      url.searchParams.set("dubbed", "1");
    }

    if (input.subtitle) {
      url.searchParams.set("subtitle", "1");
    }

    const jsonText = await this.client.get(url.toString());
    return parseMApiBrowse(jsonText, this.client.baseUrl);
  }

  async getDetails(input: MediaPath): Promise<MediaDetails> {
    try {
      const jsonText = await this.client.get(`/wp-json/mapi/v1/post/${encodeURIComponent(input.id)}`);
      return parseMApiDetails(jsonText, this.client.baseUrl, {
        id: input.id,
        type: input.type,
      });
    } catch {
      // HTML fallback keeps older/sluggish posts accessible.
    }

    const sourcePath = input.sourcePath || getDetailsPath(input.type, input.id);
    const html = await this.client.get(sourcePath);
    return parseDetails(html, this.client.baseUrl, {
      id: input.id,
      type: input.type,
      sourcePath,
    });
  }

  async getPlayback(input: PlaybackInput): Promise<PlaybackData> {
    if (input.type === "movie") {
      try {
        const jsonText = await this.client.get(`/wp-json/mapi/v1/post/${encodeURIComponent(input.id)}`);
        const playback = parseMApiMoviePlayback(jsonText);
        if (playback.sources.length) {
          return playback;
        }
      } catch {
        // HTML fallback below.
      }
    }

    if (input.type === "series" && input.season && input.episode) {
      try {
        const jsonText = await this.client.get(
          `/wp-json/mapi/v1/post/${encodeURIComponent(input.id)}/season/${encodeURIComponent(input.season)}/episode/${encodeURIComponent(input.episode)}`,
        );
        const playback = parseMApiEpisodePlayback(jsonText);
        if (playback.sources.length) {
          return playback;
        }
      } catch {
        // HTML fallback below.
      }
    }

    const encodedId = encodeURIComponent(input.id);
    const dubbed = encodeURIComponent(input.dubbed ?? "0");
    const candidates = [
      `/play/${encodedId}`,
      `/play/${encodedId}/`,
      `/play/${encodedId}/?dubbed=${dubbed}`,
      `/play/${encodedId}?dubbed=${dubbed}`,
    ];
    let lastError: unknown;
    let reachedPlaybackPage = false;

    for (const path of candidates) {
      try {
        const html = await this.client.get(path);
        reachedPlaybackPage = true;
        const playback = parsePlayback(html, this.client.baseUrl);

        if (playback.sources.length) {
          return playback;
        }
      } catch (error) {
        lastError = error;
      }
    }

    if (reachedPlaybackPage) {
      return { sources: [] };
    }

    if (lastError) {
      throw lastError;
    }

    return { sources: [] };
  }

  private async getMApiSection(
    url: URL,
    input: { id: string; sourceType?: string; page?: number },
  ): Promise<HomeSection | undefined> {
    const match = url.pathname.match(/^\/wp-json\/mapi\/v1\/post\/([^/]+)\/?$/i);
    const endpoint = match?.[1]?.toLowerCase();
    if (!endpoint || !["movies", "series", "cartoons", "suggestions"].includes(endpoint)) {
      return undefined;
    }

    const page = Math.max(1, input.page || 1);
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", "20");
    const result = parseMApiBrowse(
      await this.client.get(url.toString()),
      this.client.baseUrl,
    );
    const title =
      endpoint === "series"
        ? "سریال‌ها"
        : endpoint === "cartoons"
          ? "کارتون‌ها"
          : endpoint === "movies"
          ? "فیلم‌ها"
          : "پیشنهادها";

    return {
      id: `${this.id}-${input.id}`,
      title,
      type: "rail",
      provider: this.id,
      sourceId: input.id,
      sourceType: input.sourceType || "mapi",
      items: result.items,
      page: result.page,
      perPage: result.perPage,
      totalPages: result.totalPages,
      hasMore: result.page < result.totalPages && result.items.length > 0,
    };
  }

  async getSection(input: { id: string; sourceType?: string; page?: number }): Promise<HomeSection> {
    const path = decodeSectionPath(input.id);
    const url = new URL(path, this.client.baseUrl);
    const mapiSection = await this.getMApiSection(url, input);
    if (mapiSection) {
      return mapiSection;
    }
    const genreName = genreNameFromPath(url.pathname);

    if (genreName) {
      const ids = await this.resolveGenreIds(genreName);
      const type = input.sourceType === "genre-series" || url.pathname.startsWith("/seriegenre/") ? "series" : "movie";
      const genres = type === "series" ? ids?.seriesId || ids?.movieId : ids?.movieId;

      if (genres) {
        const result = await this.browse({ type, genres, page: input.page || 1 });
        return {
          id: `${this.id}-${input.id}`,
          title: `${type === "movie" ? "\u0641\u06CC\u0644\u0645\u200C\u0647\u0627\u06CC" : "\u0633\u0631\u06CC\u0627\u0644\u200C\u0647\u0627\u06CC"} ${genreName}`,
          type: "rail",
          provider: this.id,
          sourceId: input.id,
          sourceType: input.sourceType || "genre-movie",
          items: result.items,
          page: result.page,
          perPage: result.perPage,
          totalPages: result.totalPages,
          hasMore: result.page < result.totalPages && result.items.length > 0,
        };
      }
    }

    const countryName = countryNameFromPath(url.pathname);
    if (countryName) {
      const country = await this.resolveCountry(countryName);
      const type = input.sourceType === "country-series" ? "series" : "movie";

      if (country?.value) {
        const result = await this.browse({ type, country: country.value, page: input.page || 1 });
        return {
          id: `${this.id}-${input.id}`,
          title: `${type === "movie" ? "\u0641\u06CC\u0644\u0645\u200C\u0647\u0627\u06CC" : "\u0633\u0631\u06CC\u0627\u0644\u200C\u0647\u0627\u06CC"} ${countryName}`,
          type: "rail",
          provider: this.id,
          sourceId: input.id,
          sourceType: input.sourceType || "country-movie",
          items: result.items,
          page: result.page,
          perPage: result.perPage,
          totalPages: result.totalPages,
          hasMore: result.page < result.totalPages && result.items.length > 0,
        };
      }
    }

    const contentType = url.searchParams.get("type");
    const sectionType = contentType === "series" ? "series" : contentType === "movies" || contentType === "movie" ? "movie" : undefined;

    if (sectionType) {
      const result = await this.browse({ type: sectionType, page: input.page || 1 });
      return {
        id: `${this.id}-${input.id}`,
        title: sectionType === "movie" ? "\u0641\u06CC\u0644\u0645\u200C\u0647\u0627" : "\u0633\u0631\u06CC\u0627\u0644\u200C\u0647\u0627",
        type: "rail",
        provider: this.id,
        sourceId: input.id,
        sourceType: "path",
        items: result.items,
        page: result.page,
        perPage: result.perPage,
        totalPages: result.totalPages,
        hasMore: result.page < result.totalPages && result.items.length > 0,
      };
    }

    if (input.page && input.page > 1) {
      url.searchParams.set("page", String(input.page));
    }

    const html = await this.client.get(`${url.pathname}${url.search}`);
    const archiveItems = parseArchiveMediaItems(html, this.client.baseUrl);
    if (archiveItems.length) {
      return {
        id: `${this.id}-${input.id}`,
        title: "\u0641\u06CC\u0644\u0645 \u0648 \u0633\u0631\u06CC\u0627\u0644",
        type: "rail",
        provider: this.id,
        sourceId: input.id,
        sourceType: "path",
        items: archiveItems,
      };
    }

    const sections = parseHomeSections(html, this.client.baseUrl).filter((section) => section.items.length);
    const first = sections.find((section) => section.type === "rail") ?? sections[0];

    if (first) {
      return {
        ...first,
        provider: this.id,
        sourceId: input.id,
        sourceType: "path",
      };
    }

    const results = parseSearchResults(html, this.client.baseUrl);
    return {
      id: `${this.id}-${input.id}`,
      title: "\u0641\u06CC\u0644\u0645 \u0648 \u0633\u0631\u06CC\u0627\u0644",
      type: "rail",
      provider: this.id,
      sourceId: input.id,
      sourceType: "path",
      items: results.map((item) => ({
        provider: item.provider,
        id: item.id,
        type: item.type,
        title: item.titleFa || item.titleEn || item.id,
        titleFa: item.titleFa,
        titleEn: item.titleEn,
        poster: item.poster,
        rating: item.imdb,
        badges: item.badges,
        sourcePath: item.sourcePath,
      })),
    };
  }

  private async resolveGenreIds(name: string) {
    const normalizedName = normalizeTaxonomyLabel(name);
    const sampled = await this.getGenreIdsFromMApi().catch(() => new Map<string, { movieId?: string; seriesId?: string }>());
    const sampledIds = sampled.get(normalizedName);
    if (sampledIds?.movieId || sampledIds?.seriesId) {
      return sampledIds;
    }

    const known = Object.entries(GENRE_IDS_BY_NAME).find(
      ([label]) => normalizeTaxonomyLabel(label) === normalizedName,
    )?.[1];
    if (known) {
      return known;
    }

    const categories = await this.getCategories().catch(() => []);
    const category = categories.find((item) => normalizeTaxonomyLabel(item.label) === normalizedName);
    if (!category) {
      return undefined;
    }

    return {
      movieId: category.movieId || category.seriesId || "",
      seriesId: category.seriesId || category.movieId,
    };
  }

  private async getGenreIdsFromMApi() {
    this.genreIdsCache ??= this.fetchGenreIdsFromMApi();
    return this.genreIdsCache;
  }

  private async fetchGenreIdsFromMApi() {
    const genres = new Map<string, { movieId?: string; seriesId?: string }>();
    const endpoints = ["movies", "series"] as const;
    const pages = [1, 2, 3, 4, 5, 6];

    await Promise.allSettled(
      endpoints.flatMap((endpoint) =>
        pages.map(async (page) => {
          const text = await this.client.get(`/wp-json/mapi/v1/post/${endpoint}?page=${page}&per_page=50`);
          const payload = JSON.parse(text) as {
            data?: Array<{ genres?: Array<{ id?: number | string; name?: string }> }>;
          };

          for (const item of payload.data ?? []) {
            for (const genre of item.genres ?? []) {
              const id = genre.id ? String(genre.id) : "";
              const key = normalizeTaxonomyLabel(genre.name ?? "");
              if (!id || !key) {
                continue;
              }

              const current = genres.get(key) ?? {};
              if (endpoint === "movies") {
                current.movieId = id;
              } else {
                current.seriesId = id;
              }
              genres.set(key, current);
            }
          }
        }),
      ),
    );

    return genres;
  }

  private async resolveCountry(name: string) {
    const normalizedName = normalizeTaxonomyLabel(name);
    const countries = await this.getCountries().catch(() => []);
    return countries.find((country) => normalizeTaxonomyLabel(country.label) === normalizedName);
  }
}
