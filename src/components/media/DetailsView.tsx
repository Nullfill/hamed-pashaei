import {
  Award,
  Calendar,
  Clock,
  Globe,
  Languages,
  Star,
  Users,
} from "lucide-react";
import Link from "next/link";
import sanitizeHtml from "sanitize-html";
import type { PublicUser } from "@/lib/auth/types";
import type { MediaDetails } from "@/lib/providers/types";
import { FavoriteButton } from "@/components/media/FavoriteButton";
import {
  MoviePlaybackButton,
  SeriesPlaybackPanel,
} from "@/components/media/DetailsPlayback";
import { MediaCard } from "@/components/media/MediaCard";
import { TrailerButton } from "@/components/media/TrailerButton";

function TermList({
  title,
  items,
  icon: Icon,
}: {
  title: string;
  items?: Array<{ id?: string; name: string }>;
  icon?: React.ElementType;
}) {
  if (!items?.length) return null;

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
            className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-sm text-slate-200"
          >
            {item.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function authPath(path: "login" | "register", details: MediaDetails) {
  const params = new URLSearchParams();
  const source =
    details.provider === "gapfilm"
      ? "b"
      : details.provider === "shabforoosh"
        ? "a"
        : details.provider === "filimo"
          ? "c"
        : details.provider;
  if (source) params.set("src", source);
  const next = `/${details.type === "movie" ? "movies" : "series"}/${encodeURIComponent(details.id)}${params.toString() ? `?${params.toString()}` : ""}`;
  return `/${path}?next=${encodeURIComponent(next)}`;
}

function GuestPlaybackActions({ details }: { details: MediaDetails }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Link
        href={authPath("login", details)}
        className="inline-flex w-fit items-center gap-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-4 text-lg font-bold text-black shadow-lg shadow-amber-500/30 transition-smooth hover:scale-105"
      >
        ورود و پخش
      </Link>
      <Link
        href={authPath("register", details)}
        className="inline-flex w-fit items-center rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-3 text-sm font-black text-slate-200 transition-smooth hover:bg-white/[0.08]"
      >
        ثبت نام
      </Link>
    </div>
  );
}

export function DetailsView({
  details,
  currentUser,
}: {
  details: MediaDetails;
  currentUser?: PublicUser;
}) {
  const sanitizedBodyHtml = details.bodyHtml
    ? sanitizeHtml(details.bodyHtml, {
        allowedTags: [...sanitizeHtml.defaults.allowedTags, "img"],
        allowedAttributes: {
          ...sanitizeHtml.defaults.allowedAttributes,
          a: ["href", "name", "target", "rel"],
          img: ["src", "alt", "title", "width", "height", "loading"],
          "*": ["class"],
        },
        allowedSchemes: ["http", "https", "mailto"],
      })
    : undefined;

  return (
    <article>
      <section className="relative border-b border-white/[0.08]">
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
            <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[var(--surface)] shadow-2xl">
              {details.poster ? (
                <img
                  src={details.poster}
                  alt={details.title}
                  className="aspect-[2/3] h-full w-full object-cover"
                />
              ) : (
                <div className="grid aspect-[2/3] place-items-center text-slate-500">
                  بدون پوستر
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-col justify-end gap-6">
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

              <div className="min-w-0">
                <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
                  {details.titleFa || details.title}
                </h1>
                {details.titleEn && details.titleEn !== details.titleFa ? (
                  <p className="mt-3 text-xl font-medium text-slate-400">
                    {details.titleEn}
                  </p>
                ) : null}
              </div>

              {details.updateText ? (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-5 py-3 text-sm font-medium text-amber-300">
                  {details.updateText}
                </div>
              ) : null}
              {details.description ? (
                <p className="max-w-3xl text-lg leading-relaxed text-slate-300">
                  {details.description}
                </p>
              ) : null}

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

              <div className="flex flex-wrap gap-3">
                {currentUser ? (
                  <>
                    {details.type === "movie" ? (
                      <MoviePlaybackButton details={details} />
                    ) : null}
                    <FavoriteButton details={details} />
                  </>
                ) : (
                  <GuestPlaybackActions details={details} />
                )}
                <TrailerButton
                  trailer={details.trailer}
                  title={details.titleFa || details.title}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:px-8">
        <div className="min-w-0 space-y-10">
          {details.type === "series" ? (
            currentUser ? (
              <SeriesPlaybackPanel details={details} />
            ) : (
              <GuestPlaybackActions details={details} />
            )
          ) : null}

          {details.awards ? (
            <div className="rounded-2xl border border-white/[0.08] bg-[var(--surface)] p-6">
              <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-white">
                <Award className="size-5 text-amber-400" aria-hidden />
                جوایز
              </h2>
              <p className="leading-relaxed text-slate-300">{details.awards}</p>
            </div>
          ) : null}

          {sanitizedBodyHtml ? (
            <div className="rounded-2xl border border-white/[0.08] bg-[var(--surface)] p-6">
              <h2 className="mb-5 text-2xl font-black text-white">
                توضیحات کامل
              </h2>
              <div
                className="content-html"
                dangerouslySetInnerHTML={{ __html: sanitizedBodyHtml }}
              />
            </div>
          ) : null}

          {details.related?.length ? (
            <div>
              <h2 className="mb-5 text-2xl font-black text-white">
                پیشنهادهای مرتبط
              </h2>
              <div className="scrollbar-none -mx-2 flex gap-4 overflow-x-auto px-2 pb-4">
                {details.related.map((item) => (
                  <MediaCard
                    key={`${item.provider}-${item.type}-${item.id}`}
                    item={item}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <aside className="space-y-5 lg:self-start">
          <TermList title="ژانرها" items={details.genreTerms} icon={Globe} />
          <TermList title="کشورها" items={details.countries} icon={Globe} />
          <TermList
            title="زبان‌ها"
            items={details.languages}
            icon={Languages}
          />

          {details.directors?.length ? (
            <div className="rounded-xl border border-white/[0.08] bg-[var(--surface)] p-4">
              <h3 className="mb-3 text-sm font-bold text-slate-400">
                کارگردان / سازنده
              </h3>
              <div className="space-y-2 text-sm text-slate-200">
                {details.directors.slice(0, 8).map((person) => (
                  <div
                    key={`${person.id}-${person.name}`}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                  >
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
                  <div
                    key={`${person.id}-${person.name}`}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                  >
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
