import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import type {
  BrowseResult,
  HomeSection,
  MediaDetails,
  MediaItem,
  MediaType,
  PersonCredit,
  PlaybackData,
  PlaybackSource,
  SearchResult,
  SeriesEpisode,
  TaxonomyTerm,
} from "@/lib/providers/types";
import {
  homeSectionSchema,
  mediaDetailsSchema,
  playbackDataSchema,
  searchResultSchema,
} from "@/lib/providers/types";
import {
  SHABFOROOSH_PROVIDER_ID,
  dedupeMediaItems,
  isUsableMediaPath,
} from "@/lib/providers/shabforoosh/normalizers";
import {
  extractImdb,
  extractYear,
  normalizeText,
  splitMetaBadges,
} from "@/lib/utils/text";
import {
  extractIdFromPath,
  getCssBackgroundUrl,
  inferMediaTypeFromPath,
  toAbsoluteUrl,
  toProviderAssetProxyUrl,
  toSourcePath,
} from "@/lib/utils/url";

const FA_MOVIE = "\u0641\u06cc\u0644\u0645";
const FA_SERIES = "\u0633\u0631\u06cc\u0627\u0644";
const FA_DUBBED = "\u062f\u0648\u0628\u0644\u0647";
const FA_SUBTITLE = "\u0632\u06cc\u0631\u0646\u0648\u06cc\u0633";
const FA_FEATURED =
  "\u0627\u0633\u0644\u0627\u06cc\u062f\u0631 \u0648\u06cc\u0698\u0647";
const FA_EPISODE = "\u0642\u0633\u0645\u062a";

type MapiTerm = {
  id?: number | string;
  name?: string;
};

type MapiPerson = MapiTerm & {
  profile_actor?: string;
};

type MapiSearchItem = {
  id?: number | string;
  type?: string;
  title?: string;
  fa_title?: string;
  normalized_title?: string;
  permalink?: string;
  link?: string;
  image?: string;
  background_image?: string;
  thumbnail?: string;
  thumb?: string;
  background?: string | false;
  release?: string | number;
  imdb_rate?: string | number;
  metacritic_rate?: string | number;
  plot?: string;
  dubbed?: boolean;
  subtitle?: boolean;
  has_dubbed?: boolean | string;
  has_subtitle?: boolean | string;
  countries?: MapiTerm[];
  genres?: MapiTerm[];
  languages?: MapiTerm[];
};

type MapiListPayload = {
  data?: MapiSearchItem[];
  page?: number;
  /** MAPI uses total_page for the number of available pages. */
  total_page?: number | string;
  per_page?: number | string;
};

type MapiDetailsItem = MapiSearchItem & {
  image?: string;
  background_image?: string;
  second_title?: string;
  imdb_id?: string;
  age?: string;
  runtime?: string;
  summary_awards?: string;
  en_plot?: string;
  fa_plot?: string;
  trailer?: string;
  update_text?: string;
  actors?: MapiPerson[];
  directors?: MapiPerson[];
  player_links?: unknown;
  related_posts?: MapiSearchItem[];
};

type MapiDetailsPayload = {
  success?: boolean;
  data?: MapiDetailsItem;
};

type MapiEpisodePayload = {
  data?: {
    player_links?: Record<string, MapiEpisodePlayerLink>;
  };
};

type MapiEpisodePlayerLink = {
  play_link?: string;
  fasub_link?: string;
  ensub_link?: string;
};

function readMediaPath(href: string | undefined, baseUrl: string) {
  const sourcePath = toSourcePath(href, baseUrl);
  const id = extractIdFromPath(sourcePath);
  const type = inferMediaTypeFromPath(sourcePath);

  if (!id || !type) {
    return undefined;
  }

  return { id, type, sourcePath };
}

function readBadges(
  $: cheerio.CheerioAPI,
  root: cheerio.Cheerio<AnyNode>,
  fallbackText = "",
): string[] {
  const badges = new Set(splitMetaBadges(fallbackText));

  root
    .find(".vz-badge, .badge, .badges span, .yascode-badge")
    .each((_, element) => {
      const badge = normalizeText($(element).text());
      if (badge) {
        badges.add(badge);
      }
    });

  return [...badges];
}

function mapMApiType(type?: string): MediaType | undefined {
  const cleanType = normalizeText(type).toLowerCase();
  if (cleanType === "movie" || cleanType === "movies") {
    return "movie";
  }

  if (cleanType === "serie" || cleanType === "series") {
    return "series";
  }

  return undefined;
}

