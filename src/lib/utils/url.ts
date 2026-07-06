import type { MediaType } from "@/lib/providers/types";

const publicProviderCodes: Record<string, string> = {
  shabforoosh: "a",
  gapfilm: "b",
};

const providerAssetHosts = ["gapfilm.ir", "shabforoosh.ir", "majnoonbazar.ir", "seo2024.ir"];

function publicProviderCode(provider?: string): string | undefined {
  if (!provider) {
    return undefined;
  }

  return publicProviderCodes[provider] || provider;
}

export function toAbsoluteUrl(path: string | undefined, baseUrl: string): string | undefined {
  if (!path) {
    return undefined;
  }

  try {
    return new URL(path, baseUrl).toString();
  } catch {
    return undefined;
  }
}

function isProviderAssetHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return providerAssetHosts.some((host) => normalized === host || normalized.endsWith(`.${host}`));
}

export function toProviderAssetProxyUrl(url: string | undefined): string | undefined {
  // عکس‌ها رو مستقیم برمی‌گردونیم بدون پراکسی
  return url;
}

export function toSourcePath(href: string | undefined, baseUrl: string): string {
  if (!href) {
    return "/";
  }

  try {
    const url = new URL(href, baseUrl);
    return `${url.pathname}${url.search}`;
  } catch {
    return href;
  }
}

export function inferMediaTypeFromPath(path: string): MediaType | undefined {
  if (path.includes("/movies/")) {
    return "movie";
  }

  if (path.includes("/series/")) {
    return "series";
  }

  return undefined;
}

export function extractIdFromPath(path: string): string | undefined {
  const match = path.match(/\/(?:movies|series)\/([^/?#]+)\/?/);
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

export function getDetailsPath(type: MediaType, id: string): string {
  return `/${type === "movie" ? "movies" : "series"}/${encodeURIComponent(id)}/`;
}

export function getInternalDetailsPath(type: MediaType, id: string, provider?: string): string {
  const code = publicProviderCode(provider);
  const query = code ? `?src=${encodeURIComponent(code)}` : "";
  return `/${type === "movie" ? "movies" : "series"}/${encodeURIComponent(id)}${query}`;
}

export function getInternalWatchPath(type: MediaType, id: string, dubbed?: string, provider?: string, season?: string | number, episode?: string | number): string {
  const params = new URLSearchParams();

  if (dubbed) {
    params.set("dubbed", dubbed);
  }

  const code = publicProviderCode(provider);
  if (code) {
    params.set("src", code);
  }

  if (season) {
    params.set("season", String(season));
  }

  if (episode) {
    params.set("episode", String(episode));
  }

  const query = params.toString() ? `?${params.toString()}` : "";
  return `/watch/${type}/${encodeURIComponent(id)}${query}`;
}

export function getCssBackgroundUrl(style: string | undefined, baseUrl: string): string | undefined {
  const raw = style?.match(/url\((['"]?)(.*?)\1\)/i)?.[2];
  return toAbsoluteUrl(raw, baseUrl);
}
