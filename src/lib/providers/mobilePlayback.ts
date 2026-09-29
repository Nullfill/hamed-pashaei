import type { MediaDetails, PlaybackData, PlaybackSource } from "@/lib/providers/types";

function absoluteUrl(value: string | undefined, requestUrl: string): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value, requestUrl).toString();
  } catch {
    return value;
  }
}

/**
 * The website uses /api/provider-media for CORS and Referer handling. The
 * mobile API exposes the upstream URL as `src` and keeps that proxy as an
 * optional fallback, so a native player can play the provider URL directly.
 */
export function toMobilePlayback(
  playback: PlaybackData,
  requestUrl: string,
  provider: string,
): PlaybackData {
  const sources: PlaybackSource[] = playback.sources.map((source) => {
    const original = absoluteUrl(source.src, requestUrl) || source.src;
    let direct = original;
    let proxy: string | undefined;

    try {
      const parsed = new URL(original);
      if (parsed.pathname === "/api/provider-media") {
        const upstream = parsed.searchParams.get("url");
        if (upstream) {
          direct = upstream;
          proxy = original;
        }
      }
    } catch {
      // Keep the source as-is; provider parsers normally return valid URLs.
    }

    return {
      ...source,
      src: direct,
      ...(proxy ? { proxySrc: proxy } : {}),
      delivery: "direct" as const,
      ...(provider === "filimo"
        ? { requiredHeaders: { Referer: "https://www.filimo.com/" } }
        : {}),
    };
  });

  return {
    ...playback,
    poster: absoluteUrl(playback.poster, requestUrl),
    sources,
  };
}

function normalizeItem<T extends { poster?: string; backdrop?: string }>(item: T, requestUrl: string): T {
  return {
    ...item,
    poster: absoluteUrl(item.poster, requestUrl),
    backdrop: absoluteUrl(item.backdrop, requestUrl),
  };
}

export function toMobileDetails(details: MediaDetails, requestUrl: string): MediaDetails {
  return {
    ...normalizeItem(details, requestUrl),
    actors: details.actors?.map((person) => ({ ...person, image: absoluteUrl(person.image, requestUrl) })),
    directors: details.directors?.map((person) => ({ ...person, image: absoluteUrl(person.image, requestUrl) })),
    episodes: details.episodes?.map((episode) => ({
      ...episode,
      poster: absoluteUrl(episode.poster, requestUrl),
      links: episode.links.map((link) => ({
        ...link,
        src: absoluteUrl(link.src, requestUrl) || link.src,
        subtitleFa: absoluteUrl(link.subtitleFa, requestUrl),
        subtitleEn: absoluteUrl(link.subtitleEn, requestUrl),
      })),
    })),
    related: details.related?.map((item) => normalizeItem(item, requestUrl)),
    trailer: details.trailer ? toMobilePlayback(details.trailer, requestUrl, details.provider) : undefined,
  };
}

