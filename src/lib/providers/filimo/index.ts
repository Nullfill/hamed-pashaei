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
  parseSeasons,
} from "./parsers";

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
    const payload = await this.client.requestJson<unknown>("/movie/movie/list/tagid/1");
    return parseHomeSections(payload);
  }

  async getCatalogSections(type: "movie" | "series"): Promise<HomeSection[]> {
    return (await this.getHomeSections())
      .map((section) => ({ ...section, items: section.items.filter((item) => item.type === type) }))
      .filter((section) => section.items.length);
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
    return parsePlayback(payload);
  }

  async getCategories() {
    return parseCategories(await this.client.requestJson<unknown>("/menu/menu/category"));
  }

  async getSection(input: { id: string; sourceType?: string; page?: number }) {
    const page = Math.max(1, input.page || 1);
    const payload = await this.client.requestJson<unknown>(
      `/movie/movie/list/tagid/${encodeURIComponent(input.id)}/list_perpage/25/list_offset/${(page - 1) * 25}`,
    );
    const parsed = parseHomeSections(payload);
    const first = parsed[0];
    return {
      id: `${this.id}-${input.id}`,
      title: first?.title || "فیلم و سریال",
      type: "rail" as const,
      items: parsed.length ? parsed.flatMap((section) => section.items) : collectMediaItems(payload),
      provider: this.id,
      sourceId: input.id,
      sourceType: "tag",
    };
  }
}