function hasFlag(value: boolean | string | undefined): boolean {
  return value === true || value === "on" || value === "1";
}

function readMApiBadges(item: MapiSearchItem): string[] {
  const badges: string[] = [];

  if (hasFlag(item.dubbed) || hasFlag(item.has_dubbed)) {
    badges.push(FA_DUBBED);
  }

  if (hasFlag(item.subtitle) || hasFlag(item.has_subtitle)) {
    badges.push(FA_SUBTITLE);
  }

  return badges;
}

function sourcePathFor(type: MediaType, id: string): string {
  return `/${type === "movie" ? "movies" : "series"}/${encodeURIComponent(id)}/`;
}

function sectionIdFromTitle(title: string): string {
  return encodeURIComponent(normalizeText(title))
    .replace(/%/g, "")
    .toLowerCase()
    .slice(0, 64);
}

function encodeSectionPath(path: string): string {
  return Buffer.from(path, "utf8").toString("base64url");
}

function normalizeAssetUrl(url?: string | false): string | undefined {
  if (!url) {
    return undefined;
  }

  return url.replace(
    /^https?:\/\/(?:www\.)?shabforoosh\.ir\/wp-content\/uploads\//i,
    "https://majnoonbazar.ir/wp-content/uploads/",
  );
}

function providerAssetUrl(
  url: string | false | undefined,
  baseUrl: string,
): string | undefined {
  return toProviderAssetProxyUrl(
    toAbsoluteUrl(normalizeAssetUrl(url), baseUrl),
  );
}

function normalizeTerms(terms?: MapiTerm[]): TaxonomyTerm[] | undefined {
  const normalized = (terms ?? [])
    .map((term) => ({
      id: term.id ? String(term.id) : undefined,
      name: normalizeText(term.name),
    }))
    .filter((term) => term.name);

  return normalized.length ? normalized : undefined;
}

function normalizePeople(people?: MapiPerson[]): PersonCredit[] | undefined {
  const normalized = (people ?? [])
    .map((person) => ({
      id: person.id ? String(person.id) : undefined,
      name: normalizeText(person.name),
      image:
        toProviderAssetProxyUrl(normalizeAssetUrl(person.profile_actor)) ||
        undefined,
    }))
    .filter((person) => person.name);

  return normalized.length ? normalized : undefined;
}

function mapiItemToMediaItem(
  item: MapiSearchItem,
  baseUrl: string,
  fallbackType?: MediaType,
): MediaItem | undefined {
  const type = mapMApiType(item.type) || fallbackType;
  const id = item.id ? String(item.id) : undefined;
  if (!type || !id) {
    return undefined;
  }

  const titleFa = normalizeText(item.fa_title);
  const titleEn = normalizeText(item.title || item.normalized_title);
  const sourcePath =
    readMediaPath(item.permalink || item.link, baseUrl)?.sourcePath ||
    sourcePathFor(type, id);

  return {
    provider: SHABFOROOSH_PROVIDER_ID,
    id,
    type,
    title:
      titleFa || titleEn || `${type === "movie" ? FA_MOVIE : FA_SERIES} ${id}`,
    titleFa: titleFa || undefined,
    titleEn: titleEn || undefined,
    poster: providerAssetUrl(
      item.thumbnail || item.thumb || item.image,
      baseUrl,
    ),
    backdrop: providerAssetUrl(
      item.background || item.background_image,
      baseUrl,
    ),
    rating: item.imdb_rate ? String(item.imdb_rate) : undefined,
    badges: readMApiBadges(item),
    sourcePath,
  };
}

type MapiHomeSection = {
  key?: string;
  title?: string;
  view_all?: {
    url?: string;
    paramters?: Record<string, string | number | boolean | null | undefined>;
    parameters?: Record<string, string | number | boolean | null | undefined>;
  };
  items?: MapiSearchItem[];
};

function homeSectionType(
  key: string,
  item: MapiSearchItem | undefined,
): MediaType | undefined {
  const normalized = key.toLowerCase();
  if (normalized === "series") return "series";
  if (normalized === "movies" || normalized === "cartoons") return "movie";

  return mapMApiType(item?.type) ||
    (normalizeText(item?.title).startsWith("سریال") ? "series" : "movie");
}

