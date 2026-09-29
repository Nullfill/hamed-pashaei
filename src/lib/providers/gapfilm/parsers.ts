import type {
  BrowseResult,
  EpisodeLink,
  HomeSection,
  MediaDetails,
  MediaItem,
  MediaType,
  PlaybackData,
  PlaybackSource,
  SearchResult,
  SeriesEpisode,
} from "@/lib/providers/types";
import { toProviderAssetProxyUrl } from "@/lib/utils/url";

export const GAPFILM_PROVIDER_ID = "gapfilm";

const CENSORED_BADGE =
  "\u0633\u0627\u0646\u0633\u0648\u0631 \u0634\u062F\u0647";
const DUBBED_BADGE = "\u062F\u0648\u0628\u0644\u0647";
const SUBTITLE_BADGE = "\u0632\u06CC\u0631\u0646\u0648\u06CC\u0633";
const MOVIE_LABEL = "\u0641\u06CC\u0644\u0645";

type ApiEnvelope<T> = {
  Status?: number;
  Message?: string;
  Result?: T;
};

type ApiProperty = {
  Id?: number;
  PropertyId?: number;
  Name?: string;
  Value?: string;
};

type ApiCategory = {
  Id?: number;
  CategoryID?: number;
  CategoryId?: number;
  ParentID?: number;
  Title?: string;
  ZoneID?: number;
};

type ApiContent = {
  ContentID?: number;
  ContentId?: number;
  Id?: number;
  Title?: string;
  ContentTitle?: string;
  EnglishBody?: string | null;
  EnglishTitle?: string | null;
  ContentEnglishTitle?: string | null;
  Summary?: string;
  Body?: string;
  Type?: number;
  ZoneID?: number;
  ZoneId?: number;
  CreateDate?: number | string;
  UpdateDate?: number | string;
  Properties?: ApiProperty[];
  Categories?: ApiCategory[];
  SeasonList?: ApiSeason[];
};

type ApiSeason = {
  SeasonId?: number;
  SeasonTitle?: string;
  SeasonType?: number;
  NumberOfEpisodes?: number;
};

type ApiAttachmentFile = {
  Path?: string;
  Description?: string;
  Quality?: number;
  Width?: number;
  Type?: number;
};

type ApiAttachment = {
  EpisodeNo?: number;
  Title?: string;
  SeasonId?: number;
  SeasonTitle?: string;
  Thumbnail?: string;
  DurationSeconds?: number;
  IsDubbed?: boolean;
  Files?: ApiAttachmentFile[];
};

type HomeApiResult = {
  TotalPage?: number;
  Sections?: Array<{
    SectionId?: number;
    Type?: number;
    Name?: string;
    Title?: string;
    SectionTemplateId?: number;
    ContentSummaryRows?: ApiContent[];
  }>;
};

type BrowseApiResult = {
  GetContentList?: ApiContent[];
  TotalPages?: number;
};

type SearchApiResult = {
  Contents?: ApiContent[];
  TotalPage?: number;
};

type DetailsApiResult = ApiContent;

type AttachmentsApiResult = {
  Attachments?: ApiAttachment[];
  Trailers?: ApiAttachment[];
};

export type GapfilmCategory = {
  id: string;
  title: string;
  parentId?: string;
  zoneId?: number;
};

function assertOk<T>(payload: ApiEnvelope<T>, fallback: string): T {
  if (payload.Status === 1 && payload.Result) {
    return payload.Result;
  }

  throw new Error(payload.Message || fallback);
}

function propId(prop: ApiProperty): number | undefined {
  return prop.PropertyId ?? prop.Id;
}

function propValue(content: ApiContent, id: number): string | undefined {
  return content.Properties?.find((prop) => propId(prop) === id)?.Value?.trim();
}

function boolProp(content: ApiContent, id: number): boolean {
  return propValue(content, id)?.toLowerCase() === "true";
}

