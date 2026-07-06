export function normalizeText(value?: string | null): string {
  return (value ?? "")
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function splitMetaBadges(meta: string): string[] {
  const clean = normalizeText(meta);
  const badges = new Set<string>();

  if (clean.includes("دوبله")) {
    badges.add("دوبله");
  }

  if (clean.includes("زیرنویس")) {
    badges.add("زیرنویس");
  }

  return [...badges];
}

export function extractImdb(meta: string): string | undefined {
  return normalizeText(meta).match(/IMDb\s*([0-9.]+)/i)?.[1];
}

export function extractYear(text: string): string | undefined {
  return normalizeText(text).match(/\b(19|20)\d{2}\b/)?.[0];
}