function sectionSourcePath(
  section: MapiHomeSection,
  baseUrl: string,
): string | undefined {
  const view = section.view_all;
  if (!view?.url) return undefined;

  try {
    const url = new URL(view.url, baseUrl);
    const params = view.paramters || view.parameters || {};
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    const key = normalizeText(section.key).toLowerCase();
    const title = normalizeText(section.title);
    if (key === "cartoons") {
      url.pathname = "/wp-json/mapi/v1/post/cartoons";
      url.search = "";
    } else if (key === "suggestions") {
      url.pathname = "/wp-json/mapi/v1/post/suggestions";
      url.search = "";
    } else if (
      key === "series" &&
      title.includes("جدیدترین")
    ) {
      // The upstream home payload currently advertises a stale genres=520
      // parameter for this rail; the unfiltered series archive is canonical.
      url.search = "";
    }

    return `${url.pathname}${url.search}`;
  } catch {
    return undefined;
  }
}

/**
 * The current Shabforoosh home page is backed by this JSON endpoint.  It is
 * more reliable than the WordPress HTML page (which can return 500) and its
 * `view_all` URL is the canonical cursor for a complete section.
 */
export function parseMApiHomeSections(
  jsonText: string,
  baseUrl: string,
): HomeSection[] {
  const payload = JSON.parse(jsonText) as {
    success?: boolean;
    data?: { sections?: MapiHomeSection[] };
  };

  return (payload.data?.sections ?? []).flatMap((section, index) => {
    const key = normalizeText(section.key);
    const rawItems = section.items ?? [];
    const items = rawItems
      .map((item) =>
        mapiItemToMediaItem(item, baseUrl, homeSectionType(key, item)),
      )
      .filter((item): item is MediaItem => Boolean(item));
    if (!items.length) return [];

    const sourcePath = sectionSourcePath(section, baseUrl);
    const title = normalizeText(section.title) ||
      `${key === "series" ? FA_SERIES : FA_MOVIE}`;
    const isSnapshotOnly = /(?:^|\s)250(?:\s|$)/.test(title);

    return [{
      id: `${SHABFOROOSH_PROVIDER_ID}-mapi-${index}-${sectionIdFromTitle(title)}`,
      title,
      type: index === 0 ? "slider" : "rail",
      items: dedupeMediaItems(items),
      provider: SHABFOROOSH_PROVIDER_ID,
      sourceId:
        sourcePath && !isSnapshotOnly
          ? encodeSectionPath(sourcePath)
          : undefined,
      sourceType: "mapi",
      page: 1,
      perPage: items.length,
      totalPages: isSnapshotOnly ? 1 : undefined,
      hasMore: Boolean(sourcePath) && !isSnapshotOnly,
    } satisfies HomeSection];
  });
}

function htmlMediaItem(input: {
  id: string;
  type: MediaType;
  sourcePath: string;
  title: string;
  poster?: string;
  backdrop?: string;
  rating?: string;
  badges?: string[];
}): MediaItem {
  return {
    provider: SHABFOROOSH_PROVIDER_ID,
    id: input.id,
    type: input.type,
    title: input.title,
    titleFa: input.title,
    poster: input.poster,
    backdrop: input.backdrop,
    rating: input.rating,
    badges: input.badges ?? [],
    sourcePath: input.sourcePath,
  };
}

export function parseMApiSearchResults(
  jsonText: string,
  baseUrl: string,
): SearchResult[] {
  const payload = JSON.parse(jsonText) as MapiListPayload;
  const results: SearchResult[] = [];

  for (const item of payload.data ?? []) {
    const media = mapiItemToMediaItem(item, baseUrl);
    if (!media) {
      continue;
    }

    const parsed = searchResultSchema.safeParse({
      provider: media.provider,
      id: media.id,
      type: media.type,
      titleFa: media.titleFa,
      titleEn: media.titleEn,
      poster: media.poster,
      imdb: media.rating,
      badges: media.badges,
      sourcePath: media.sourcePath,
    });

    if (parsed.success) {
      results.push(parsed.data);
    }
  }

  return dedupeMediaItems(results);
}

