import { DetailsView } from "@/components/media/DetailsView";
import { getCurrentUser } from "@/lib/auth/session";
import { getProvider } from "@/lib/providers/registry";
import { toPublicError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

export default async function SeriesDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ src?: string; provider?: string }>;
}) {
  const { id } = await params;
  const { src, provider } = await searchParams;

  try {
    const [details, currentUser] = await Promise.all([getProvider(src || provider).getDetails({ id, type: "series" }), getCurrentUser()]);
    return <DetailsView details={details} currentUser={currentUser} />;
  } catch (error) {
    const publicError = toPublicError(error);

    return (
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-6 text-center text-red-100">
          {publicError.message}
        </div>
      </section>
    );
  }
}
