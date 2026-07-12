import { HomeFeed } from "@/components/media/HomeFeed";
import { getAllHomeSections } from "@/lib/providers/registry";
import { toPublicError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  try {
    const sections = await getAllHomeSections();
    const initialSize = 8;
    return (
      <HomeFeed
        initialSections={sections.slice(0, initialSize)}
        totalSections={sections.length}
      />
    );
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