export function parseMApiBrowse(
  jsonText: string,
  baseUrl: string,
): BrowseResult {
  const payload = JSON.parse(jsonText) as MapiListPayload;
  const items = (payload.data ?? [])
    .map((item) => mapiItemToMediaItem(item, baseUrl))
    .filter((item): item is MediaItem => Boolean(item));
  const page = Math.max(1, Number(payload.page || 1));
  const perPage = Math.max(
    1,
    Number(payload.per_page || items.length || 12),
  );
  const declaredPages = Number(payload.total_page);
  const totalPages =
    Number.isFinite(declaredPages) && declaredPages > 0
      ? Math.max(page, Math.floor(declaredPages))
      : items.length < perPage
        ? page
        : page + 1;

  return {
    items: dedupeMediaItems(items),
    page,
    totalPages,
    perPage,
  };
}

function parseQuality(label?: string): string | undefined {
  return normalizeText(label).match(/([1-9][0-9]{2,3})p?/i)?.[1];
}

function parseMoviePlaybackLinks(links: unknown): PlaybackSource[] {
  if (!links || typeof links !== "object") {
    return [];
  }

  const items = Array.isArray(links)
    ? links
    : Object.values(links as Record<string, unknown>);
  const sources: PlaybackSource[] = [];

  for (const link of items) {
    const record = link as {
      play_link?: string;
      quality_link?: string;
      fasub_link?: string;
      ensub_link?: string;
      type_link?: string;
    };
    if (!record.play_link) {
      continue;
    }

    sources.push({
      quality: parseQuality(record.quality_link),
      src: record.play_link,
      type: inferVideoType(record.play_link),
      subtitleFa: record.fasub_link || undefined,
      subtitleEn: record.ensub_link || undefined,
      dubbed: record.type_link === "dub",
    });
  }

  return sources.sort(
    (a, b) => Number(b.quality || 0) - Number(a.quality || 0),
  );
}

function parseSeriesEpisodes(
  playerLinks: unknown,
): SeriesEpisode[] | undefined {
  if (!playerLinks || typeof playerLinks !== "object") {
    return undefined;
  }

  const episodes = new Map<string, SeriesEpisode>();
  const groups = Array.isArray(playerLinks)
    ? playerLinks
    : Object.values(playerLinks as Record<string, unknown>);

  groups.forEach((group) => {
    const record = group as {
      season_name?: string;
      quality_link?: string;
      type_link?: string;
      items?: Array<{
        play_link?: string;
        fasub_link?: string;
        ensub_link?: string;
      }>;
    };
    const season = Number(
      normalizeText(record.season_name).match(/\d+/)?.[0] || 1,
    );
    const quality = parseQuality(record.quality_link);
    const dubbed = record.type_link === "dub";

    record.items?.forEach((item, index) => {
      if (!item.play_link) {
        return;
      }

      const episode = index + 1;
      const key = `${season}-${episode}`;
      const current =
        episodes.get(key) ??
        ({
          season,
          episode,
          title: `${FA_EPISODE} ${episode}`,
          links: [],
        } satisfies SeriesEpisode);

      current.links.push({
        quality,
        src: item.play_link,
        subtitleFa: item.fasub_link || undefined,
        subtitleEn: item.ensub_link || undefined,
        dubbed,
      });
      episodes.set(key, current);
    });
  });

  const list = [...episodes.values()].sort(
    (a, b) => a.season - b.season || a.episode - b.episode,
  );
  return list.length ? list : undefined;
}