function parseDateMs(value: number | string | undefined): number | undefined {
  if (typeof value === "number") {
    return value * 1000;
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function updateTime(content: ApiContent): number | undefined {
  return parseDateMs(content.UpdateDate ?? content.CreateDate);
}

function imageUrl(
  content: ApiContent,
  kind: "portrait" | "landscape",
  size: number,
): string | undefined {
  const id = getId(content);
  if (!id) {
    return undefined;
  }

  const time = updateTime(content);
  const suffix = time ? `?updateTime=${time}` : "";
  return toProviderAssetProxyUrl(
    `https://cdn.gapfilm.ir/image/${size}/panel/${encodeURIComponent(id)}/${kind}.jpg${suffix}`,
  );
}

function getId(content: ApiContent): string {
  return String(content.ContentID ?? content.ContentId ?? content.Id ?? "");
}

function getMediaType(content: ApiContent): MediaType {
  const zone = content.ZoneID ?? content.ZoneId;
  return zone === 3 ? "series" : "movie";
}

function getTitleFa(content: ApiContent): string | undefined {
  return content.ContentTitle || content.Title || undefined;
}

function getTitleEn(content: ApiContent): string | undefined {
  return (
    content.EnglishBody ||
    content.EnglishTitle ||
    content.ContentEnglishTitle ||
    propValue(content, 3)
  );
}

function splitList(value: string | undefined): string[] {
  return (value ?? "")
    .split(/[,،]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function sanitizeTitle(title: string): string {
  return title
    .replace(/گپ[\s‌-]*فیلم/g, "")
    .replace(/\s*-\s*تک بنر/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function badgesForContent(content: ApiContent): string[] {
  const badges = [CENSORED_BADGE];

  if (boolProp(content, 24) || boolProp(content, 37)) {
    badges.push(DUBBED_BADGE);
  }

  if (boolProp(content, 22)) {
    badges.push(SUBTITLE_BADGE);
  }

  const year = propValue(content, 4);
  if (year) {
    badges.push(year);
  }

  return badges;
}

function sourcePath(content: ApiContent): string {
  const type = getMediaType(content);
  const id = getId(content);
  return `/${type === "movie" ? "movie" : "serial"}/${encodeURIComponent(id)}/`;
}

export function toMediaItem(content: ApiContent): MediaItem {
  const id = getId(content);
  const titleFa = getTitleFa(content);
  const titleEn = getTitleEn(content);

  return {
    provider: GAPFILM_PROVIDER_ID,
    id,
    type: getMediaType(content),
    title: titleFa || titleEn || `${MOVIE_LABEL} ${id}`,
    titleFa,
    titleEn,
    poster: imageUrl(content, "portrait", 362),
    backdrop: imageUrl(content, "landscape", 1280),
    rating: propValue(content, 16),
    badges: badgesForContent(content),
    sourcePath: sourcePath(content),
  };
}

export function parseCategories(
  payload: ApiEnvelope<{ GetCategoryList?: ApiCategory[] }>,
): GapfilmCategory[] {
  const result = assertOk(payload, "Gapfilm categories are unavailable.");

  return (result.GetCategoryList ?? [])
    .map((category) => ({
      id: String(
        category.CategoryID ?? category.CategoryId ?? category.Id ?? "",
      ),
      title: category.Title ?? "",
      parentId: category.ParentID ? String(category.ParentID) : undefined,
      zoneId: category.ZoneID,
    }))
    .filter((category) => category.id && category.title);
}

export function parseHomeSections(
  payload: ApiEnvelope<HomeApiResult>,
): HomeSection[] {
  const result = assertOk(payload, "Gapfilm home sections are unavailable.");

  return (result.Sections ?? [])
    .map((section, index) => {
      const items = (section.ContentSummaryRows ?? [])
        .map(toMediaItem)
        .filter((item) => item.id);
      const isSlider = section.SectionTemplateId === 2 || index === 0;

      return {
        id: `${GAPFILM_PROVIDER_ID}-${section.SectionId ?? index}`,
        title: sanitizeTitle(
          section.Title ||
            (isSlider
              ? "\u0627\u0633\u0644\u0627\u06CC\u062F\u0631"
              : "\u0641\u06CC\u0644\u0645 \u0648 \u0633\u0631\u06CC\u0627\u0644"),
        ),
        type: isSlider ? "slider" : "rail",
        items,
        provider: GAPFILM_PROVIDER_ID,
        sourceId: String(section.SectionId ?? ""),
        sourceType: String(section.Type ?? 1),
      } satisfies HomeSection;
    })
    .filter((section) => section.type === "slider" ? section.items.length > 0 : section.items.length >= 3);
}

export function parseBrowse(
  payload: ApiEnvelope<BrowseApiResult>,
  page: number,
): BrowseResult {
  const result = assertOk(payload, "Gapfilm list is unavailable.");
  const items = (result.GetContentList ?? [])
    .map(toMediaItem)
    .filter((item) => item.id);

  return {
    items,
    page,
    totalPages: result.TotalPages || 1,
    perPage: items.length || 20,
  };
}

export function parseAdvancedBrowse(
  payload: SearchApiResult,
  page: number,
): BrowseResult {
  const items = (payload.Contents ?? [])
    .map(toMediaItem)
    .filter((item) => item.id);

  return {
    items,
    page,
    totalPages: payload.TotalPage || 1,
    perPage: items.length || 20,
  };
}

export function parseSearch(payload: SearchApiResult): SearchResult[] {
  return (payload.Contents ?? []).map((content) => {
    const item = toMediaItem(content);
    return {
      provider: item.provider,
      id: item.id,
      type: item.type,
      titleFa: item.titleFa,
      titleEn: item.titleEn,
      poster: item.poster,
      imdb: item.rating,
      badges: item.badges,
      sourcePath: item.sourcePath,
    };
  });
}

export function parseDetails(
  payload: ApiEnvelope<DetailsApiResult>,
  episodes?: SeriesEpisode[],
  trailer?: PlaybackData,
): MediaDetails {
  const content = assertOk(payload, "Gapfilm details are unavailable.");
  const item = toMediaItem(content);
  const genreNames = splitList(propValue(content, 7));
  const categoryTerms = (content.Categories ?? []).map((category) => ({
    id: String(category.Id ?? category.CategoryID ?? category.CategoryId ?? ""),
    name: category.Title ?? "",
  }));
  const actors = splitList(propValue(content, 10)).map((name) => ({ name }));
  const directors = splitList(propValue(content, 8)).map((name) => ({ name }));
  const languages = splitList(propValue(content, 11)).map((name) => ({ name }));
  const countries = splitList(propValue(content, 12)).map((name) => ({ name }));

  return {
    provider: GAPFILM_PROVIDER_ID,
    id: item.id,
    type: item.type,
    title: item.title,
    titleFa: item.titleFa,
    titleEn: item.titleEn,
    poster: item.poster,
    backdrop: item.backdrop,
    description: content.Summary,
    rating: item.rating,
    year: propValue(content, 4),
    runtime: propValue(content, 27),
    age: propValue(content, 5),
    imdbId: propValue(content, 2),
    awards: propValue(content, 13),
    updateText: propValue(content, 48),
    genres: genreNames,
    genreTerms: categoryTerms.length
      ? categoryTerms
      : genreNames.map((name) => ({ name })),
    countries,
    languages,
    actors,
    directors,
    episodes,
    trailer,
    badges: item.badges,
    sourcePath: item.sourcePath,
    playUrl: item.type === "movie" ? `/watch/movie/${item.id}` : undefined,
    bodyHtml: content.Body,
  };
}

function qualityLabel(file: ApiAttachmentFile): string | undefined {
  if (file.Width && file.Width >= 1900) return "1080";
  if (file.Width && file.Width >= 1200) return "720";
  if (file.Width && file.Width >= 800) return "480";
  if (file.Width && file.Width >= 600) return "360";
  if (file.Width) return String(file.Width);

  return file.Quality ? String(file.Quality) : undefined;
}

function mimeType(file: ApiAttachmentFile): string | undefined {
  if (!file.Path) return undefined;
  if (file.Path.includes(".m3u8")) return "application/x-mpegURL";
  if (file.Path.includes(".mp4")) return "video/mp4";
  return undefined;
}

export function parseAttachmentLinks(
  attachment: ApiAttachment | undefined,
): EpisodeLink[] {
  if (!attachment?.Files?.length) {
    return [];
  }

  const faSubtitle = attachment.Files.find(
    (file) =>
      file.Type === 3 && /فارسی|persian|farsi/i.test(file.Description ?? ""),
  )?.Path;
  const enSubtitle = attachment.Files.find(
    (file) =>
      file.Type === 3 && /english|انگلیسی/i.test(file.Description ?? ""),
  )?.Path;

  return attachment.Files.filter(
    (file) =>
      (file.Type === 7 || file.Type === 8 || file.Type === 9) &&
      Boolean(file.Path),
  ).map((file) => ({
    quality: qualityLabel(file),
    src: file.Path as string,
    subtitleFa: faSubtitle,
    subtitleEn: enSubtitle,
    dubbed: attachment.IsDubbed,
  }));
}

export function parseEpisodes(
  payload: ApiEnvelope<AttachmentsApiResult>,
): SeriesEpisode[] {
  const result = assertOk(payload, "Gapfilm episodes are unavailable.");

  return (result.Attachments ?? [])
    .map((attachment) => ({
      season: attachment.SeasonId ?? 1,
      episode: attachment.EpisodeNo ?? 1,
      title: attachment.Title || `Episode ${attachment.EpisodeNo ?? 1}`,
      links: parseAttachmentLinks(attachment),
      poster: attachment.Thumbnail,
      runtime: attachment.DurationSeconds ? `${Math.ceil(attachment.DurationSeconds / 60)} دقیقه` : undefined,
    }))
    .sort((a, b) => a.season - b.season || a.episode - b.episode);
}

export function parsePlaybackFromAttachment(
  attachment: ApiAttachment | undefined,
  poster?: string,
): PlaybackData {
  const sources: PlaybackSource[] = parseAttachmentLinks(attachment).map(
    (link) => ({
      quality: link.quality,
      src: link.src,
      type: mimeType({ Path: link.src }),
      subtitleFa: link.subtitleFa,
      subtitleEn: link.subtitleEn,
      dubbed: link.dubbed,
    }),
  );

  return {
    poster: toProviderAssetProxyUrl(attachment?.Thumbnail) || poster,
    sources,
  };
}

export function attachmentsFromPayload(
  payload: ApiEnvelope<AttachmentsApiResult>,
): ApiAttachment[] {
  const result = assertOk(payload, "Gapfilm playback links are unavailable.");
  return result.Attachments ?? [];
}

export function parseTrailerFromPayload(
  payload: ApiEnvelope<AttachmentsApiResult>,
): PlaybackData | undefined {
  const result = assertOk(payload, "Gapfilm trailers are unavailable.");
  const trailer = result.Trailers?.find((item) =>
    item.Files?.some((file) => Boolean(file.Path)),
  );
  if (!trailer) return undefined;

  const playback = parsePlaybackFromAttachment(trailer);
  return playback.sources.length ? playback : undefined;
}
