import type { HomeSection, MediaItem, ProviderCategory, ProviderCountry } from "@/lib/providers/types";

function absoluteUrl(value: string | undefined, requestUrl: string): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value, requestUrl).toString();
  } catch {
    return value;
  }
}

export function toMobileItem(item: MediaItem, requestUrl: string): MediaItem {
  return {
    ...item,
    poster: absoluteUrl(item.poster, requestUrl),
    backdrop: absoluteUrl(item.backdrop, requestUrl),
  };
}

export function toMobileSection(section: HomeSection, requestUrl: string): HomeSection {
  return {
    ...section,
    href: absoluteUrl(section.href, requestUrl),
    items: section.items.map((item) => toMobileItem(item, requestUrl)),
  };
}

export function toMobileCategories(categories: ProviderCategory[]) {
  return categories.map((category) => ({
    ...category,
    source: category.sources,
  }));
}

export function toMobileCountries(countries: ProviderCountry[]) {
  return countries.map((country) => ({
    ...country,
    source: country.sources,
  }));
}