export function parseMApiDetails(
  jsonText: string,
  baseUrl: string,
  fallback: { id: string; type: MediaType },
): MediaDetails {
  const payload = JSON.parse(jsonText) as MapiDetailsPayload;
  const data = payload.data;
  if (!data) {
    throw new Error("Invalid mapi details payload.");
  }

  const type = mapMApiType(data.type) || fallback.type;
  const id = data.id ? String(data.id) : fallback.id;
  const titleFa = normalizeText(data.fa_title);
  const titleEn = normalizeText(
    data.title || data.second_title || data.normalized_title,
  );
  const genreTerms = normalizeTerms(data.genres);
  const related = (data.related_posts ?? [])
    .map((item) => mapiItemToMediaItem(item, baseUrl))
    .filter((item): item is MediaItem => Boolean(item));
  const description = normalizeText(data.fa_plot || data.en_plot || data.plot);
  const poster = providerAssetUrl(
    data.image || data.thumbnail || data.thumb,
    baseUrl,
  );
  const backdrop = providerAssetUrl(
    data.background_image || data.background,
    baseUrl,
  );
  const trailerUrl = toAbsoluteUrl(data.trailer, baseUrl);
  const episodes = type === "series"
    ? parseSeriesEpisodes(data.player_links)?.map((episode) => ({ ...episode, poster: episode.poster || poster }))
    : undefined;

  const parsed = mediaDetailsSchema.safeParse({
    provider: SHABFOROOSH_PROVIDER_ID,
    id,
    type,
    title:
      titleFa || titleEn || `${type === "movie" ? FA_MOVIE : FA_SERIES} ${id}`,
    titleFa: titleFa || undefined,
    titleEn: titleEn || undefined,
    poster,
    backdrop,
    description: description || undefined,
    rating: data.imdb_rate ? String(data.imdb_rate) : undefined,
    metacritic: data.metacritic_rate ? String(data.metacritic_rate) : undefined,
    year: data.release ? String(data.release) : undefined,
    runtime: normalizeText(data.runtime) || undefined,
    age: normalizeText(data.age) || undefined,
    imdbId: normalizeText(data.imdb_id) || undefined,
    awards: normalizeText(data.summary_awards) || undefined,
    updateText: normalizeText(data.update_text) || undefined,
    genres: genreTerms?.map((term) => term.name),
    genreTerms,
    countries: normalizeTerms(data.countries),
    languages: normalizeTerms(data.languages),
    actors: normalizePeople(data.actors),
    directors: normalizePeople(data.directors),
    episodes,
    related: related.length ? related : undefined,
    trailer: trailerUrl
      ? {
          poster: backdrop || poster,
          sources: [{ src: trailerUrl, type: inferVideoType(trailerUrl) }],
        }
      : undefined,
    badges: readMApiBadges(data),
    sourcePath: sourcePathFor(type, id),
    playUrl:
      type === "movie"
        ? `/watch/movie/${encodeURIComponent(id)}?dubbed=0`
        : undefined,
  });

  if (!parsed.success) {
    throw new Error("Invalid normalized mapi details payload.");
  }

  return parsed.data;
}

export function parseMApiMoviePlayback(jsonText: string): PlaybackData {
  const payload = JSON.parse(jsonText) as MapiDetailsPayload;
  return {
    poster: providerAssetUrl(
      payload.data?.background_image || payload.data?.image,
      "https://shabforoosh.ir",
    ),
    sources: parseMoviePlaybackLinks(payload.data?.player_links),
  };
}

export function parseMApiEpisodePlayback(jsonText: string): PlaybackData {
  const payload = JSON.parse(jsonText) as MapiEpisodePayload;
  const links = payload.data?.player_links ?? {};
  const sources: PlaybackSource[] = [];

  for (const [qualityLabel, link] of Object.entries(links)) {
    if (!link.play_link) {
      continue;
    }

    sources.push({
      quality: parseQuality(qualityLabel),
      src: link.play_link,
      type: inferVideoType(link.play_link),
      subtitleFa: link.fasub_link || undefined,
      subtitleEn: link.ensub_link || undefined,
      dubbed: qualityLabel.includes("dub"),
    });
  }

  sources.sort((a, b) => Number(b.quality || 0) - Number(a.quality || 0));

  return { sources };
}

export function parseSearchResults(
  html: string,
  baseUrl: string,
): SearchResult[] {
  const $ = cheerio.load(html);
  const results: SearchResult[] = [];
  const anchors = $("#results a.card").length
    ? $("#results a.card")
    : $('a[href*="/movies/"], a[href*="/series/"]').filter((_, element) =>
        isUsableMediaPath(toSourcePath($(element).attr("href"), baseUrl)),
      );

  anchors.each((_, element) => {
    const root = $(element);
    const media = readMediaPath(root.attr("href"), baseUrl);
    if (!media) {
      return;
    }

    const meta = normalizeText(root.find(".meta").text());
    const titleFa =
      normalizeText(root.find(".title-fa").text()) ||
      normalizeText(root.attr("title")) ||
      undefined;
    const titleEn = normalizeText(root.find(".title-en").text()) || undefined;
    const poster = providerAssetUrl(
      root.find("img").first().attr("src"),
      baseUrl,
    );

    const parsed = searchResultSchema.safeParse({
      provider: SHABFOROOSH_PROVIDER_ID,
      id: media.id,
      type: media.type,
      titleFa,
      titleEn,
      poster,
      imdb: extractImdb(meta),
      badges: readBadges($, root, meta),
      sourcePath: media.sourcePath,
    });

    if (parsed.success) {
      results.push(parsed.data);
    }
  });

  return dedupeMediaItems(results);
}

