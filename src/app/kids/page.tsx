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
        {/* Hero Header */}
        <div className="relative mb-10 overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-amber-500/20">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0YzMuMzE0IDAgNiAyLjY4NiA2IDZzLTIuNjg2IDYtNiA2LTYtMi42ODYtNi02IDIuNjg2LTYgNi02ek0yNCAzNmMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
          <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-2 backdrop-blur-sm">
                <span className="text-3xl">🎨</span>
                <span className="text-sm font-bold text-white">ویژه کودکان</span>
              </div>
              <h1 className="mb-4 text-5xl font-black text-white">کودک و انیمیشن</h1>
              <p className="mx-auto mb-6 max-w-2xl text-lg text-slate-300">
                فیلم‌ها و سریال‌های شاد، آموزنده و سرگرم‌کننده برای کودکان و خانواده
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link 
                  href="/movies?cats=%D8%A7%D9%86%DB%8C%D9%85%DB%8C%D8%B4%D9%86" 
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 font-bold text-white shadow-lg transition-transform hover:scale-105"
                >
                  🎬 انیمیشن‌های سینمایی
                </Link>
                <Link 
                  href="/series?cats=%D8%A7%D9%86%DB%8C%D9%85%DB%8C%D8%B4%D9%86" 
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 font-bold text-white shadow-lg transition-transform hover:scale-105"
                >
                  📺 سریال‌های انیمیشن
                </Link>
                <Link 
                  href="/movies?cats=%DA%A9%D9%88%D8%AF%DA%A9" 
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3 font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20"
                >
                  👶 فیلم‌های کودک
                </Link>
                <Link 
                  href="/movies?cats=%D8%AE%D8%A7%D9%86%D9%88%D8%A7%D8%AF%DA%AF%DB%8C" 
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 py-3 font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20"
                >
                  👨‍👩‍👧‍👦 خانوادگی
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {sections.length ? (
            sections.map((section) => <SectionRail key={section.id} section={section} />)
          ) : (
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="rounded-2xl border border-white/10 bg-[#15151f] p-12 text-center">
                <div className="mx-auto flex max-w-md flex-col items-center gap-4">
                  <div className="text-6xl">🎪</div>
                  <p className="text-lg font-bold text-white">در حال آماده‌سازی محتوا...</p>
                  <p className="text-slate-400">به زودی محتوای جذاب‌تری اضافه می‌شود!</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    );
  } catch (error) {
    const publicError = toPublicError(error);
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center text-red-100">
          {publicError.message}
        </div>
      </div>
    );
  }
}
