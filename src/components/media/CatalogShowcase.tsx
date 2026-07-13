import Link from "next/link";
import { Film, Tv } from "lucide-react";
import { HeroSlider } from "@/components/media/HeroSlider";
import { SectionRail } from "@/components/media/SectionRail";
import type { HomeSection, MediaItem, MediaType } from "@/lib/providers/types";

function dedupeItems(items: MediaItem[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = `${item.provider}:${item.type}:${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sectionKey(section: HomeSection) {
  return `${section.provider || "mixed"}:${section.sourceId || section.id}:${section.sourceType || section.type}:${section.title}`;
}

function dedupeSections(sections: HomeSection[]) {
  const seen = new Set<string>();

  return sections.filter((section) => {
    const key = sectionKey(section);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function alternateProviderSections(sections: HomeSection[]) {
  const providerOrder = ["gapfilm", "shabforoosh", "filimo"];
  const buckets = providerOrder.map((provider) => sections.filter((section) => section.provider === provider));
  const other = sections.filter((section) => !providerOrder.includes(section.provider || ""));
  const mixed: HomeSection[] = [];
  const max = Math.max(0, ...buckets.map((bucket) => bucket.length));

  for (let index = 0; index < max; index++) {
    for (const bucket of buckets) {
      if (bucket[index]) mixed.push(bucket[index]);
    }
  }

  return [...mixed, ...other];
}

function makeHero(type: MediaType, sections: HomeSection[]): HomeSection | undefined {
  const sliderItems = sections.filter((section) => section.type === "slider").flatMap((section) => section.items);
  const backdropItems = sections.flatMap((section) => section.items).filter((item) => item.backdrop);
  const posterItems = sections.flatMap((section) => section.items);
  const items = dedupeItems([...sliderItems, ...backdropItems, ...posterItems]).slice(0, 8);

  if (!items.length) return undefined;

  return {
    id: `catalog-${type}-hero`,
    title: type === "movie" ? "فیلم‌ها" : "سریال‌ها",
    type: "slider",
    items,
  };
}

function makeSingleBanner(type: MediaType, sections: HomeSection[]): HomeSection | undefined {
  const item =
    sections.flatMap((section) => section.items).find((media) => media.backdrop) ??
    sections.flatMap((section) => section.items)[0];

  if (!item) return undefined;

  return {
    id: `catalog-${type}-banner`,
    title: "پیشنهاد ویژه",
    type: "rail",
    items: [item],
  };
}

export function CatalogShowcase({ type, sections }: { type: MediaType; sections: HomeSection[] }) {
  const cleanSections = dedupeSections(
    sections
      .map((section) => ({
        ...section,
        items: dedupeItems(section.items.filter((item) => item.type === type)),
      }))
      .filter((section) => section.items.length),
  );
  const hero = makeHero(type, cleanSections);
  const rails = alternateProviderSections(cleanSections.filter((section) => section.type === "rail" && section.items.length > 1));
  const topRails = rails.slice(0, 3);
  const banner = makeSingleBanner(type, rails.slice(3));
  const restRails = rails.slice(3, 9).filter((section) => section.items[0]?.id !== banner?.items[0]?.id);
  const basePath = type === "movie" ? "/movies" : "/series";
  const label = type === "movie" ? "فیلم‌ها" : "سریال‌ها";

  if (!cleanSections.length) return null;

  return (
    <div className="pb-2">
      <HeroSlider section={hero} />

      <section className="mx-auto max-w-7xl px-4 pb-3 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-[var(--surface)] p-4 shadow-2xl shadow-black/10 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-amber-500 text-black shadow-lg shadow-amber-500/20">
              {type === "movie" ? <Film className="size-6" aria-hidden /> : <Tv className="size-6" aria-hidden />}
            </div>
            <div>
              <h1 className="text-2xl font-black text-white sm:text-3xl">{label}</h1>
              <p className="mt-1 text-sm leading-6 text-slate-400">ویترین ترکیبی از چند آرشیو، همراه با جستجو و فیلترهای کامل.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href={`${basePath}?dubbed=1`} className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm font-bold text-amber-300 hover:bg-amber-500/15">
              دوبله
            </Link>
          </div>
        </div>
      </section>

      {topRails.map((section, index) => (
        <SectionRail key={`${section.id}-catalog-top-${index}`} section={section} />
      ))}
      {banner ? <SectionRail section={banner} /> : null}
      {restRails.map((section, index) => (
        <SectionRail key={`${section.id}-catalog-rest-${index}`} section={section} />
      ))}
    </div>
  );
}
