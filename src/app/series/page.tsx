import { BrowseView } from "@/components/media/BrowseView";
import { browseAllProviders, browseByCategoryKeys, getAllCategories, getProvider } from "@/lib/providers/registry";
import { toPublicError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

export default async function SeriesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; genres?: string; cats?: string; country?: string; dubbed?: string; subtitle?: string; src?: string; provider?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page || 1);
  const source = params.src || params.provider;

  try {
    const input = {
      type: "series",
      page: Number.isFinite(page) && page > 0 ? page : 1,
      genres: params.genres,
      country: params.country,
      dubbed: params.dubbed === "1",
      subtitle: params.subtitle === "1",
    } as const;
    const [result, categories] = await Promise.all([
      params.cats
        ? browseByCategoryKeys({ ...input, categoryKeys: params.cats, source })
        : source
          ? getProvider(source).browse(input)
          : browseAllProviders(input),
      getAllCategories(),
    ]);

    return (
      <BrowseView
        title="سریال‌ها"
        description="آرشیو ترکیبی سریال‌ها با فیلتر زنده ژانر، کشور، دوبله و زیرنویس."
        result={result}
        type="series"
        page={input.page}
        selectedCategories={params.cats}
        genres={params.genres}
        country={params.country}
        dubbed={params.dubbed === "1"}
        subtitle={params.subtitle === "1"}
        provider={source}
        categories={categories}
      />
    );
  } catch (error) {
    const publicError = toPublicError(error);
    return <div className="mx-auto max-w-7xl px-4 py-10 text-red-100">{publicError.message}</div>;
  }
}
