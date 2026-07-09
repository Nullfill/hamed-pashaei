import { HeroSlider } from "@/components/media/HeroSlider";
import { SectionRail } from "@/components/media/SectionRail";
import type { HomeSection } from "@/lib/providers/types";
import { getAllHomeSections } from "@/lib/providers/registry";
import { toPublicError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

function alternateProviderSections(sections: HomeSection[]) {
  const shabforoosh = sections.filter((section) => section.provider === "shabforoosh");
  const gapfilm = sections.filter((section) => section.provider === "gapfilm");
  const other = sections.filter((section) => section.provider !== "shabforoosh" && section.provider !== "gapfilm");
  const mixed: HomeSection[] = [];
  const max = Math.max(shabforoosh.length, gapfilm.length);

  for (let index = 0; index < max; index++) {
    if (shabforoosh[index]) mixed.push(shabforoosh[index]);
    if (gapfilm[index]) mixed.push(gapfilm[index]);
  }

  return [...mixed, ...other];
}

function makeSingleBanner(sections: HomeSection[]): HomeSection | undefined {
  const source = sections.find((section) => section.items.some((item) => item.backdrop)) ?? sections[0];
  const item = source?.items.find((media) => media.backdrop) ?? source?.items[0];

  if (!item) {
    return undefined;
  }

  return {
    id: "home-single-banner",
    title: "پیشنهاد ویژه",
    type: "rail",
    items: [item],
  };
}

export default async function HomePage() {
  try {
    const sections = await getAllHomeSections();
    const sliderSections = sections.filter((section) => section.type === "slider");
    const hero = sliderSections.length
      ? {
          id: "combined-featured",
          title: "ویژه",
          type: "slider" as const,
          items: sliderSections.flatMap((section) => section.items).slice(0, 12),
        }
      : undefined;
    const rails = alternateProviderSections(sections.filter((section) => section.type === "rail"));
    const topRails = rails.slice(0, 2);
    const banner = makeSingleBanner(rails.slice(2));
    const restRails = rails.slice(2).filter((section) => section.items[0]?.id !== banner?.items[0]?.id);

    return (
      <>
        <HeroSlider section={hero} />
        {topRails.map((section, index) => (
          <SectionRail key={`${section.id}-${index}`} section={section} />
        ))}
        {banner ? <SectionRail section={banner} /> : null}
        {restRails.map((section, index) => (
          <SectionRail key={`${section.id}-rest-${index}`} section={section} />
        ))}
        {!rails.length ? (
          <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="rounded-md border border-white/10 bg-[#15151f] p-8 text-center text-slate-400">بخشی برای نمایش پیدا نشد.</div>
          </section>
        ) : null}
      </>
    );
  } catch (error) {
    const publicError = toPublicError(error);

    return (
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <HeroSlider />
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-6 text-center text-red-100">{publicError.message}</div>
      </section>
    );
  }
}
