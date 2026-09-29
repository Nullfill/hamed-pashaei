import type {
  BrowseResult,
  HomeSection,
  MediaDetails,
  MediaItem,
  PlaybackData,
  PlaybackSource,
  SearchResult,
  SeriesEpisode,
} from "@/lib/providers/types";

export const SHEYDA_PROVIDER_ID = "sheyda";

export type SheydaStatus = { statusCode?: number; message?: string };
export type SheydaPagination = { currentPage?: number; totalPages?: number; totalRecords?: number };
export type SheydaTag = { id?: string; name?: string; descriptor?: string };
export type SheydaArtist = { id?: string; fullName?: string; imagePath?: string; descriptor?: string };
export type SheydaCast = { name?: string; role?: string; artists?: SheydaArtist[] };
export type SheydaSeason = {
  id?: string;
  title?: string;
  productionYear?: number;
  programId?: string;
  landscapeImagePath?: string;
  portraitImagePath?: string;
};
export type SheydaSubtitle = { url?: string; label?: string; direction?: string; langCode?: string };
export type SheydaEpisode = {
  id?: string;
  uid?: string;
  title?: string;
  summary?: string;
  description?: string;
  duration?: number;
  order?: number;
  accessType?: string;
  playLink?: string;
  playLinkURI?: string;
  releaseStatus?: string;
  seasonID?: string;
  portraitImagePath?: string;
  landscapeImagePath?: string;
  subtitleMetadata?: SheydaSubtitle[];
};
export type SheydaTrailer = {
  id?: string;
  title?: string;
  isDefault?: boolean;
  playLinkURL?: string;
  playLinkURI?: string;
  videoPath?: string;
  coverImagePath?: string;
  duration?: number;
  subtitleMetadata?: SheydaSubtitle[];
};
export type SheydaProgram = {
  id?: string;
  uid?: string;
  title?: string;
  summary?: string;
  description?: string;
  productionYear?: number;
  isSolitary?: boolean;
  isExclusive?: boolean;
  playType?: string;
  parentalGuidance?: string;
  portraitImagePath?: string;
  landscapeImagePath?: string;
  bannerImagePath?: string;
  episode?: { accessType?: string };
};

export type SheydaProgramDetails = {
  program?: SheydaProgram;
  cast?: SheydaCast[];
  categories?: SheydaTag[];
  genres?: SheydaTag[];
  seasons?: SheydaSeason[];
  solitaryEpisode?: SheydaEpisode;
  trailers?: SheydaTrailer[];
};

export type SheydaHomeRow = {
  title?: string;
  link?: string;
  type?: string;
  order?: number;
  dataType?: string;
  itemType?: string;
  itemID?: string;
};

function mediaType(program: SheydaProgram): "movie" | "series" {
  return program.isSolitary ? "movie" : "series";
}

function badges(program: SheydaProgram): string[] {
  return [
    program.productionYear ? String(program.productionYear) : undefined,
    program.isExclusive ? "اختصاصی شیدا" : undefined,
    program.episode?.accessType === "FREE" ? "رایگان" : undefined,
  ].filter((value): value is string => Boolean(value));
}

export function toSheydaMediaItem(program: SheydaProgram): MediaItem | undefined {
  const id = program.uid?.trim();
  if (!id) return undefined;
  const type = mediaType(program);
  return {
    provider: SHEYDA_PROVIDER_ID,
    id,
    type,
    title: program.title?.trim() || `محتوای شیدا ${id}`,
    titleFa: program.title?.trim(),
    poster: program.portraitImagePath,
    backdrop: program.bannerImagePath || program.landscapeImagePath,
    badges: badges(program),
    sourcePath: `/p/${encodeURIComponent(id)}`,
  };
}

export function parseSheydaPrograms(
  payload: { data?: SheydaProgram[]; pagination?: SheydaPagination },
  page: number,
  type?: "movie" | "series",
): BrowseResult {
  const items = (payload.data ?? [])
    .flatMap((program) => {
      const item = toSheydaMediaItem(program);
      return item ? [item] : [];
    })
    .filter((item) => !type || item.type === type);
  return {
    items,
    page,
    totalPages: Math.max(1, payload.pagination?.totalPages || 1),
    perPage: items.length,
  };
}

export function parseSheydaSearch(payload: {
  titleMatch?: SheydaProgram[];
  contextMatch?: SheydaProgram[];
}): SearchResult[] {
  const seen = new Set<string>();
  return [...(payload.titleMatch ?? []), ...(payload.contextMatch ?? [])].flatMap((program) => {
    const item = toSheydaMediaItem(program);
    if (!item || seen.has(item.id)) return [];
    seen.add(item.id);
    return [{
      provider: item.provider,
      id: item.id,
      type: item.type,
      titleFa: item.titleFa,
      poster: item.poster,
      badges: item.badges,
      sourcePath: item.sourcePath,
    }];
  });
}