export function parseArchiveMediaItems(
  html: string,
  baseUrl: string,
): MediaItem[] {
  const $ = cheerio.load(html);
  const items: MediaItem[] = [];

  $("a[href*='/movies/'], a[href*='/series/']").each((_, anchor) => {
    const link = $(anchor);
    const media = readMediaPath(link.attr("href"), baseUrl);
    if (!media) {
      return;
    }

    const card = link.closest(
      "article, .vz-item, .item, .post, .movie-item, .serial-item",
    );
    const root = card.length ? card : link;
    const title =
      normalizeText(
        root.find(".vz-title, .title, h2, h3, strong").first().text(),
      ) || normalizeText(link.attr("title") || link.text());
    const poster = providerAssetUrl(
      normalizeAssetUrl(
        root.find("img").first().attr("src") ||
          root.find("img").first().attr("data-src"),
      ),
      baseUrl,
    );
    const rating =
      normalizeText(root.find(".vz-rate, .rate, .imdb").first().text()) ||
      undefined;

    if (!title) {
      return;
    }

    items.push(
      htmlMediaItem({
        ...media,
        title,
        poster,
        rating,
        badges: readBadges($, root),
      }),
    );
  });

  return dedupeMediaItems(items);
}

export function parseHomeSections(
  html: string,
  baseUrl: string,
): HomeSection[] {
  const $ = cheerio.load(html);
  const sections: HomeSection[] = [];
  const heroItems: MediaItem[] = [];

  $(
    ".yascode-featured-slider .swiper-slide, .swiper-container .swiper-slide",
  ).each((_, element) => {
    const root = $(element);
    const link = root
      .find(".yascode-title a, a[href*='/movies/'], a[href*='/series/']")
      .first();
    const media = readMediaPath(link.attr("href"), baseUrl);
    if (!media) {
      return;
    }

    const slideItem = root.find(".yascode-slide-item").first();
    const title = normalizeText(link.text() || link.attr("title"));
    heroItems.push(
      htmlMediaItem({
        ...media,
        title,
        backdrop: toProviderAssetProxyUrl(
          getCssBackgroundUrl(slideItem.attr("style"), baseUrl),
        ),
        rating:
          normalizeText(root.find(".yascode-rate").first().text()) || undefined,
        badges: readBadges($, root),
      }),
    );
  });

  const uniqueHero = dedupeMediaItems(heroItems).filter((item) => item.title);
  if (uniqueHero.length) {
    sections.push({
      id: "featured",
      title: FA_FEATURED,
      type: "slider",
      items: uniqueHero,
    });
  }

  $(".vz-section").each((_, element) => {
    const root = $(element);
    const templateHtml = root.find("template").first().html();
    const section$ = templateHtml ? cheerio.load(templateHtml) : $;
    const sectionTitle = normalizeText(
      templateHtml
        ? section$(".vz-headline h3, h2, h3").first().text()
        : root.find(".vz-headline h3, h2, h3").first().text(),
    );

    if (!sectionTitle) {
      return;
    }

    const items: MediaItem[] = [];
    const anchors = templateHtml
      ? section$(".vz-item a, article a")
      : root.find(".vz-item a, article a");
    const moreHref =
      (templateHtml
        ? section$(".vz-headline a, .vz-more a, a.more").first().attr("href")
        : root
            .find(".vz-headline a, .vz-more a, a.more")
            .first()
            .attr("href")) || undefined;
    const morePath = moreHref ? toSourcePath(moreHref, baseUrl) : undefined;

    anchors.each((__, anchor) => {
      const link = section$(anchor);
      const media = readMediaPath(link.attr("href"), baseUrl);
      if (!media) {
        return;
      }

      const title = normalizeText(
        link.find(".vz-title, strong").first().text() || link.attr("title"),
      );
      const poster = providerAssetUrl(
        link.find("img").first().attr("src") ||
          link.find("img").first().attr("data-src"),
        baseUrl,
      );
      const rating =
        normalizeText(link.find(".vz-rate, .rate").first().text()) || undefined;

      if (!title) {
        return;
      }

      items.push(
        htmlMediaItem({
          ...media,
          title,
          poster,
          rating,
          badges: readBadges(section$, link),
        }),
      );
    });

    const uniqueItems = dedupeMediaItems(items);
    if (uniqueItems.length) {
      const parsed = homeSectionSchema.safeParse({
        id: `section-${sectionIdFromTitle(sectionTitle)}`,
        title: sectionTitle,
        type: "rail",
        items: uniqueItems,
        provider: SHABFOROOSH_PROVIDER_ID,
        sourceId: morePath ? encodeSectionPath(morePath) : undefined,
        sourceType: morePath?.startsWith("/genre/")
          ? sectionTitle.includes(FA_SERIES)
            ? "genre-series"
            : "genre-movie"
          : morePath?.startsWith("/seriegenre/")
            ? "genre-series"
            : morePath?.startsWith("/country/")
              ? sectionTitle.includes(FA_SERIES)
                ? "country-series"
                : "country-movie"
              : "path",
      });

      if (parsed.success) {
        sections.push(parsed.data);
      }
    }
  });

  return sections;
}

