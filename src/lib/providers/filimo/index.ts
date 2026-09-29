import type {
  BrowseInput,
  BrowseResult,
  HomeSection,
  MediaDetails,
  MediaPath,
  MediaProvider,
  PlaybackData,
  PlaybackInput,
  SearchResult,
} from "@/lib/providers/types";
import { FilimoClient } from "./client";
import {
  collectMediaItems,
  FILIMO_PROVIDER_ID,
  parseCategories,
  parseDetails,
  parseEpisodes,
  parseHomeSections,
  parsePlayback,
  parseSearch,
  parseSectionPage,
  parseSeasons,
} from "./parsers";

function proxiedMediaUrl(url: string): string {
  return `/api/provider-media?url=${encodeURIComponent(url)}`;
}

async function expandHlsQualities(playback: PlaybackData): Promise<PlaybackData> {
  if (playback.sources.length !== 1) return playback;
  const source = playback.sources[0];
  if (!source.type?.toLowerCase().includes("mpegurl")) return playback;
  const upstream = new URL(source.src, "http://localhost").searchParams.get("url");
  if (!upstream) return playback;

  try {
    const response = await fetch(upstream, {
      headers: {
        Accept: "application/vnd.apple.mpegurl,*/*",
        Referer: "https://www.filimo.com/",
        "User-Agent": "Mozilla/5.0",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return playback;
    const lines = (await response.text()).split(/\r?\n/);
    const variants = lines.flatMap((line, index) => {
      if (!line.startsWith("#EXT-X-STREAM-INF:")) return [];
      const next = lines[index + 1]?.trim();
      if (!next || next.startsWith("#")) return [];
      const resolution = line.match(/RESOLUTION=\d+x(\d+)/i)?.[1];
      const bandwidth = line.match(/BANDWIDTH=(\d+)/i)?.[1];
      return [{
        src: proxiedMediaUrl(new URL(next, response.url || upstream).toString()),
        type: "application/vnd.apple.mpegurl",
        quality: resolution || (bandwidth ? `${Math.round(Number(bandwidth) / 1000)}k` : undefined),
        dubbed: source.dubbed,
      }];
    });
    return variants.length ? { ...playback, sources: variants } : playback;
  } catch {
    return playback;
  }
}

function forwardLink(payload: unknown): string | undefined {
  const links = (payload as { links?: { forward?: unknown } } | undefined)?.links;
  return typeof links?.forward === "string" && links.forward
    ? links.forward
    : undefined;
}

function dedupeSections(sections: HomeSection[]): HomeSection[] {
  const seen = new Set<string>();
  return sections.filter((section) => {
    const key = `${section.sourceId || section.id}:${section.sourceType || ""}:${section.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeItems(items: HomeSection["items"]): HomeSection["items"] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.provider}:${item.type}:${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function nextLoadmoreUrl(url: string | undefined, page: number): string | undefined {
  if (!url) return undefined;
  return url.replace(/\/page\/\d+(?=\/|$)/, `/page/${page}`);
}

function listOffsetUrl(url: string, offset: number): string | undefined {
  return /\/list_offset\/\d+(?=\/|$)/.test(url)
    ? url.replace(/\/list_offset\/\d+(?=\/|$)/, `/list_offset/${offset}`)
    : undefined;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export class FilimoProvider implements MediaProvider {
  readonly id = FILIMO_PROVIDER_ID;
  readonly name = "Filimo";
  private readonly client = new FilimoClient();

  async search(query: string): Promise<SearchResult[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];
    const payload = await this.client.requestJson<unknown>(
      `/movie/movie/list/tagid/1000300/text/${encodeURIComponent(cleanQuery)}`,
    );
    return parseSearch(payload);
  }

  async getHomeSections(): Promise<HomeSection[]> {
    const payloads = await this.getAllListPages("1");
    return dedupeSections(
      payloads.flatMap((payload) => parseHomeSections(payload)),
    );
  }

  async getCatalogSections(type: "movie" | "series"): Promise<HomeSection[]> {
    // Filimo maintains separate, paginated section registries for movies and
    // series.  The home registry is editorial and does not contain all rows.
    const tagId = type === "movie" ? "1000" : "1001";
    const payloads = await this.getAllListPages(tagId);
    return dedupeSections(
      payloads
        .flatMap((payload) => parseHomeSections(payload))
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => item.type === type),
        }))
        .filter((section) => section.items.length),
    );
  }

  private async getAllListPages(
    tagId: string,
    perPage = 10,
  ): Promise<unknown[]> {
    const requestPage = async (path: string): Promise<unknown> => {
      let lastError: unknown;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          return await this.client.requestJson<unknown>(path);
        } catch (error) {
          lastError = error;
          if (attempt < 2) {
            await wait(250 * (attempt + 1));
          }
        }
      }
      throw lastError instanceof Error
        ? lastError
        : new Error("Filimo page request failed.");
    };

    const pages: unknown[] = [];
    const visited = new Set<string>();
    let path = `/movie/movie/list/tagid/${encodeURIComponent(tagId)}/list_perpage/${perPage}/list_offset/0`;

    // The provider currently exposes fewer than ten pages for its largest
    // registries, but keep a generous guard so a malformed cursor cannot
    // create an unbounded loop.
    for (let batchIndex = 0; batchIndex < 100 && path; batchIndex += 1) {
      const firstPath = path;
      if (visited.has(firstPath)) break;
      visited.add(firstPath);
      const firstPayload = await requestPage(firstPath);
      pages.push(firstPayload);
      const forward = forwardLink(firstPayload);
      if (!forward) break;

      const batchPaths = [forward];
      const firstOffset = Number(forward.match(/\/list_offset\/(\d+)/)?.[1]);
      if (Number.isFinite(firstOffset)) {
        for (let index = 1; index < 4; index += 1) {
          const sibling = listOffsetUrl(forward, firstOffset + index * perPage);
          if (sibling && !visited.has(sibling)) {
            visited.add(sibling);
            batchPaths.push(sibling);
          }
        }
      }

      // Keep the batch ordered and fail the scan if a page still cannot be
      // fetched after retries. Silently dropping a rejected sibling would
      // make the next cursor jump over real sections/items.
      const fulfilled = await Promise.all(
        batchPaths.map(async (batchPath) => ({
          path: batchPath,
          payload: await requestPage(batchPath),
        })),
      );
      pages.push(...fulfilled.map((entry) => entry.payload));

      const terminalIndex = fulfilled.findIndex(
        (entry) => !forwardLink(entry.payload),
      );
      if (terminalIndex >= 0) break;

      path = fulfilled.at(-1) ? forwardLink(fulfilled.at(-1)?.payload) || "" : "";
    }

    return pages;
  }

  async browse(input: BrowseInput): Promise<BrowseResult> {
    const page = Math.max(1, input.page || 1);
    const tagId = input.genres || "1";
    const payload = await this.client.requestJson<unknown>(
      `/movie/movie/list/tagid/${encodeURIComponent(tagId)}/list_perpage/20/list_offset/${(page - 1) * 20}`,
    );
    const allItems = collectMediaItems(payload);
    const items = allItems.filter((item) => {
      if (item.type !== input.type) return false;
      if (input.dubbed && !item.badges.some((badge) => /دوبله/.test(badge))) return false;
      if (input.subtitle && !item.badges.some((badge) => /زیرنویس/.test(badge))) return false;
      return true;
    });
    const links = (payload as { links?: { forward?: unknown } })?.links;
    const pageItems = items.slice(0, 20);
    return { items: pageItems, page, totalPages: links?.forward ? page + 1 : page, perPage: pageItems.length };
  }

  async getDetails(input: MediaPath): Promise<MediaDetails> {
    const detailsPayload = await this.client.requestJson<unknown>(`/movie/movie/one/uid/${encodeURIComponent(input.id)}`, { simple: false });
    let episodes;
    if (input.type === "series") {
      const seasonsPayload = await this.client.requestJson<unknown>(`/movie/serial/allseason/uid/${encodeURIComponent(input.id)}`, { simple: false });
      const seasons = parseSeasons(seasonsPayload);
      const episodeResults = await Promise.allSettled(
        seasons.map(async (season) => parseEpisodes(
          await this.client.requestJson<unknown>(season.episodesLink, { simple: true }),
          season.season,
        )),
      );
      episodes = episodeResults.flatMap((result) => result.status === "fulfilled" ? result.value : []);
    }
    return parseDetails(detailsPayload, episodes);
  }

  async getPlayback(input: PlaybackInput): Promise<PlaybackData> {
    const uid = input.playbackId || input.id;
    const payload = await this.client.requestJson<unknown>(
      `/movie/watch/watch/uid/${encodeURIComponent(uid)}`,
      { auth: true, simple: false, timeoutMs: 20000 },
    );
    return expandHlsQualities(parsePlayback(payload));
  }

  async getCategories() {
    return parseCategories(await this.client.requestJson<unknown>("/menu/menu/category"));
  }

  async getKidsSections(): Promise<HomeSection[]> {
    const payloads = await this.getAllListPages("2001215");
    return dedupeSections(
      payloads.flatMap((payload) => parseHomeSections(payload)).map((section) => ({
        ...section,
        title: section.title || "فیلیمو کودک",
        provider: this.id,
        sourceType: "tag",
      })),
    );
  }

  async getSection(input: { id: string; sourceType?: string; page?: number }) {
    const page = Math.max(1, input.page || 1);
    const firstPayload = await this.client.requestJson<unknown>(
      `/movie/movie/list/tagid/${encodeURIComponent(input.id)}/list_perpage/20/list_offset/0`,
    );
    const firstPage = parseSectionPage(firstPayload, input.id, 1);

    // Editorial tag pages (for example a filtered genre landing page) do not
    // expose an infinity cursor. Follow the row registry cursor and keep all
    // of their rails instead of returning only the first response.
    if (!firstPage.isInfinite) {
      const editorialPayloads = await this.getAllListPages(input.id, 20);
      const editorial = editorialPayloads.flatMap((payload) =>
        parseHomeSections(payload),
      );
      const items = dedupeItems(editorial.flatMap((section) => section.items));
      const title =
        firstPage.title ||
        editorial.find((section) => section.title)?.title ||
        "فیلم و سریال";
      return {
        id: `${this.id}-${input.id}`,
        title,
        type: "rail" as const,
        items,
        provider: this.id,
        sourceId: input.id,
        sourceType: input.sourceType || "tag",
        page: 1,
        perPage: items.length,
        totalPages: 1,
        hasMore: false,
      };
    }

    let parsed = firstPage;
    let next = firstPage.nextUrl;
    for (let currentPage = 2; currentPage <= page && next; currentPage += 1) {
      const payload = await this.client.requestJson<unknown>(next);
      parsed = parseSectionPage(payload, input.id, currentPage);
      next = parsed.nextUrl || nextLoadmoreUrl(next, currentPage + 1);
    }

    return {
      id: `${this.id}-${input.id}`,
      title: parsed.title || "فیلم و سریال",
      type: "rail" as const,
      items: parsed.items.length ? parsed.items : collectMediaItems(firstPayload),
      provider: this.id,
      sourceId: input.id,
      sourceType: input.sourceType || parsed.sourceType,
      page: parsed.page,
      perPage: parsed.perPage,
      totalPages: parsed.totalPages,
      hasMore: Boolean(next && parsed.hasMore),
    };
  }
}
