import type {
  BrowseInput,
  BrowseResult,
  HomeSection,
  MediaDetails,
  MediaProvider,
  PlaybackData,
  PlaybackInput,
  ProviderCategory,
  SearchResult,
  SeriesEpisode,
} from "@/lib/providers/types";
import { ProviderFetchError } from "@/lib/utils/errors";
import { SheydaClient } from "./client";
import {
  makeSheydaSection,
  parseSheydaDetails,
  parseSheydaPlayback,
  parseSheydaPrograms,
  parseSheydaSearch,
  SHEYDA_PROVIDER_ID,
  sheydaEpisode,
  type SheydaEpisode,
  type SheydaHomeRow,
  type SheydaPagination,
  type SheydaProgram,
  type SheydaProgramDetails,
  type SheydaSeason,
  type SheydaStatus,
} from "./parsers";
import {
  EPISODE_PLAYBACK_QUERY,
  HOME_LAYOUT_QUERY,
  PROGRAM_DETAILS_QUERY,
  PROGRAMS_BY_TAG_QUERY,
  SEARCH_QUERY,
  SEASON_EPISODES_QUERY,
} from "./queries";

const DEFAULT_BROWSE_TAGS = {
  movie: [
    "39e3fc90-928b-447e-a48b-bb2e2b7d1822",
    "5fab4db7-b8a9-40d1-8a38-7c762fee0e57",
  ],
  series: [
    "b8141051-7022-46d1-bc62-b762610138ad",
    "93995791-981e-463e-9b2c-80ab298c0620",
  ],
} as const;

type ProgramsPayload = {
  getProgramsByTagId?: {
    status?: SheydaStatus;
    pagination?: SheydaPagination;
    data?: SheydaProgram[];
  };
};

type ProgramDetailsPayload = {
  getProgramByUid?: { status?: SheydaStatus; data?: SheydaProgramDetails };
};

