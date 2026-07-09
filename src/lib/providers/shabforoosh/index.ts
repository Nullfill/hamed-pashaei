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
  parseMApiMoviePlayback,
  parseMApiSearchResults,
  parsePlayback,
  parseSearchResults,
} from "./parsers";

const SEARCH_PATHS = ["/search/?q=", "/search/?search=", "/?s="] as const;

function decodeSectionPath(id: string): string {
  return Buffer.from(id, "base64url").toString("utf8");
}

function normalizeCategoryLabel(label: string): string {
  return label.replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/\s+/g, " ").trim();
}

function normalizeTaxonomyLabel(label: string): string {
  return normalizeCategoryLabel(label).replace(/-/g, " ").toLowerCase();
}

const GENRE_IDS_BY_NAME: Record<string, { movieId: string; seriesId?: string }> = {
  "\u0627\u0646\u06CC\u0645\u06CC\u0634\u0646": { movieId: "2", seriesId: "73" },
  "\u0627\u06A9\u0634\u0646": { movieId: "29", seriesId: "108" },
  "\u062F\u0631\u0627\u0645": { movieId: "13", seriesId: "74" },
  "\u062A\u0631\u0633\u0646\u0627\u06A9": { movieId: "22", seriesId: "94" },
  "\u062C\u0646\u06AF\u06CC": { movieId: "34", seriesId: "91" },
  "\u06A9\u0645\u062F\u06CC": { movieId: "379", seriesId: "379" },
  "\u0639\u0627\u0634\u0642\u0627\u0646\u0647": { movieId: "117181", seriesId: "117181" },
  "\u0641\u0627\u0646\u062A\u0632\u06CC": { movieId: "178", seriesId: "178" },
  "\u0645\u0627\u062C\u0631\u0627\u062C\u0648\u06CC\u06CC": { movieId: "56", seriesId: "109" },
  "\u0645\u0648\u0632\u06CC\u06A9\u0627\u0644": { movieId: "1044", seriesId: "1044" },
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
    const html = await this.client.get("/");
    return parseHomeSections(html, this.client.baseUrl);
  }

  async getCatalogSections(type: "movie" | "series"): Promise<HomeSection[]> {
    const sections = await this.getHomeSections();

    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.type === type),
      }))
      .filter((section) => section.items.length);
  }

  async getCategories(): Promise<ProviderCategory[]> {
    this.categoriesCache ??= this.fetchCategories();
    return this.categoriesCache;
  }

  private async fetchCategories(): Promise<ProviderCategory[]> {
    const text = await this.client.get("/wp-json/wp/v2/categories?per_page=100");
    const payload = JSON.parse(text) as { data?: Array<{ id?: number; name?: string; count?: number }> } | Array<{ id?: number; name?: string; count?: number }>;
    const categories = Array.isArray(payload) ? payload : payload.data ?? [];

    const wpCategories = categories
      .filter((category) => category.id && category.name && (category.count ?? 0) > 0)
      .map((category) => {
        const label = normalizeCategoryLabel(category.name ?? "");
        return {
          provider: this.id,
          key: encodeURIComponent(label.toLowerCase().replace(/\s+/g, "-")),
          label,
          movieId: String(category.id),
          seriesId: String(category.id),
        };
      });

    const knownGenres = Object.entries(GENRE_IDS_BY_NAME).map(([label, ids]) => ({
      provider: this.id,
      key: encodeURIComponent(label.toLowerCase().replace(/\s+/g, "-")),
      label,
      movieId: ids.movieId,
      seriesId: ids.seriesId,
    }));

    return [...knownGenres, ...wpCategories];
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

  async getSection(input: { id: string; sourceType?: string; page?: number }): Promise<HomeSection> {
    const path = decodeSectionPath(input.id);
    const url = new URL(path, this.client.baseUrl);
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

    const known = GENRE_IDS_BY_NAME[name];
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
