import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { VideoPlayer } from "@/components/media/VideoPlayer";
import { mediaTypeSchema } from "@/lib/providers/types";
import { getInternalDetailsPath } from "@/lib/utils/url";

export const dynamic = "force-dynamic";

export default async function WatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string; id: string }>;
  searchParams: Promise<{ dubbed?: string; src?: string; provider?: string; season?: string; episode?: string }>;
}) {
  const { type: rawType, id } = await params;
  const { dubbed = "0", src, provider, season, episode } = await searchParams;
  const source = src || provider;
  const parsedType = mediaTypeSchema.safeParse(rawType);
  const query = new URLSearchParams();

  if (dubbed) query.set("dubbed", dubbed);
  if (source) query.set("src", source);
  if (season) query.set("season", season);
  if (episode) query.set("episode", episode);

  const nextPath = `/watch/${encodeURIComponent(rawType)}/${encodeURIComponent(id)}${query.toString() ? `?${query.toString()}` : ""}`;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  if (!parsedType.success) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-6 text-center text-red-100">
          نوع محتوا معتبر نیست.
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-black">
          پخش آنلاین
          {parsedType.data === "series" && season && episode ? ` - فصل ${season} قسمت ${episode}` : ""}
        </h1>
        <Link href={getInternalDetailsPath(parsedType.data, id, source)} className="rounded-md border border-white/10 px-4 py-2 text-sm text-slate-200">
          بازگشت به جزئیات
        </Link>
      </div>
      <VideoPlayer id={id} type={parsedType.data} provider={source} dubbed={dubbed} season={season} episode={episode} />
    </section>
  );
}
