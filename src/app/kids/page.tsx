import { HeroSlider } from "@/components/media/HeroSlider";
import { SectionRail } from "@/components/media/SectionRail";
import { getKidsSections } from "@/lib/providers/registry";
import { toPublicError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

export default async function KidsPage() {
  try {
    const sections = await getKidsSections();
    const hero = sections.find((section) => section.type === "slider");
    const rails = sections.filter((section) => section.id !== hero?.id);

    return (
      <section className="py-4">
        <HeroSlider section={hero} />

        <div className="mx-auto max-w-7xl px-4 pb-2 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-white/[0.08] bg-[var(--surface)] px-5 py-4">
            <h1 className="text-2xl font-black text-white sm:text-3xl">کودک و انیمیشن</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400 sm:text-base">
              دنیای کودک گپ‌فیلم با بهترین‌های کودک، فیلم‌های کودکانه، سریال‌های کودکانه، تک‌بنرها و مجموعه‌های موضوعی.
            </p>
          </div>
        </div>

        {rails.length ? (
          rails.map((section, index) => <SectionRail key={`${section.id}-${index}`} section={section} />)
        ) : (
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="rounded-md border border-white/10 bg-[#15151f] p-8 text-center text-slate-400">موردی پیدا نشد.</div>
          </div>
        )}
      </section>
    );
  } catch (error) {
    const publicError = toPublicError(error);
    return <div className="mx-auto max-w-7xl px-4 py-10 text-red-100">{publicError.message}</div>;
  }
}
