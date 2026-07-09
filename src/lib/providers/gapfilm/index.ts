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
import { GapfilmClient } from "./client";
import {
  attachmentsFromPayload,
  GAPFILM_PROVIDER_ID,
  parseAdvancedBrowse,
  parseBrowse,
  parseCategories,
  parseDetails,
  parseEpisodes,
  parseHomeSections,
  parsePlaybackFromAttachment,
  parseSearch,
  toMediaItem,
} from "./parsers";

const ROOT_CATEGORY_BY_TYPE = {
  movie: "6",
  series: "7",
} as const;

const KIDS_SECTION_TEMPLATE_IDS = "2,3,5,10,11,16,37,35,36,34,1,4,6,7,8,9,12,13,14,38,15,39";

const SHABFOROOSH_TO_GAPFILM_CATEGORY: Record<string, { movie?: string; series?: string }> = {
  "29": { movie: "9" },
  "108": { series: "18" },
  "2": { movie: "8" },
  "73": { series: "17" },
  "13": { movie: "13" },
  "74": { series: "22" },
  "22": { movie: "15" },
  "94": { series: "30" },
  "34": { movie: "16" },
  "91": { series: "27" },
};

type GapfilmContentEnvelope = {
  Status?: number;
  Result?: {
    ContentId?: number;
    ContentID?: number;
    SeasonList?: Array<{ SeasonId?: number; SeasonType?: number }>;
  };
};

export class GapfilmProvider implements MediaProvider {
  readonly id = GAPFILM_PROVIDER_ID;
  readonly name = "Gapfilm";
  private readonly client = new GapfilmClient();

  async search(query: string): Promise<SearchResult[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      return [];
    }

    const payload = await this.client.requestJson<Parameters<typeof parseSearch>[0]>("/api/v1.0/search", {
      params: {
        Title: cleanQuery,
        PageIndex: 0,
        PageSize: 20,
      },
    });

