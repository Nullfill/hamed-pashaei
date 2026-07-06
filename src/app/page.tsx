import { HeroSlider } from "@/components/media/HeroSlider";
import { SectionRail } from "@/components/media/SectionRail";
import { getAllHomeSections } from "@/lib/providers/registry";
import { toPublicError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  try {
    const sections = await getAllHomeSections();
    const sliderSections = sections.filter((section) => section.type === "slider");
    const hero = sliderSections.length
      ? {
          id: "combined-featured",
          title: "\u0648\u06CC\u0698\u0647",
          type: "slider" as const,
          items: sliderSections.flatMap((section) => section.items).slice(0, 12),
        }
      : undefined;
    const rails = sections.filter((section) => section.type === "rail");

    return (
      <>
        <HeroSlider section={hero} />
        {rails.map((section, index) => (
          <SectionRail key={`${section.id}-${index}`} section={section} />
        ))}
        {!rails.length ? (
          <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <div className="rounded-md border border-white/10 bg-[#15151f] p-8 text-center text-slate-400">
              {"بخشی برای نمایش پیدا نشد."}
            </div>
          </section>
        ) : null}
      </>
    );
  } catch (error) {
    const publicError = toPublicError(error);

    return (
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <HeroSlider />
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-6 text-center text-red-100">
          {publicError.message}
        </div>
      </section>
    );
  }
}
