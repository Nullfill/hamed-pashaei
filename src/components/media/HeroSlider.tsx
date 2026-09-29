"use client";

import Link from "next/link";
import { Play, Info, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import type { HomeSection } from "@/lib/providers/types";
import { getInternalDetailsPath } from "@/lib/utils/url";

export function HeroSlider({ section }: { section?: HomeSection }) {
  const items = section?.items.slice(0, 5) ?? [];
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = Math.max(280, scrollContainerRef.current.clientWidth * 0.92);
    const newPosition =
      direction === "right"
        ? scrollContainerRef.current.scrollLeft + scrollAmount
        : scrollContainerRef.current.scrollLeft - scrollAmount;
    scrollContainerRef.current.scrollTo({ left: newPosition, behavior: "smooth" });
  };

  if (!items.length) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid min-h-[28rem] place-items-center rounded-2xl border border-white/[0.08] bg-[var(--surface)] px-6 text-center text-slate-400">
          <div className="flex flex-col items-center gap-3">
            <div className="size-16 rounded-full bg-white/5" />
            <p>محتوایی برای نمایش پیدا نشد.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative mx-auto max-w-7xl px-4 pb-8 pt-6 sm:px-6 lg:px-8">
      {/* Navigation Buttons */}
      {items.length > 1 && (
        <>
          <button
            onClick={() => scroll("right")}
            className="absolute right-8 top-1/2 z-10 hidden size-12 -translate-y-1/2 place-items-center rounded-full border border-white/[0.08] bg-black/60 text-white backdrop-blur-md transition-smooth hover:bg-black/80 hover:scale-110 md:grid"
            aria-label="قبلی"
          >
            <ChevronRight className="size-6" />
          </button>
          <button
            onClick={() => scroll("left")}
            className="absolute left-8 top-1/2 z-10 hidden size-12 -translate-y-1/2 place-items-center rounded-full border border-white/[0.08] bg-black/60 text-white backdrop-blur-md transition-smooth hover:bg-black/80 hover:scale-110 md:grid"
            aria-label="بعدی"
          >
            <ChevronLeft className="size-6" />
          </button>
        </>
      )}

      <div
        ref={scrollContainerRef}
        className="scrollbar-none flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth"
      >
        {items.map((item, index) => (
          <article
            key={`${item.provider}-${item.type}-${item.id}`}
            className="group relative min-h-[24rem] w-full min-w-full snap-start overflow-hidden rounded-2xl border border-white/[0.08] bg-[var(--surface)] shadow-2xl transition-smooth hover:border-amber-500/30 sm:min-h-[32rem] sm:rounded-3xl"
          >
            {/* Background Image */}
            {item.backdrop || item.poster ? (
              <div className="absolute inset-0">
                <img
                  src={item.backdrop || item.poster}
                  alt={item.title}
                  loading={index === 0 ? "eager" : "lazy"}
                  decoding="async"
                  className="h-full w-full object-cover transition-smooth duration-700 group-hover:scale-105"
                />
                {/* Vignette effect */}
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/60 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--background)] via-transparent to-[var(--background)]/80" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--background)]" />
              </div>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--surface)] to-[var(--surface-soft)]" />
            )}

            {/* Content */}
            <div className="relative flex min-h-[24rem] flex-col justify-end gap-4 p-4 sm:min-h-[32rem] sm:gap-5 sm:p-10 lg:max-w-2xl lg:p-12">
              {/* Badges & Rating */}
              <div className="flex flex-wrap items-center gap-2">
                {item.rating ? (
                  <span className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-1.5 text-sm font-bold text-black shadow-lg shadow-amber-500/30">
                    <span className="text-lg">⭐</span>
                    {item.rating}
                  </span>
                ) : null}
                {item.badges.slice(0, 3).map((badge) => (
                  <span
                    key={badge}
                    className="rounded-xl border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-medium text-slate-100 backdrop-blur-md"
                  >
                    {badge}
                  </span>
                ))}
              </div>

              {/* Title */}
              <div>
                <h1 className="max-w-xl text-3xl font-black leading-tight text-white drop-shadow-2xl sm:text-5xl lg:text-6xl">
                  {item.title}
                </h1>
                {item.titleEn && item.titleEn !== item.title ? (
                  <p className="mt-2 text-lg font-medium text-slate-300">{item.titleEn}</p>
                ) : null}
              </div>

              {/* Description (if available) */}
              {"description" in item && item.description && typeof item.description === 'string' ? (
                <p className="line-clamp-3 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
                  {item.description}
                </p>
              ) : null}

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <Link
                  href={getInternalDetailsPath(item.type, item.id, item.provider)}
                  className="group/btn inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-sm font-bold text-black shadow-lg shadow-amber-500/30 transition-smooth hover:scale-105 hover:shadow-xl hover:shadow-amber-500/40 sm:gap-2.5 sm:px-6 sm:py-3.5 sm:text-base"
                >
                  <Play className="size-5 fill-current transition-smooth group-hover/btn:scale-110" aria-hidden />
                  مشاهده و پخش
                </Link>
                <Link
                  href={getInternalDetailsPath(item.type, item.id, item.provider)}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white backdrop-blur-md transition-smooth hover:scale-105 hover:bg-white/20 sm:gap-2.5 sm:px-6 sm:py-3.5 sm:text-base"
                >
                  <Info className="size-5" aria-hidden />
                  اطلاعات بیشتر
                </Link>
              </div>

              {/* Slide indicator */}
              {items.length > 1 && (
                <div className="flex gap-2">
                  {items.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 rounded-full transition-all ${
                        i === index ? "w-8 bg-amber-500" : "w-1 bg-white/30"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
