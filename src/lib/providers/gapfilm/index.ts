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
  parseTrailerFromPayload,
  toMediaItem,
} from "./parsers";

const ROOT_CATEGORY_BY_TYPE = {
  movie: "6",
  series: "7",
} as const;

const KIDS_SECTION_TEMPLATE_IDS =
  "2,3,5,10,11,16,37,35,36,34,1,4,6,7,8,9,12,13,14,38,15,39";

const SHABFOROOSH_TO_GAPFILM_CATEGORY: Record<
  string,
  { movie?: string; series?: string }
> = {
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

function dedupeSections(sections: HomeSection[]): HomeSection[] {
  const seen = new Set<string>();

  return sections.filter((section) => {
    const key = `${section.sourceId || section.id}:${section.sourceType || ""}:${section.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export class GapfilmProvider implements MediaProvider {
  readonly id = GAPFILM_PROVIDER_ID;
  readonly name = "Gapfilm";
  private readonly client = new GapfilmClient();

  async search(query: string): Promise<SearchResult[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      return [];
    }

    const payload = await this.client.requestJson<
      Parameters<typeof parseSearch>[0]
    >("/api/v1.0/search", {
      params: {
        Title: cleanQuery,
        PageIndex: 0,
        PageSize: 20,
      },
    });

    return parseSearch(payload);
  }

  async getHomeSections(): Promise<HomeSection[]> {
    const payloads = await this.getAllFirstPageSectionPayloads(1, 20, 20);
    return dedupeSections(payloads.flatMap((payload) => parseHomeSections(payload)));
  }

  async getCatalogSections(type: "movie" | "series"): Promise<HomeSection[]> {
    const platformIds = type === "movie" ? [2, 3, 4] : [4, 1, 2];
    const results = await Promise.allSettled(
      platformIds.map((platformId) =>
        this.getAllFirstPageSectionPayloads(platformId, 20, 12),
      ),
    );
    const sections = results.flatMap((result) =>
      result.status === "fulfilled"
        ? result.value.flatMap((payload) => parseHomeSections(payload))
        : [],
    );

    return dedupeSections(
      sections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => item.type === type),
        }))
        .filter((section) => section.items.length),
    );
  }

  private async getFirstPageSectionsPayload(
    platformId: number,
    pageSize: number,
    contentRows: number,
    pageIndex = 0,
  ) {
    return this.client.requestJson<Parameters<typeof parseHomeSections>[0]>(
      "/api/v3.3/GetFirstPageByPlatform",
      {
        params: {
          PlatformId: platformId,
          PlatformType: 1,
          PageType: 1,
          PageSize: pageSize,
          PageIndex: pageIndex,
          ContentRows: contentRows,
          ParentType: 2,
          ClientTags: "Web",
        },
      },
    );
  }

  private async getAllFirstPageSectionPayloads(
    platformId: number,
    pageSize: number,
    contentRows: number,
  ) {
    const first = await this.withRetry(() =>
      this.getFirstPageSectionsPayload(platformId, pageSize, contentRows, 0),
    );
    const totalPages = Math.max(first.Result?.TotalPage ?? 1, 1);
    if (totalPages === 1) return [first];

    // Every page is part of the section registry. A rejected page must be
    // retried (and ultimately surfaced) instead of being silently omitted.
    const remaining = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) =>
        this.withRetry(() =>
          this.getFirstPageSectionsPayload(
            platformId,
            pageSize,
            contentRows,
            index + 1,
          ),
        ),
      ),
    );

    return [first, ...remaining];
  }

  async getKidsSections(): Promise<HomeSection[]> {
    const firstPage = await this.withRetry(() => this.getKidsSectionsPage(0));
    const totalPages = Math.max(firstPage.Result?.TotalPage ?? 1, 1);
    const otherPages =
      totalPages > 1
        ? await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, index) =>
              this.withRetry(() => this.getKidsSectionsPage(index + 1)),
            ),
          )
        : [];

    return [firstPage, ...otherPages].flatMap((payload) =>
      parseHomeSections(payload),
    );
  }

  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt < 2) {
          await wait(250 * (attempt + 1));
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("Gapfilm request failed.");
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
      const payload = await this.client.requestJson<
        Parameters<typeof parseAdvancedBrowse>[0]
      >("/api/v1.1/search/advance-search", {
        params: {
          ZoneId: input.type === "series" ? 3 : 4,
          CategoryId:
            categoryId === ROOT_CATEGORY_BY_TYPE[input.type]
              ? undefined
              : categoryId,
          Country: input.country,
          isDubbed: input.dubbed || undefined,
          isSubtitled: input.subtitle || undefined,
          PageIndex: page,
          PageSize: 20,
        },
      });

      return parseAdvancedBrowse(payload, page + 1);
    }

    const payload = await this.client.requestJson<
      Parameters<typeof parseBrowse>[0]
    >("/api/v1.0/GetContentList", {
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
    const seasons =
      payload.Result?.SeasonList?.filter(
        (season) => season.SeasonType === 7 || season.SeasonType === undefined,
      ) ?? [];
    const seasonIds = [
      ...new Set(seasons.map((season) => season.SeasonId ?? 1)),
    ];
    if (!seasonIds.length) seasonIds.push(1);
    const attachmentResults = await Promise.allSettled(
      seasonIds.map((seasonId) => this.getAttachments(input.id, seasonId)),
    );
    const attachmentPayloads = attachmentResults.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    );
    const episodes =
      input.type === "series"
        ? attachmentPayloads.flatMap((attachments) =>
            parseEpisodes(attachments),
          )
        : undefined;
    const trailer = attachmentPayloads
      .map((attachments) => parseTrailerFromPayload(attachments))
      .find(Boolean);

    return parseDetails(
      payload as Parameters<typeof parseDetails>[0],
      episodes,
      trailer,
    );
  }

  async getPlayback(input: PlaybackInput): Promise<PlaybackData> {
    const details = await this.getContent(input.id);
    const poster = parseDetails(
      details as Parameters<typeof parseDetails>[0],
    ).poster;
    const seasonId = Number(
      input.season || details.Result?.SeasonList?.[0]?.SeasonId || 1,
    );
    const attachmentsPayload = await this.getAttachments(input.id, seasonId);
    const attachments = attachmentsFromPayload(attachmentsPayload);

    const selectedAttachment =
      input.type === "series" && input.episode
        ? (attachments.find(
            (attachment) =>
              String(attachment.EpisodeNo) === String(input.episode),
          ) ?? attachments[0])
        : attachments[0];

    return parsePlaybackFromAttachment(selectedAttachment, poster);
  }

  private async getContent(id: string) {
    return this.client.requestJson<GapfilmContentEnvelope>(
      "/api/v4/Content/GetContent",
      {
        params: { Id: id },
        headers: { SourceEnvironment: "Website" },
      },
    );
  }

  private async getAttachments(id: string, seasonId: number) {
    return this.client.requestJson<
      Parameters<typeof attachmentsFromPayload>[0]
    >("/api/v4/Content/GetContentAttachments", {
      params: {
        Id: id,
        seasonId,
        generateLink: true,
      },
      headers: { SourceEnvironment: "Website" },
    });
  }

  private resolveCategory(input: BrowseInput): string {
    if (input.genres) {
      const mapped =
        SHABFOROOSH_TO_GAPFILM_CATEGORY[input.genres]?.[input.type];
      if (mapped) {
        return mapped;
      }

      return input.genres;
    }

    return ROOT_CATEGORY_BY_TYPE[input.type];
  }

  async getCategories() {
    const payload = await this.client.requestJson<
      Parameters<typeof parseCategories>[0]
    >("/api/v1.0/GetCategoryList", {
      method: "POST",
      body: { request: { requestId: -1 } },
    });

    const categories = parseCategories(payload);
    return categories
      .filter(
        (category) =>
          category.parentId === ROOT_CATEGORY_BY_TYPE.movie ||
          category.parentId === ROOT_CATEGORY_BY_TYPE.series,
      )
      .map((category) => ({
        provider: this.id,
        key: encodeURIComponent(
          category.title.toLowerCase().replace(/\s+/g, "-"),
        ),
        label: category.title,
        movieId:
          category.parentId === ROOT_CATEGORY_BY_TYPE.movie
            ? category.id
            : undefined,
        seriesId:
          category.parentId === ROOT_CATEGORY_BY_TYPE.series
            ? category.id
            : undefined,
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
    const pageSize = 20;
    const payload = await this.client.requestJson<{
      Status?: number;
      Message?: string;
      Result?: {
        Sections?: Array<{
          Name?: string;
          Title?: string;
          SectionTemplateId?: number;
        }>;
        Contents?: Parameters<typeof toMediaItem>[0][];
        TotalPage?: number;
      };
    }>("/api/v3.3/GetFirstPageByPlatformPaging", {
      params: {
        EntityId: input.id,
        EntityType: /^\d+$/.test(input.sourceType || "")
          ? Number(input.sourceType)
          : 1,
        PlatformType: 1,
        AgeRangeId: 5,
        PageSize: pageSize,
        PageIndex: page,
      },
      headers: {
        SourceEnvironment: "Website",
        Referer: "https://www.gapfilm.ir/",
      },
    });

    if (payload.Status !== 1 || !payload.Result) {
      throw new Error(payload.Message || "Section is unavailable.");
    }

    const section = payload.Result.Sections?.[0];
    const totalPages = Math.max(payload.Result.TotalPage ?? 1, 1);
    const items = (payload.Result.Contents ?? []).map(toMediaItem);
    return {
      id: `${this.id}-${input.id}`,
      title: (
        section?.Name ||
        section?.Title ||
        "\u0641\u06CC\u0644\u0645 \u0648 \u0633\u0631\u06CC\u0627\u0644"
      )
        .replace(/گپ[\s‌-]*فیلم/g, "")
        .replace(/\s+/g, " ")
        .trim(),
      type: "rail" as const,
      items,
      provider: this.id,
      sourceId: input.id,
      sourceType: input.sourceType || "1",
      page: page + 1,
      perPage: pageSize,
      totalPages,
      hasMore: page + 1 < totalPages && items.length > 0,
    };
  }
}
