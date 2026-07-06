import type { MediaItem, SearchResult } from "@/lib/providers/types";
import { extractIdFromPath, inferMediaTypeFromPath } from "@/lib/utils/url";

export const SHABFOROOSH_PROVIDER_ID = "shabforoosh";

export function isUsableMediaPath(path: string): boolean {
  return Boolean(extractIdFromPath(path) && inferMediaTypeFromPath(path));
}

export function dedupeMediaItems<T extends MediaItem | SearchResult>(items: T[]): T[] {
  const seen = new Set<string>();
  const results: T[] = [];

  for (const item of items) {
    const key = `${item.provider}:${item.type}:${item.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      results.push(item);
    }
  }

  return results;
}