export function sheydaEpisode(
  episode: SheydaEpisode,
  season: number,
  fallbackOrder: number,
): SeriesEpisode | undefined {
  if (!episode.uid || episode.releaseStatus === "UNRELEASED") return undefined;
  return {
    season,
    episode: episode.order || fallbackOrder,
    title: episode.title || `قسمت ${episode.order || fallbackOrder}`,
    links: [],
    playbackId: episode.uid,
    poster: episode.landscapeImagePath || episode.portraitImagePath,
    runtime: episode.duration ? `${Math.ceil(episode.duration / 60)} دقیقه` : undefined,
  };
}

export function proxiedSheydaMediaUrl(url: string): string {
  return `/api/provider-media?url=${encodeURIComponent(url)}`;
}

function subtitleUrls(subtitles?: SheydaSubtitle[]) {
  const persian = subtitles?.find((item) => /^(fa|fas|per)$/i.test(item.langCode || "") || /فارسی|farsi|persian/i.test(item.label || ""));
  const english = subtitles?.find((item) => /^(en|eng)$/i.test(item.langCode || "") || /english/i.test(item.label || ""));
  return { subtitleFa: persian?.url, subtitleEn: english?.url };
}

export function sheydaPlaybackSource(
  url: string | undefined,
  subtitles?: SheydaSubtitle[],
): PlaybackSource | undefined {
  if (!url) return undefined;
  const hls = /\.m3u8(?:\?|$)/i.test(url);
  return {
    src: hls ? proxiedSheydaMediaUrl(url) : url,
    type: hls ? "application/vnd.apple.mpegurl" : "video/mp4",
    ...subtitleUrls(subtitles),
  };
}

export function parseSheydaDetails(
  details: SheydaProgramDetails,
  episodes: SeriesEpisode[],
): MediaDetails {
  const program = details.program ?? {};
  const item = toSheydaMediaItem(program);
  if (!item) throw new Error("شناسه محتوای شیدا معتبر نیست.");
  const defaultTrailer = details.trailers?.find((trailer) => trailer.isDefault) || details.trailers?.[0];
  const trailerSource = sheydaPlaybackSource(defaultTrailer?.playLinkURL || defaultTrailer?.playLinkURI);
  const actors = (details.cast ?? [])
    .filter((group) => group.role === "PERFORMER")
    .flatMap((group) => group.artists ?? [])
    .flatMap((artist) => artist.fullName ? [{ id: artist.id, name: artist.fullName, image: artist.imagePath }] : []);
  const directors = (details.cast ?? [])
    .filter((group) => group.role === "DIRECTOR")
    .flatMap((group) => group.artists ?? [])
    .flatMap((artist) => artist.fullName ? [{ id: artist.id, name: artist.fullName, image: artist.imagePath }] : []);
  const genreTerms = (details.genres ?? []).flatMap((genre) =>
    genre.name ? [{ id: genre.id, name: genre.name }] : [],
  );
  const solitary = details.solitaryEpisode;

  return {
    provider: SHEYDA_PROVIDER_ID,
    id: item.id,
    type: item.type,
    title: item.title,
    titleFa: item.titleFa,
    poster: item.poster,
    backdrop: item.backdrop,
    description: program.description || program.summary,
    year: program.productionYear ? String(program.productionYear) : undefined,
    runtime: solitary?.duration ? `${Math.ceil(solitary.duration / 60)} دقیقه` : undefined,
    age: program.parentalGuidance,
    genres: genreTerms.map((genre) => genre.name),
    genreTerms,
    actors,
    directors,
    episodes: item.type === "series" ? episodes : undefined,
    trailer: trailerSource ? { poster: defaultTrailer?.coverImagePath, sources: [trailerSource] } : undefined,
    badges: badges({ ...program, episode: { accessType: solitary?.accessType } }),
    sourcePath: item.sourcePath,
    playUrl: item.type === "movie" ? `/watch/movie/${encodeURIComponent(item.id)}` : undefined,
  };
}

export function parseSheydaPlayback(episode: SheydaEpisode): PlaybackData {
  const source = sheydaPlaybackSource(episode.playLink || episode.playLinkURI, episode.subtitleMetadata);
  return {
    poster: episode.landscapeImagePath || episode.portraitImagePath,
    sources: source ? [source] : [],
  };
}

export function makeSheydaSection(
  row: SheydaHomeRow,
  items: MediaItem[],
  page = 1,
  totalPages = 1,
): HomeSection {
  return {
    id: `${SHEYDA_PROVIDER_ID}-${row.itemID || row.order || row.title}`,
    title: row.title || "شیدا",
    type: "rail",
    items,
    provider: SHEYDA_PROVIDER_ID,
    sourceId: row.itemID,
    sourceType: row.itemType?.toLowerCase() || "tag",
    page,
    perPage: items.length,
    totalPages,
    hasMore: page < totalPages,
  };
}