    return parseSearch(payload);
  }

  async getHomeSections(): Promise<HomeSection[]> {
    const payload = await this.getFirstPageSectionsPayload(1, 20, 20);

    return parseHomeSections(payload);
  }

  async getCatalogSections(type: "movie" | "series"): Promise<HomeSection[]> {
    const platformIds = type === "movie" ? [2, 3, 4] : [4, 1, 2];
    const results = await Promise.allSettled(platformIds.map((platformId) => this.getFirstPageSectionsPayload(platformId, 8, 8)));
    const sections = results.flatMap((result) => (result.status === "fulfilled" ? parseHomeSections(result.value) : []));

    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.type === type),
      }))
      .filter((section) => section.items.length);
  }

  private async getFirstPageSectionsPayload(platformId: number, pageSize: number, contentRows: number) {
    return this.client.requestJson<Parameters<typeof parseHomeSections>[0]>("/api/v3.3/GetFirstPageByPlatform", {
      params: {
        PlatformId: platformId,
        PlatformType: 1,
        PageType: 1,
        PageSize: pageSize,
        PageIndex: 0,
        ContentRows: contentRows,
        ParentType: 2,
        ClientTags: "Web",
      },
    });
  }

  async getKidsSections(): Promise<HomeSection[]> {
    const firstPage = await this.getKidsSectionsPage(0);
    const totalPages = Math.max(firstPage.Result?.TotalPage ?? 1, 1);
    const otherPages =
      totalPages > 1
        ? await Promise.all(Array.from({ length: totalPages - 1 }, (_, index) => this.getKidsSectionsPage(index + 1)))
        : [];

    return [firstPage, ...otherPages].flatMap((payload) => parseHomeSections(payload));
  }

  private async getKidsSectionsPage(pageIndex: number) {
    return this.client.requestJson<
      Parameters<typeof parseHomeSections>[0] & {
        Result?: { TotalPage?: number };
      }
    >("/api/v3.3/GetFirstPageByPlatform", {
      params: {
        PlatformId: 5,
        PlatformType: 1,
        PageType: 1,
        PageSize: 8,
        PageIndex: pageIndex,
        ContentRows: 11,
        ParentType: 2,
        SectionTemplateIds: KIDS_SECTION_TEMPLATE_IDS,
        AgeRangeId: 2,
        ClientTags: "Web",
      },
      headers: {
        SourceEnvironment: "Website",
        Referer: "https://www.gapfilm.ir/kids/",
      },
    });
  }

  async browse(input: BrowseInput): Promise<BrowseResult> {
    const page = Math.max((input.page || 1) - 1, 0);
    const categoryId = this.resolveCategory(input);

    if (input.dubbed || input.subtitle || input.country) {
      const payload = await this.client.requestJson<Parameters<typeof parseAdvancedBrowse>[0]>("/api/v1.1/search/advance-search", {
        params: {
          ZoneId: input.type === "series" ? 3 : 4,
          CategoryId: categoryId === ROOT_CATEGORY_BY_TYPE[input.type] ? undefined : categoryId,
          Country: input.country,
          isDubbed: input.dubbed || undefined,
          isSubtitled: input.subtitle || undefined,
          PageIndex: page,
          PageSize: 20,
        },
      });

      return parseAdvancedBrowse(payload, page + 1);
    }

    const payload = await this.client.requestJson<Parameters<typeof parseBrowse>[0]>("/api/v1.0/GetContentList", {
      method: "POST",
      body: {
        request: {
          RequestType: 2,
          RequestId: Number(categoryId),
          Order: "desc",
          OrderBy: "startshowdate",
          PageIndex: page,
          PageSize: 20,
        },
      },
    });

    return parseBrowse(payload, page + 1);
  }

  async getDetails(input: MediaPath): Promise<MediaDetails> {
    const payload = await this.getContent(input.id);
    const seasons = payload.Result?.SeasonList?.filter((season) => season.SeasonType === 7 || season.SeasonType === undefined) ?? [];
    const episodes = input.type === "series" ? (await Promise.all(seasons.map((season) => this.getSeasonEpisodes(input.id, season.SeasonId ?? 1)))).flat() : undefined;

    return parseDetails(payload as Parameters<typeof parseDetails>[0], episodes);
  }

  async getPlayback(input: PlaybackInput): Promise<PlaybackData> {
    const details = await this.getContent(input.id);
    const poster = parseDetails(details as Parameters<typeof parseDetails>[0]).poster;
    const seasonId = Number(input.season || details.Result?.SeasonList?.[0]?.SeasonId || 1);
    const attachmentsPayload = await this.getAttachments(input.id, seasonId);
    const attachments = attachmentsFromPayload(attachmentsPayload);

    const selectedAttachment =
      input.type === "series" && input.episode
        ? attachments.find((attachment) => String(attachment.EpisodeNo) === String(input.episode)) ?? attachments[0]
        : attachments[0];

    return parsePlaybackFromAttachment(selectedAttachment, poster);
  }

  private async getContent(id: string) {
    return this.client.requestJson<GapfilmContentEnvelope>("/api/v4/Content/GetContent", {
      params: { Id: id },
      headers: { SourceEnvironment: "Website" },
    });
  }

  private async getAttachments(id: string, seasonId: number) {
    return this.client.requestJson<Parameters<typeof attachmentsFromPayload>[0]>("/api/v4/Content/GetContentAttachments", {
      params: {
        Id: id,
        seasonId,
        generateLink: true,
      },
      headers: { SourceEnvironment: "Website" },
    });
  }

  private async getSeasonEpisodes(id: string, seasonId: number) {
    const payload = await this.getAttachments(id, seasonId);
    return parseEpisodes(payload);
  }

  private resolveCategory(input: BrowseInput): string {
    if (input.genres) {
      const mapped = SHABFOROOSH_TO_GAPFILM_CATEGORY[input.genres]?.[input.type];
      if (mapped) {
        return mapped;
      }

      return input.genres;
    }

    return ROOT_CATEGORY_BY_TYPE[input.type];
  }

  async getCategories() {
    const payload = await this.client.requestJson<Parameters<typeof parseCategories>[0]>("/api/v1.0/GetCategoryList", {
      method: "POST",
      body: { request: { requestId: -1 } },
    });

    const categories = parseCategories(payload);
    return categories
      .filter((category) => category.parentId === ROOT_CATEGORY_BY_TYPE.movie || category.parentId === ROOT_CATEGORY_BY_TYPE.series)
      .map((category) => ({
        provider: this.id,
        key: encodeURIComponent(category.title.toLowerCase().replace(/\s+/g, "-")),
        label: category.title,
        movieId: category.parentId === ROOT_CATEGORY_BY_TYPE.movie ? category.id : undefined,
        seriesId: category.parentId === ROOT_CATEGORY_BY_TYPE.series ? category.id : undefined,
      }));
  }

  async getCountries() {
    const payload = await this.client.requestJson<{
      Code?: number;
      Message?: string;
      Data?: Array<{ EnglishName?: string; PersianName?: string }>;
    }>("/api/v3.2/country");

    if (payload.Code !== 1) {
      throw new Error(payload.Message || "Gapfilm countries are unavailable.");
    }

    return (payload.Data ?? [])
      .map((country) => {
        const label = country.PersianName?.trim() ?? "";
        return {
          provider: this.id,
          key: encodeURIComponent(label.toLowerCase().replace(/\s+/g, "-")),
          label,
          value: label,
          englishLabel: country.EnglishName?.trim() || undefined,
        };
      })
      .filter((country) => country.label);
  }

  async getSection(input: { id: string; sourceType?: string; page?: number }) {
    const page = Math.max((input.page || 1) - 1, 0);
    const payload = await this.client.requestJson<{
      Status?: number;
      Message?: string;
      Result?: {
        Sections?: Array<{ Name?: string; SectionTemplateId?: number }>;
        Contents?: Parameters<typeof toMediaItem>[0][];
        TotalPage?: number;
      };
    }>("/api/v3.3/GetFirstPageByPlatformPaging", {
      params: {
        EntityId: input.id,
        EntityType: input.sourceType || 1,
        PlatformType: 1,
        AgeRangeId: 5,
        PageSize: 25,
        PageIndex: page,
      },
    });

    if (payload.Status !== 1 || !payload.Result) {
      throw new Error(payload.Message || "Section is unavailable.");
    }

    const section = payload.Result.Sections?.[0];
    return {
      id: `${this.id}-${input.id}`,
      title: (section?.Name || "\u0641\u06CC\u0644\u0645 \u0648 \u0633\u0631\u06CC\u0627\u0644").replace(/گپ[\s‌-]*فیلم/g, "").replace(/\s+/g, " ").trim(),
      type: "rail" as const,
      items: (payload.Result.Contents ?? []).map(toMediaItem),
      provider: this.id,
      sourceId: input.id,
      sourceType: input.sourceType || "1",
    };
  }
}