export function parseDetails(
  html: string,
  baseUrl: string,
  input: { id: string; type: MediaType; sourcePath: string },
): MediaDetails {
  const $ = cheerio.load(html);
  const bodyText = normalizeText($("body").text());
  const title =
    normalizeText($("h1").first().text()) ||
    normalizeText(
      $(".title, .post-title, .movie-title, .yascode-title").first().text(),
    ) ||
    `${input.type === "movie" ? FA_MOVIE : FA_SERIES} ${input.id}`;
  const poster = providerAssetUrl(
    $(".poster img, .post-poster img, .movie-poster img, img")
      .first()
      .attr("src") || $("meta[property='og:image']").attr("content"),
    baseUrl,
  );
  const description =
    normalizeText(
      $(".description, .post-content, .story, .summary, .entry-content p")
        .first()
        .text(),
    ) || undefined;
  const rating =
    normalizeText(
      $(".imdb, .rating, .vz-rate, .yascode-rate").first().text(),
    ).replace(/^IMDb\s*/i, "") || undefined;
  const playPath = toSourcePath(
    $("a[href*='/play/']").first().attr("href"),
    baseUrl,
  );
  const genres = $(".genre a, a[href*='/genre/']")
    .map((_, element) => normalizeText($(element).text()))
    .get()
    .filter(Boolean);
  const badges = readBadges($, $("body"), bodyText);

  const parsed = mediaDetailsSchema.safeParse({
    provider: SHABFOROOSH_PROVIDER_ID,
    id: input.id,
    type: input.type,
    title,
    poster,
    description,
    rating,
    year: extractYear(bodyText),
    genres: genres.length ? [...new Set(genres)] : undefined,
    badges,
    sourcePath: input.sourcePath,
    playUrl: playPath.startsWith("/play/") ? playPath : undefined,
  });

  if (parsed.success) {
    return parsed.data;
  }

  return {
    provider: SHABFOROOSH_PROVIDER_ID,
    id: input.id,
    type: input.type,
    title,
    poster,
    badges,
    sourcePath: input.sourcePath,
  };
}

function inferQuality(src: string, size?: string): string | undefined {
  return normalizeText(size) || src.match(/([1-9][0-9]{2,3})p/i)?.[1];
}

function inferVideoType(src: string, type?: string): string | undefined {
  if (type) {
    return type;
  }

  if (src.includes(".m3u8")) {
    return "application/x-mpegURL";
  }

  if (src.includes(".mp4")) {
    return "video/mp4";
  }

  return undefined;
}

export function parsePlayback(html: string, baseUrl: string): PlaybackData {
  const $ = cheerio.load(html);
  const video = $("video#video-player").first();
  const poster = providerAssetUrl(
    video.attr("poster") || video.attr("data-poster"),
    baseUrl,
  );
  const sources: PlaybackSource[] = [];

  video.find("source").each((_, element) => {
    const source = $(element);
    const src = toAbsoluteUrl(source.attr("src"), baseUrl);
    if (!src) {
      return;
    }

    sources.push({
      quality: inferQuality(
        src,
        source.attr("size") || source.attr("data-quality"),
      ),
      src,
      type: inferVideoType(src, source.attr("type")),
    });
  });

  if (!sources.length) {
    const src = toAbsoluteUrl(video.attr("src"), baseUrl);
    if (src) {
      sources.push({
        quality: inferQuality(src),
        src,
        type: inferVideoType(src),
      });
    }
  }

  const sortedSources = sources.sort(
    (a, b) => Number(b.quality || 0) - Number(a.quality || 0),
  );
  const parsed = playbackDataSchema.safeParse({
    poster,
    sources: sortedSources,
  });

  return parsed.success ? parsed.data : { poster, sources: [] };
}
