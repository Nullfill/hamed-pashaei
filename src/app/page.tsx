import { HeroSlider } from "@/components/media/HeroSlider";
import { SectionRail } from "@/components/media/SectionRail";
import { getAllHomeSections } from "@/lib/providers/registry";
import { toPublicError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  try {
    const sections = await getAllHomeSections();
    
    // جداسازی سکشن‌ها بر اساس پروایدر
    const shabforooshSections = sections.filter(s => s.provider === 'shabforoosh');
    const gapfilmSections = sections.filter(s => s.provider === 'gapfilm');
    
    // ساختن اسلایدر ترکیبی
    const sliderSections = sections.filter((section) => section.type === "slider");
    const hero = sliderSections.length
      ? {
          id: "combined-featured",
          title: "\u0648\u06CC\u0698\u0647",
          type: "slider" as const,
          items: sliderSections.flatMap((section) => section.items).slice(0, 12),
        }
      : undefined;
    
    // ترکیب هوشمند سکشن‌ها (یک از شبفروش، یک از گپ‌فیلم، و غیره)
    const rails = sections.filter((section) => section.type === "rail");
    const mixedRails: typeof rails = [];
    const shabRails = rails.filter(s => s.provider === 'shabforoosh');
    const gapRails = rails.filter(s => s.provider === 'gapfilm');
    
    const maxLength = Math.max(shabRails.length, gapRails.length);
    for (let i = 0; i < maxLength; i++) {
      if (shabRails[i]) mixedRails.push(shabRails[i]);
      if (gapRails[i]) mixedRails.push(gapRails[i]);
    }

    return (
      <>
        <HeroSlider section={hero} />
        {mixedRails.map((section, index) => (
          <SectionRail key={`${section.id}-${index}`} section={section} />
        ))}
        {!mixedRails.length ? (
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
