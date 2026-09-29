import type {
  HomeSection,
  MediaDetails,
  MediaItem,
  PlaybackData,
  ProviderCategory,
  SearchResult,
  SeriesEpisode,
  TaxonomyTerm,
} from "@/lib/providers/types";

export const FILIMO_PROVIDER_ID = "filimo";
type JsonObject = Record<string, unknown>;

function object(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number") return String(value);
  return undefined;
}

function attrs(value: unknown): JsonObject {
  const item = object(value);
  return { ...item, ...object(item.attributes) };
}

function firstUrl(value: unknown, depth = 0): string | undefined {
  if (depth > 5) return undefined;
  if (typeof value === "string") {
    const clean = value.trim().replace(/\\u0026/g, "&");
    if (/^https?:\/\//i.test(clean)) return clean;
    return undefined;
  }
  if (Array.isArray(value)) {
    for (const child of value) {
      const found = firstUrl(child, depth + 1);
      if (found) return found;
    }
    return undefined;
  }
  const item = object(value);
  for (const key of ["src", "url", "path", "link", "image", "pic", "cover"]) {
    const found = firstUrl(item[key], depth + 1);
    if (found) return found;
  }
  for (const child of Object.values(item)) {
    const found = firstUrl(child, depth + 1);
    if (found) return found;
  }
  return undefined;
}

function pickUrl(item: JsonObject, keys: string[]): string | undefined {
  for (const key of keys) {
    const found = firstUrl(item[key]);
    if (found) return found;
  }
  return undefined;
}

function proxiedMediaUrl(url: string): string {
  return `/api/provider-media?url=${encodeURIComponent(url)}`;
}

function rating(value: unknown): string | undefined {
  const raw = text(value) || text(object(value).average) || text(object(value).rate);
  if (!raw) return undefined;
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric.toFixed(numeric % 1 ? 1 : 0) : raw;
}

function isSeries(item: JsonObject): boolean {
  const serial = item.serial;
  const serialObject = object(serial);
  return (
    serial === true ||
    serialObject.enable === true ||
    Boolean(item.is_series) ||
    /series|serial|سریال/i.test(text(item.content_type) || "")
  );
}

function cleanTitle(value: string | undefined, fallback = "فیلم و سریال"): string {
  const result = (value || fallback)
    .replace(/فیلیمو/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s‌:؛،-]+|[\s‌:؛،-]+$/g, "")
    .trim();
  return result || fallback;
}

function badgeList(item: JsonObject): string[] {
  const badges = new Set<string>();
  const badge = text(item.badge) || text(item.badge_movies);
  if (badge) badges.add(badge);
  if (item.dubbed || item.is_dubbed) badges.add("دوبله فارسی");
  if (item.subtitle || item.has_subtitle) badges.add("زیرنویس");
  const year = text(item.pro_year);
  if (year) badges.add(year);
  return [...badges];
}

export function toMediaItem(value: unknown): MediaItem | undefined {
  const item = attrs(value);
  const id = text(item.uid) || text(item.link_key) || text(item.movie_id) || text(item.id);
  const titleFa =
    text(item.movie_title) || text(item.title_fa) || text(item.title) || text(item.parent_title);
  if (!id || !titleFa) return undefined;
  const type = isSeries(item) ? "series" : "movie";

  return {
    provider: FILIMO_PROVIDER_ID,
    id,
    type,
    title: titleFa,
    titleFa,
    titleEn: text(item.movie_title_en) || text(item.title_en),
    poster: pickUrl(item, ["pic", "thumbplay", "thumbnails", "cover_mobile", "cover"]),
    backdrop: pickUrl(item, ["cover_desktop", "cover", "cover_data", "cover_video"]),
    rating: rating(item.imdb_rate) || rating(item.rate_avrage),
    badges: badgeList(item),
    sourcePath: `/m/${id}`,
  };
}

type IncludedIndex = Map<string, unknown>;

function includedKey(value: unknown): string | undefined {
  const item = object(value);
  const type = text(item.type);
  const id = text(item.id);
  return type && id ? `${type}:${id}` : undefined;
}

