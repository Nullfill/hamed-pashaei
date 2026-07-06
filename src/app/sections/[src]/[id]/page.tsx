import Link from "next/link";
import { MediaCard } from "@/components/media/MediaCard";
import { getSection } from "@/lib/providers/registry";
import { toPublicError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

export default async function SectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ src: string; id: string }>;
  searchParams: Promise<{ t?: string; page?: string }>;
}) {
  const { src, id } = await params;
  const { t, page: rawPage } = await searchParams;
  const page = Number(rawPage || 1);

  try {
    const section = await getSection(src, id, t, Number.isFinite(page) && page > 0 ? page : 1);

    return (
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3">
          <h1 className="text-3xl font-black">{section.title}</h1>
        </div>

        {section.items.length ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {section.items.map((item) => (
              <MediaCard key={`${item.provider}-${item.type}-${item.id}`} item={item} />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-white/10 bg-[#15151f] p-8 text-center text-slate-400">{"\u0645\u0648\u0631\u062F\u06CC \u067E\u06CC\u062F\u0627 \u0646\u0634\u062F."}</div>
        )}

        <div className="mt-8 flex items-center justify-center gap-3">
          {page > 1 ? (
            <Link href={`/sections/${src}/${encodeURIComponent(id)}?${new URLSearchParams({ ...(t ? { t } : {}), page: String(page - 1) })}`} className="rounded-md border border-white/10 bg-white/7 px-4 py-2 text-sm">
              {"\u0642\u0628\u0644\u06CC"}
            </Link>
          ) : null}
          <span className="rounded-md bg-white/7 px-4 py-2 text-sm text-slate-300">{"\u0635\u0641\u062D\u0647"} {page}</span>
          <Link href={`/sections/${src}/${encodeURIComponent(id)}?${new URLSearchParams({ ...(t ? { t } : {}), page: String(page + 1) })}`} className="rounded-md border border-white/10 bg-white/7 px-4 py-2 text-sm">
            {"\u0628\u0639\u062F\u06CC"}
          </Link>
        </div>
      </section>
    );
  } catch (error) {
    const publicError = toPublicError(error);
    return <div className="mx-auto max-w-7xl px-4 py-10 text-red-100">{publicError.message}</div>;
  }
}
