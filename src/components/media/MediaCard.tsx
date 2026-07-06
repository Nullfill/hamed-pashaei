import Link from "next/link";
import { Star, Sparkles } from "lucide-react";
import type { MediaItem, SearchResult } from "@/lib/providers/types";
import { getInternalDetailsPath } from "@/lib/utils/url";

type CardItem = MediaItem | SearchResult;

function getTitle(item: CardItem): string {
  if ("title" in item) {
    return item.title;
  }

  return item.titleFa || item.titleEn || `${item.type === "movie" ? "فیلم" : "سریال"} ${item.id}`;
}

export function MediaCard({ item }: { item: CardItem }) {
  const title = getTitle(item);
  const rating = "rating" in item ? item.rating : "imdb" in item ? item.imdb : undefined;
  const badges = item.badges.filter((badge) => badge !== "سانسور شده" && badge !== "بدون سانسور");
  const isCensored = item.provider === "gapfilm";

  return (
    <Link
      href={getInternalDetailsPath(item.type, item.id, item.provider)}
      className="group relative block w-40 shrink-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-[var(--surface)] transition-smooth hover:scale-105 hover:border-amber-500/40 hover:shadow-2xl hover:shadow-amber-500/10 sm:w-48"
    >
      {/* Poster Image */}
      <div className="relative aspect-[2/3] overflow-hidden bg-[var(--surface-soft)]">
        {item.poster ? (
          <>
            <img
              src={item.poster}
              alt={title}
              loading="lazy"
              className="h-full w-full object-cover transition-smooth duration-500 group-hover:scale-110"
            />
            {/* Gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition-smooth group-hover:opacity-100" />
          </>
        ) : (
          <div className="grid h-full place-items-center px-4 text-center text-sm text-slate-500">
            <div className="flex flex-col items-center gap-2">
              <Sparkles className="size-8 opacity-30" />
              <span>بدون پوستر</span>
            </div>
          </div>
        )}

        {/* Rating Badge */}
        {rating ? (
          <div className="absolute left-2 top-2 flex items-center gap-1 rounded-lg bg-black/80 px-2 py-1.5 text-xs font-bold backdrop-blur-sm">
            <Star className="size-3 fill-amber-400 text-amber-400" aria-hidden />
            <span className="text-white">{rating}</span>
          </div>
        ) : null}

        {/* Provider Badge */}
        <div className={`absolute right-2 top-2 rounded-lg px-2 py-1 text-[10px] font-bold backdrop-blur-sm ${
          isCensored 
            ? "bg-cyan-500/90 text-cyan-50" 
            : "bg-emerald-500/90 text-emerald-50"
        }`}>
          {isCensored ? "سانسور شده" : "بدون سانسور"}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2 p-3">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-bold leading-5 text-white transition-colors group-hover:text-amber-400">
          {title}
        </h3>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {badges.slice(0, 2).map((badge) => (
              <span
                key={badge}
                className="rounded-md bg-white/[0.06] px-2 py-1 text-[10px] font-medium text-slate-400 transition-colors group-hover:bg-amber-500/20 group-hover:text-amber-300"
              >
                {badge}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Shine effect on hover */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <div className="absolute -inset-full top-0 block h-full w-1/2 -skew-x-12 transform bg-gradient-to-r from-transparent to-white/[0.08] group-hover:animate-shine" />
      </div>
    </Link>
  );
}
