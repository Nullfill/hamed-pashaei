import { MediaCard } from "@/components/media/MediaCard";
import { browseByCategoryKeys, getAllCategories } from "@/lib/providers/registry";
import type { MediaItem } from "@/lib/providers/types";
import { toPublicError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

function Grid({ items }: { items: MediaItem[] }) {
  if (!items.length) {
    return <div className="rounded-md border border-white/10 bg-[#15151f] p-6 text-center text-slate-400">موردی پیدا نشد.</div>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {items.map((item) => (
        <MediaCard key={`${item.provider}-${item.type}-${item.id}`} item={item} />
      ))}
    </div>
  );
}

export default async function GenrePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const categories = await getAllCategories();
    const decodedId = decodeURIComponent(id);
    const category = categories.find((item) => item.key === id || item.key === encodeURIComponent(decodedId) || item.movieId === id || item.seriesId === id || item.label === decodedId);
    const key = category?.key || id;
    const [movies, series] = await Promise.all([
      browseByCategoryKeys({ type: "movie", categoryKeys: key }),
      browseByCategoryKeys({ type: "series", categoryKeys: key }),
    ]);

    return (
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-black">{category?.label || decodedId}</h1>
        <div className="space-y-10">
          <div>
            <h2 className="mb-4 text-2xl font-bold">فیلم‌ها</h2>
            <Grid items={movies.items} />
          </div>
          <div>
            <h2 className="mb-4 text-2xl font-bold">سریال‌ها</h2>
            <Grid items={series.items} />
          </div>
        </div>
      </section>
    );
  } catch (error) {
    const publicError = toPublicError(error);
    return <div className="mx-auto max-w-7xl px-4 py-10 text-red-100">{publicError.message}</div>;
  }
}
