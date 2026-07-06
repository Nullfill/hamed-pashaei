import { MediaCard } from "@/components/media/MediaCard";
import { browseAllProviders } from "@/lib/providers/registry";

export const dynamic = "force-dynamic";

export default async function SubtitledPage() {
  const [movies, series] = await Promise.all([
    browseAllProviders({ type: "movie", subtitle: true }),
    browseAllProviders({ type: "series", subtitle: true }),
  ]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-3xl font-black">زیرنویس فارسی</h1>
      <div className="space-y-10">
        <div>
          <h2 className="mb-4 text-2xl font-bold">فیلم‌های زیرنویس‌دار</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {movies.items.map((item) => (
              <MediaCard key={`${item.provider}-${item.type}-${item.id}`} item={item} />
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-4 text-2xl font-bold">سریال‌های زیرنویس‌دار</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {series.items.map((item) => (
              <MediaCard key={`${item.provider}-${item.type}-${item.id}`} item={item} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
