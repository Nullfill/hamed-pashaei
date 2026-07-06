import Link from "next/link";
import { Calendar, Clock, Play, Star, Users, Award, Globe, Languages } from "lucide-react";
import type { MediaDetails, SeriesEpisode } from "@/lib/providers/types";
import { MediaCard } from "@/components/media/MediaCard";
import { getInternalWatchPath } from "@/lib/utils/url";

function groupEpisodes(episodes?: SeriesEpisode[]) {
  const groups = new Map<number, SeriesEpisode[]>();

  for (const episode of episodes ?? []) {
    const current = groups.get(episode.season) ?? [];
    current.push(episode);
    groups.set(episode.season, current);
  }

  return [...groups.entries()].sort(([a], [b]) => a - b);
}

function TermList({ title, items, icon: Icon }: { title: string; items?: Array<{ id?: string; name: string }>; icon?: React.ElementType }) {
  if (!items?.length) {
    return null;
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[var(--surface)] p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-400">
        {Icon && <Icon className="size-4" aria-hidden />}
        {title}
      </h3>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={`${item.id}-${item.name}`}
            className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-sm text-slate-200 transition-smooth hover:border-amber-500/30 hover:bg-white/[0.08]"
          >
            {item.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export function DetailsView({ details }: { details: MediaDetails }) {
  const hasDubbed = details.badges.includes("\u062f\u0648\u0628\u0644\u0647");
  const playHref = getInternalWatchPath(details.type, details.id, hasDubbed ? "1" : "0", details.provider);
  const episodeGroups = groupEpisodes(details.episodes);

  return (
    <article>
      {/* Hero Section */}
      <section className="relative border-b border-white/[0.08]">
        {/* Background */}
        {details.backdrop || details.poster ? (
          <div className="absolute inset-0">
            <img
              src={details.backdrop || details.poster}
              alt={details.title}
              className="h-full w-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/95 to-[var(--background)]/80" />
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--background)] via-transparent to-[var(--background)]/60" />
          </div>
        ) : null}

        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-[18rem_1fr] lg:grid-cols-[20rem_1fr]">
            {/* Poster */}
            <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[var(--surface)] shadow-2xl">
              {details.poster ? (
                <img src={details.poster} alt={details.title} className="aspect-[2/3] h-full w-full object-cover" />
              ) : (
                <div className="grid aspect-[2/3] place-items-center text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                    <div className="size-16 rounded-full bg-white/5" />
                    <span className="text-sm">بدون پوستر</span>
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex flex-col justify-end gap-6">
              {/* Meta Info */}
              <div className="flex flex-wrap gap-2">
                <span className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-sm font-bold text-black">
                  {details.type === "movie" ? "فیلم" : "سریال"}
                </span>
                {details.year ? (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.06] px-3 py-1.5 text-sm font-medium text-slate-300">
                    <Calendar className="size-4" aria-hidden />
                    {details.year}
                  </span>
                ) : null}
                {details.runtime ? (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.06] px-3 py-1.5 text-sm font-medium text-slate-300">
                    <Clock className="size-4" aria-hidden />
                    {details.runtime}
                  </span>
                ) : null}
                {details.rating ? (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-sm font-bold text-amber-400">
                    <Star className="size-4 fill-amber-400" aria-hidden />
                    {details.rating}
                  </span>
                ) : null}
                {details.metacritic ? (
                  <span className="rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-1.5 text-sm font-bold text-green-400">
                    Meta {details.metacritic}
                  </span>
                ) : null}
              </div>

              {/* Title */}
              <div>
                <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
                  {details.titleFa || details.title}
                </h1>
                {details.titleEn && details.titleEn !== details.titleFa ? (
                  <p className="mt-3 text-xl font-medium text-slate-400">{details.titleEn}</p>
                ) : null}
              </div>

              {/* Update Text */}
              {details.updateText ? (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-5 py-3 text-sm font-medium text-amber-300">
                  {details.updateText}
                </div>
              ) : null}

              {/* Description */}
              {details.description ? (
                <p className="max-w-3xl text-lg leading-relaxed text-slate-300">{details.description}</p>
              ) : null}

              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                {details.badges.map((badge) => (
                  <span
                    key={badge}
                    className="rounded-lg border border-white/[0.08] bg-white/[0.06] px-3 py-1.5 text-sm font-medium text-slate-300"
                  >
                    {badge}
                  </span>
                ))}
                {details.age ? (
                  <span className="rounded-lg border border-white/[0.08] bg-white/[0.06] px-3 py-1.5 text-sm font-medium text-slate-300">
                    {details.age}
                  </span>
                ) : null}
              </div>

              {/* Play Button */}
              {details.type === "movie" ? (
                <Link
                  href={playHref}
                  className="group inline-flex w-fit items-center gap-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-4 text-lg font-bold text-black shadow-lg shadow-amber-500/30 transition-smooth hover:scale-105 hover:shadow-xl hover:shadow-amber-500/40"
                >
                  <Play className="size-5 fill-current transition-smooth group-hover:scale-110" aria-hidden />
                  پخش فیلم
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_22rem] lg:px-8">
        <div className="space-y-10">
          {/* Episodes */}
          {episodeGroups.length ? (
            <div className="space-y-6">
              <h2 className="text-3xl font-black text-white">فصل‌ها و قسمت‌ها</h2>
              {episodeGroups.map(([season, episodes]) => (
                <div key={season} className="overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[var(--surface)] to-[var(--surface)]/80">
                  <div className="border-b border-white/[0.08] bg-gradient-to-r from-amber-500/10 to-orange-500/10 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-white">فصل {season}</h3>
                        <p className="text-sm text-slate-400">{episodes.length} قسمت</p>
                      </div>
                      <div className="flex size-12 items-center justify-center rounded-full bg-amber-500/20 text-lg font-black text-amber-400">
                        {season}
                      </div>
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {episodes.map((episode) => (
                        <Link
                          key={`${episode.season}-${episode.episode}`}
                          href={getInternalWatchPath("series", details.id, hasDubbed ? "1" : "0", details.provider, episode.season, episode.episode)}
                          className="group relative overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-4 transition-all duration-300 hover:scale-[1.02] hover:border-amber-500/60 hover:bg-gradient-to-br hover:from-amber-500/10 hover:to-orange-500/10 hover:shadow-lg hover:shadow-amber-500/20"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex items-center gap-2">
                                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-xs font-bold text-amber-400">
                                  {episode.episode}
                                </span>
                                <span className="truncate font-bold text-white group-hover:text-amber-400">{episode.title}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-400">
                                <span className="rounded-md bg-white/[0.06] px-2 py-0.5">{episode.links.length} کیفیت</span>
                              </div>
                            </div>
                            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-white/[0.06] transition-all group-hover:bg-amber-500 group-hover:text-black">
                              <Play className="size-4 fill-current" aria-hidden />
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : details.type === "series" ? (
            <div className="rounded-2xl border border-white/[0.08] bg-[var(--surface)] p-8 text-center text-slate-400">
              برای این سریال هنوز قسمت قابل پخش پیدا نشد.
            </div>
          ) : null}

          {/* Awards */}
          {details.awards ? (
            <div className="rounded-2xl border border-white/[0.08] bg-[var(--surface)] p-6">
              <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-white">
                <Award className="size-5 text-amber-400" aria-hidden />
                جوایز
              </h2>
              <p className="leading-relaxed text-slate-300">{details.awards}</p>
            </div>
          ) : null}

          {/* Full Description */}
          {details.bodyHtml ? (
            <div className="rounded-2xl border border-white/[0.08] bg-[var(--surface)] p-6">
              <h2 className="mb-5 text-2xl font-black text-white">توضیحات کامل</h2>
              <div className="content-html" dangerouslySetInnerHTML={{ __html: details.bodyHtml }} />
            </div>
          ) : null}

          {/* Related */}
          {details.related?.length ? (
            <div>
              <h2 className="mb-5 text-2xl font-black text-white">پیشنهادهای مرتبط</h2>
              <div className="scrollbar-none -mx-2 flex gap-4 overflow-x-auto px-2 pb-4">
                {details.related.map((item) => (
                  <MediaCard key={`${item.provider}-${item.type}-${item.id}`} item={item} />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Sidebar */}
        <aside className="space-y-5 lg:self-start">
          <TermList title="ژانرها" items={details.genreTerms} icon={Globe} />
          <TermList title="کشورها" items={details.countries} icon={Globe} />
          <TermList title="زبان‌ها" items={details.languages} icon={Languages} />

          {details.directors?.length ? (
            <div className="rounded-xl border border-white/[0.08] bg-[var(--surface)] p-4">
              <h3 className="mb-3 text-sm font-bold text-slate-400">کارگردان / سازنده</h3>
              <div className="space-y-2 text-sm text-slate-200">
                {details.directors.slice(0, 8).map((person) => (
                  <div key={`${person.id}-${person.name}`} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 transition-smooth hover:bg-white/[0.06]">
                    {person.name}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {details.actors?.length ? (
            <div className="rounded-xl border border-white/[0.08] bg-[var(--surface)] p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-400">
                <Users className="size-4" aria-hidden />
                بازیگران
              </h3>
              <div className="space-y-2 text-sm text-slate-200">
                {details.actors.slice(0, 12).map((person) => (
                  <div key={`${person.id}-${person.name}`} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 transition-smooth hover:bg-white/[0.06]">
                    {person.name}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </section>
    </article>
  );
}