function dedupeItems<T extends { provider: string; type: string; id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.provider}:${item.type}:${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function descriptorFromLink(link?: string): string | undefined {
  return link?.split("/").filter(Boolean).at(-1);
}

export class SheydaProvider implements MediaProvider {
  readonly id = SHEYDA_PROVIDER_ID;
  readonly name = "Sheyda";
  private readonly client = new SheydaClient();
  private homeRows?: Promise<SheydaHomeRow[]>;

  private loadHomeRows(): Promise<SheydaHomeRow[]> {
    this.homeRows ??= this.client.request<{
      getPageLayout?: { data?: { rows?: SheydaHomeRow[] } };
    }>("getPageLayout", HOME_LAYOUT_QUERY, { pageID: "home-page" }).then(
      (payload) => (payload.getPageLayout?.data?.rows ?? [])
        .filter((row) => row.dataType === "PROGRAM" && Boolean(row.itemID))
        .sort((a, b) => (a.order || 0) - (b.order || 0)),
    );
    return this.homeRows;
  }

  private async loadPrograms(tagId: string, page = 1, type?: BrowseInput["type"]): Promise<BrowseResult> {
    const payload = await this.client.request<ProgramsPayload>(
      "getProgramsByTagId",
      PROGRAMS_BY_TAG_QUERY,
      { TagID: tagId, page },
    );
    const result = payload.getProgramsByTagId;
    if (!result) throw new ProviderFetchError("فهرست محتوای شیدا دریافت نشد.");
    return parseSheydaPrograms(result, page, type);
  }

  private async loadProgramDetails(uid: string): Promise<SheydaProgramDetails> {
    const payload = await this.client.request<ProgramDetailsPayload>(
      "getProgramByUid",
      PROGRAM_DETAILS_QUERY,
      { uid },
    );
    const details = payload.getProgramByUid?.data;
    if (!details?.program) throw new ProviderFetchError("جزئیات محتوای شیدا دریافت نشد.", 404);
    return details;
  }

  private async loadSeasonEpisodes(season: SheydaSeason, seasonNumber: number): Promise<SeriesEpisode[]> {
    if (!season.id) return [];
    const payload = await this.client.request<{
      getSeasonEpisodes?: { data?: SheydaEpisode[] };
    }>("getSeasonEpisodes", SEASON_EPISODES_QUERY, { seasonID: season.id });
    return (payload.getSeasonEpisodes?.data ?? []).flatMap((episode, index) => {
      const parsed = sheydaEpisode(episode, seasonNumber, index + 1);
      return parsed ? [parsed] : [];
    });
  }

  async search(query: string): Promise<SearchResult[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];
    const payload = await this.client.request<{
      search?: { data?: { titleMatch?: SheydaProgram[]; contextMatch?: SheydaProgram[] } };
    }>("search", SEARCH_QUERY, { query: cleanQuery, page: 1 });
    return parseSheydaSearch(payload.search?.data ?? {});
  }

  async getHomeSections(): Promise<HomeSection[]> {
    const rows = await this.loadHomeRows();
    const results = await Promise.allSettled(
      rows.map(async (row) => {
        const result = await this.loadPrograms(row.itemID as string, 1);
        return makeSheydaSection(row, result.items, result.page, result.totalPages);
      }),
    );
    return results.flatMap((result) =>
      result.status === "fulfilled" && result.value.items.length ? [result.value] : [],
    );
  }

  async getCatalogSections(type: BrowseInput["type"]): Promise<HomeSection[]> {
    const sections = await this.getHomeSections();
    return sections
      .map((section) => ({ ...section, items: section.items.filter((item) => item.type === type) }))
      .filter((section) => section.items.length);
  }

  async browse(input: BrowseInput): Promise<BrowseResult> {
    const page = Math.max(1, input.page || 1);
    const tagIds = input.genres
      ? input.genres.split(",").map((id) => id.trim()).filter(Boolean)
      : [...DEFAULT_BROWSE_TAGS[input.type]];
    const results = await Promise.all(tagIds.map((tagId) => this.loadPrograms(tagId, page, input.type)));
    const items = dedupeItems(results.flatMap((result) => result.items));
    return {
      items,
      page,
      totalPages: Math.max(1, ...results.map((result) => result.totalPages)),
      perPage: items.length,
    };
  }

  async getDetails(input: { id: string }): Promise<MediaDetails> {
    const details = await this.loadProgramDetails(input.id);
    const seasons = details.seasons ?? [];
    const episodeResults = await Promise.allSettled(
      seasons.map((season, index) => this.loadSeasonEpisodes(season, index + 1)),
    );
    const episodes = episodeResults.flatMap((result) =>
      result.status === "fulfilled" ? result.value : [],
    );
    return parseSheydaDetails(details, episodes);
  }

  async getPlayback(input: PlaybackInput): Promise<PlaybackData> {
    let episodeUid = input.playbackId?.trim();
    if (!episodeUid) {
      const details = await this.loadProgramDetails(input.id);
      episodeUid = details.solitaryEpisode?.uid;
      if (!episodeUid && details.seasons?.length) {
        const requestedSeason = Math.max(1, Number(input.season) || 1);
        const episodes = await this.loadSeasonEpisodes(
          details.seasons[requestedSeason - 1] || details.seasons[0],
          requestedSeason,
        );
        const requestedEpisode = Math.max(1, Number(input.episode) || 1);
        episodeUid = episodes.find((episode) => episode.episode === requestedEpisode)?.playbackId || episodes[0]?.playbackId;
      }
    }
    if (!episodeUid) throw new ProviderFetchError("قسمت قابل پخش شیدا پیدا نشد.", 404);

    const payload = await this.client.request<{
      getEpisodeByUid?: { data?: SheydaEpisode };
    }>("getEpisodeByUid", EPISODE_PLAYBACK_QUERY, { uid: episodeUid }, { auth: true });
    const episode = payload.getEpisodeByUid?.data;
    if (!episode) throw new ProviderFetchError("لینک پخش شیدا دریافت نشد.");
    const playback = parseSheydaPlayback(episode);
    if (!playback.sources.length) throw new ProviderFetchError("شیدا لینک پخش معتبری برنگرداند.");
    return playback;
  }

  async getCategories(): Promise<ProviderCategory[]> {
    const rows = await this.loadHomeRows();
    return rows.flatMap((row) => {
      if (!row.itemID || !row.title) return [];
      return [{
        provider: this.id,
        key: descriptorFromLink(row.link) || row.itemID,
        label: row.title,
        movieId: row.itemID,
        seriesId: row.itemID,
      }];
    });
  }

  async getKidsSections(): Promise<HomeSection[]> {
    const rows = await this.loadHomeRows();
    const row = rows.find((item) => /کودک/.test(item.title || ""));
    if (!row?.itemID) return [];
    const result = await this.loadPrograms(row.itemID, 1);
    return [makeSheydaSection(row, result.items, result.page, result.totalPages)];
  }

  async getSection(input: { id: string; sourceType?: string; page?: number }): Promise<HomeSection> {
    const page = Math.max(1, input.page || 1);
    const rows = await this.loadHomeRows();
    const row = rows.find((item) => item.itemID === input.id) || {
      title: "آرشیو شیدا",
      itemID: input.id,
      itemType: input.sourceType || "tag",
    };
    const result = await this.loadPrograms(input.id, page);
    return makeSheydaSection(row, result.items, result.page, result.totalPages);
  }
}
