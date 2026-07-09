"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";
import type { HomeSection } from "@/lib/providers/types";
import { MediaCard } from "@/components/media/MediaCard";
import { getInternalDetailsPath } from "@/lib/utils/url";

export function SectionRail({ section }: { section: HomeSection }) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 800;
    const newPosition =
      direction === "right"
        ? scrollContainerRef.current.scrollLeft + scrollAmount
        : scrollContainerRef.current.scrollLeft - scrollAmount;
    scrollContainerRef.current.scrollTo({ left: newPosition, behavior: "smooth" });
  };
  if (!section.items.length) {
    return null;
  }

  if (section.items.length === 1) {
    const item = section.items[0];
    return (
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">{section.title}</h2>
        </div>
        <Link
          href={getInternalDetailsPath(item.type, item.id, item.provider)}
          className="group relative block min-h-[18rem] overflow-hidden rounded-2xl border border-white/[0.08] bg-[var(--surface)] transition-smooth hover:border-amber-500/30 hover:shadow-2xl hover:shadow-amber-500/10"
        >
          {item.backdrop || item.poster ? (
            <>
              <img
                src={item.backdrop || item.poster}
                alt={item.title}
                className="absolute inset-0 h-full w-full object-cover transition-smooth duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-l from-black/90 via-black/50 to-transparent" />
            </>
          ) : null}
          <div className="relative flex min-h-[18rem] flex-col justify-end gap-3 p-6 lg:p-8">
            <h3 className="text-3xl font-black text-white drop-shadow-lg lg:text-4xl">{item.title}</h3>
            {item.titleEn ? <p className="text-lg text-slate-300">{item.titleEn}</p> : null}
          </div>
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex items-center justify-between">
        {section.href ? (
          <Link
            href={section.href}
            className="group flex items-center gap-2 text-2xl font-bold text-white transition-smooth hover:text-amber-400"
          >
            {section.title}
            <ChevronLeft className="size-6 transition-smooth group-hover:-translate-x-1" aria-hidden />
          </Link>
        ) : (
          <h2 className="text-2xl font-bold text-white">{section.title}</h2>
        )}

        {/* Navigation Buttons */}
        <div className="hidden items-center gap-2 md:flex">
          <button
            onClick={() => scroll("right")}
            className="grid size-10 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.06] text-slate-300 transition-smooth hover:border-amber-500/30 hover:bg-white/[0.12] hover:text-amber-400"
            aria-label="قبلی"
          >
            <ChevronRight className="size-5" />
          </button>
          <button
            onClick={() => scroll("left")}
            className="grid size-10 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.06] text-slate-300 transition-smooth hover:border-amber-500/30 hover:bg-white/[0.12] hover:text-amber-400"
            aria-label="بعدی"
          >
            <ChevronLeft className="size-5" />
          </button>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="scrollbar-none -mx-2 flex gap-4 overflow-x-auto scroll-smooth px-2 pb-4"
      >
        {section.items.map((item) => (
          <MediaCard key={`${item.provider}-${item.type}-${item.id}`} item={item} />
        ))}
      </div>
    </section>
  );
}
