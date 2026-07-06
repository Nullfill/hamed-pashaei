import Link from "next/link";
import { SectionRail } from "@/components/media/SectionRail";
import { getKidsSections } from "@/lib/providers/registry";
import { toPublicError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

export default async function KidsPage() {
  try {
    const sections = await getKidsSections();

    return (
      <section className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="mb-3 text-3xl font-black">کودک و انیمیشن</h1>
          <p className="mb-6 max-w-3xl text-slate-400">فیلم‌ها و سریال‌های مناسب کودک، خانوادگی و انیمیشن از آرشیو ترکیبی.</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/movies?cats=%D8%A7%D9%86%DB%8C%D9%85%DB%8C%D8%B4%D9%86" className="rounded-md border border-white/10 bg-white/7 px-3 py-2 text-sm hover:border-[#e50914]">
              انیمیشن‌های سینمایی
            </Link>
            <Link href="/series?cats=%D8%A7%D9%86%DB%8C%D9%85%DB%8C%D8%B4%D9%86" className="rounded-md border border-white/10 bg-white/7 px-3 py-2 text-sm hover:border-[#e50914]">
              سریال‌های انیمیشن
            </Link>
          </div>
        </div>

        <div className="mt-4">
          {sections.length ? (
            sections.map((section) => <SectionRail key={section.id} section={section} />)
          ) : (
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="rounded-md border border-white/10 bg-[#15151f] p-8 text-center text-slate-400">موردی پیدا نشد.</div>
            </div>
          )}
        </div>
      </section>
    );
  } catch (error) {
    const publicError = toPublicError(error);
    return <div className="mx-auto max-w-7xl px-4 py-10 text-red-100">{publicError.message}</div>;
  }
}