function makeIncludedIndex(payload: unknown): IncludedIndex {
  const index: IncludedIndex = new Map();
  for (const record of array(object(payload).included)) {
    const key = includedKey(record);
    if (key) index.set(key, record);
  }
  return index;
}

function relationshipRecords(
  value: unknown,
  included: IncludedIndex,
): unknown[] {
  const relationships = object(object(value).relationships);
  for (const key of ["movies", "headersliders", "posters", "contents", "episodes"]) {
    const refs = array(object(relationships[key]).data);
    const resolved = refs.flatMap((ref) => {
      const record = included.get(includedKey(ref) || "");
      return record ? [record] : [];
    });
    if (resolved.length) return resolved;
  }
  return [];
}

function nestedRecords(value: unknown, included?: IncludedIndex): unknown[] {
  const item = attrs(value);
  for (const key of ["movies", "headersliders", "posters", "contents", "episodes"]) {
    const direct = array(item[key]);
    if (direct.length) return direct;
    const data = array(object(item[key]).data);
    if (data.length) return data;
  }
  if (included) {
    const related = relationshipRecords(value, included);
    if (related.length) return related;
  }
  return [];
}

export function collectMediaItems(payload: unknown): MediaItem[] {
  const root = object(payload);
  const rows = array(root.data);
  const included = array(root.included);
  const includedIndex = makeIncludedIndex(payload);
  const records: unknown[] = [];

  for (const row of rows) {
    const nested = nestedRecords(row, includedIndex);
    if (nested.length) records.push(...nested);
    else records.push(row);
  }
  if (!records.length || records.every((record) => !toMediaItem(record))) {
    records.push(...included);
  }

  const seen = new Set<string>();
  return records.flatMap((record) => {
    const item = toMediaItem(record);
    if (!item) return [];
    const key = `${item.type}:${item.id}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [item];
  });
}

export function parseHomeSections(payload: unknown): HomeSection[] {
  const included = makeIncludedIndex(payload);
  return array(object(payload).data).flatMap((rowValue, index) => {
    const row = attrs(rowValue);
    const records = nestedRecords(rowValue, included);
    const items = records.flatMap((record) => {
      const item = toMediaItem(record);
      return item ? [item] : [];
    });
    if (!items.length) return [];
    const sourceId = text(row.link_key) || text(row.list_tag_id) || text(row.id) || String(index);
    const headerSliderItems = nestedRecords(
      { ...row, relationships: object(rowValue).relationships },
      included,
    );
    const isHeaderSlider =
      text(row.output_type) === "headerslider" ||
      (headerSliderItems.length > 0 &&
        relationshipRecords(rowValue, included).some((record) =>
          includedKey(record)?.startsWith("headersliders:"),
        ));
    return [{
      id: `${FILIMO_PROVIDER_ID}-${text(row.id) || sourceId}`,
      title: cleanTitle(text(row.link_text) || text(row.title), index ? "پیشنهادهای تازه" : "منتخب‌ها"),
      type: isHeaderSlider ? "slider" : "rail",
      items,
      provider: FILIMO_PROVIDER_ID,
      sourceId,
      sourceType: "tag",
    } satisfies HomeSection];
  });
}

export type FilimoSectionPage = {
  title: string;
  items: MediaItem[];
  sourceId: string;
  sourceType: string;
  page: number;
  perPage: number;
  totalPages?: number;
  hasMore: boolean;
  nextUrl?: string;
  isInfinite: boolean;
};

function rowRecords(row: JsonObject, included: IncludedIndex): unknown[] {
  return nestedRecords(row, included);
}

/**
 * Selects the actual infinite/grid row from a tag response.  Tag landing
 * pages often contain breadcrumb and editorial rails before the row that owns
 * the `loadmore` link; flattening all rows makes unrelated films appear and
 * loses the cursor.
 */
export function parseSectionPage(
  payload: unknown,
  requestedId: string,
  page: number,
): FilimoSectionPage {
  const root = object(payload);
  const included = makeIncludedIndex(payload);
  const rows = array(root.data).map((value) => attrs(value));
  const meta = object(root.meta);
  const metaId = text(meta.id);
  const normalizedRequested = requestedId.split("__FILTER__")[0];
  const candidates = rows
    .map((row, index) => ({
      row,
      index,
      records: rowRecords(
        array(root.data)[index] as JsonObject,
        included,
      ),
    }))
    .filter((candidate) => candidate.records.length);

  const selected =
    candidates.find(({ row }) =>
      text(row.more_type) === "infinity" &&
      [row.tag_id, row.list_tag_id, row.dataSource_key, metaId]
        .map(text)
        .includes(normalizedRequested),
    ) ||
    candidates.find(({ row }) => text(row.more_type) === "infinity") ||
    candidates.at(-1);

  const row = selected?.row || {};
  const records = selected?.records || [];
  const items = records.flatMap((record) => {
    const item = toMediaItem(record);
    return item ? [item] : [];
  });
  const links = object(row.links);
  const nextUrl = text(links.next) || text(links.forward);
  const rawMoreRecords = links.more_records;
  const isInfinite = text(row.more_type) === "infinity";
  const moreRecords =
    typeof rawMoreRecords === "boolean"
      ? rawMoreRecords
      : typeof rawMoreRecords === "string"
        ? !/^(false|0|no)$/i.test(rawMoreRecords.trim())
      : Boolean(nextUrl);
  const perPage =
    Number(row.limit) ||
    items.length ||
    Number(meta.per_page) ||
    40;

  return {
    title: cleanTitle(
      text(row.link_text) || text(meta.title),
      "فیلم و سریال",
    ),
    items,
    sourceId: requestedId,
    sourceType: "tag",
    page,
    perPage,
    totalPages: moreRecords ? undefined : page,
    hasMore: moreRecords && items.length > 0,
    nextUrl,
    isInfinite,
  };
}

export function parseSearch(payload: unknown): SearchResult[] {
  return collectMediaItems(payload).map((item) => ({
    provider: item.provider,
    id: item.id,
    type: item.type,
    titleFa: item.titleFa,
    titleEn: item.titleEn,
    poster: item.poster,
    imdb: item.rating,
    badges: item.badges,
    sourcePath: item.sourcePath,
  }));
}

function terms(value: unknown): TaxonomyTerm[] | undefined {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  const result = values.flatMap((entry) => {
    if (typeof entry === "string") return [{ name: entry.trim() }];
    const item = attrs(entry);
    const name = text(item.title) || text(item.name) || text(item.link_text);
    return name ? [{ id: text(item.id) || text(item.link_key), name }] : [];
  }).filter((entry) => entry.name);
  return result.length ? result : undefined;
}

function people(value: unknown) {
  const values = Array.isArray(value) ? value : array(object(value).data);
  const result = values.flatMap((entry) => {
    const item = attrs(entry);
    const name = text(item.name) || text(item.full_name) || text(item.title);
    return name ? [{ id: text(item.id) || text(item.uid), name, image: pickUrl(item, ["pic", "image", "cover"]) }] : [];
  });
  return result.length ? result : undefined;
}

function trailerFromGeneral(general: JsonObject): PlaybackData | undefined {
  const video = object(general.cover_video_data);
  const src = firstUrl(video.horizontal) || firstUrl(general.cover_video);
  if (!src) return undefined;
  return {
    poster: pickUrl(general, ["cover_data", "cover", "thumbplay"]),
    sources: [{ src: proxiedMediaUrl(src), type: /\.m3u8(?:\?|$)/i.test(src) || text(video.hor_type) === "m3u8" ? "application/vnd.apple.mpegurl" : "video/mp4" }],
  };
}

export function parseDetails(payload: unknown, episodes?: SeriesEpisode[]): MediaDetails {
  const data = attrs(object(payload).data);
  const general = attrs(data.General || data.general || data);
  const id = text(general.uid) || text(data.uid) || text(general.id) || "unknown";
  const titleFa = text(general.title_fa) || text(general.movie_name) || text(general.title) || "فیلم و سریال";
  const genreTerms = terms(general.categories);
  const serial = object(general.serial);
  const type = isSeries(general) || serial.enable === true ? "series" : "movie";
  return {
    provider: FILIMO_PROVIDER_ID,
    id,
    type,
    title: titleFa,
    titleFa,
    titleEn: text(general.title_en),
    poster: pickUrl(general, ["thumbplay", "thumbnails", "cover_mobile", "cover_data", "cover"]),
    backdrop: pickUrl(general, ["cover_data", "cover", "cover_video_data"]),
    description: text(general.descr) || text(general.movie_detail),
    rating: rating(general.imdb_rate),
    year: text(general.pro_year),
    runtime: text(general.duration),
    age: text(general.age_range),
    genres: genreTerms?.map((term) => term.name),
    genreTerms,
    countries: terms(general.countries || general.country),
    actors: people(general.cast),
    directors: people(general.director),
    episodes,
    trailer: trailerFromGeneral(general),
    badges: badgeList(general),
    sourcePath: `/m/${id}`,
  };
}

export function parseSeasons(payload: unknown): Array<{ season: number; episodesLink: string }> {
  const data = attrs(object(payload).data);
  return array(data.data).flatMap((value, index) => {
    const item = attrs(value);
    const episodesLink = text(item.episodes_link);
    if (!episodesLink) return [];
    return [{ season: Number(item.serial_season_part) || index + 1, episodesLink }];
  });
}

export function parseEpisodes(payload: unknown, season: number): SeriesEpisode[] {
  const items = collectMediaItems(payload);
  const rawRecords = [
    ...array(object(payload).data).flatMap((row) => nestedRecords(row)),
    ...array(object(payload).included),
  ];
  return items.flatMap((item, index) => {
    const raw = attrs(rawRecords.find((entry) => {
      const candidate = attrs(entry);
      return text(candidate.uid) === item.id || text(candidate.link_key) === item.id;
    }));
    const watchAction = object(raw.watch_action);
    const publishDate = text(raw.publish_date);
    const isUnreleased =
      text(watchAction.type) === "commingsoon" ||
      text(raw.watch_list_action) === "commingsoon" ||
      (publishDate ? new Date(publishDate.replace(" ", "T")).getTime() > Date.now() : false);
    if (isUnreleased) return [];
    const serial = object(raw.serial);
    return [{
      season,
      episode: Number(serial.serial_part || raw.serial_part || raw.episode) || index + 1,
      title: item.titleFa || item.title,
      links: [],
      playbackId: item.id,
      poster: item.poster || pickUrl(raw, ["pic", "thumbplay", "thumbnails", "cover_mobile", "cover"]),
      runtime: text(raw.minute_duration) || text(raw.duration),
    }];
  });
}

export function parsePlayback(payload: unknown): PlaybackData {
  const data = attrs(object(payload).data);
  const multiSource = data.multiSRC;
  const sourceValues = Array.isArray(multiSource)
    ? multiSource
    : array(object(multiSource).value);
  const sources = sourceValues.flat(Infinity).flatMap((value) => {
    const item = attrs(value);
    const src = text(item.src);
    if (!src) return [];
    return [{
      src: proxiedMediaUrl(src),
      type: text(item.type) || (/\.m3u8(?:\?|$)/i.test(src) ? "application/vnd.apple.mpegurl" : undefined),
      quality: text(item.label) || text(item.quality) || text(item.resolution),
    }];
  });
  return { poster: firstUrl(data.poster), sources };
}

export function parseCategories(payload: unknown): ProviderCategory[] {
  const seen = new Set<string>();
  return array(object(payload).data).flatMap((value) => {
    const item = attrs(value);
    const label = text(item.link_text) || text(item.title);
    const id = text(item.link_key) || text(item.id);
    if (!label || !id || seen.has(id) || !/list|tag|category/i.test(text(item.link_type) || "list")) return [];
    seen.add(id);
    return [{
      provider: FILIMO_PROVIDER_ID,
      key: encodeURIComponent(label.toLowerCase().replace(/\s+/g, "-")),
      label: cleanTitle(label, label),
      movieId: id,
      seriesId: id,
    }];
  });
}
