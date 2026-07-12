"use client";

import { useEffect, useMemo, useState } from "react";
import { Clapperboard, X } from "lucide-react";
import type { PlaybackData } from "@/lib/providers/types";

export function TrailerButton({
  trailer,
  title,
}: {
  trailer?: PlaybackData;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const sources = useMemo(
    () =>
      [...(trailer?.sources ?? [])].sort(
        (a, b) => Number(b.quality || 0) - Number(a.quality || 0),
      ),
    [trailer],
  );

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  if (!sources.length) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.06] px-5 py-3 text-sm font-black text-white transition-smooth hover:border-amber-400/40 hover:bg-white/[0.1]"
      >
        <Clapperboard className="size-5 text-amber-300" aria-hidden />
        تماشای تریلر
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/90 p-3 backdrop-blur-md sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`تریلر ${title}`}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-bold text-white hover:bg-white/15 sm:left-6 sm:top-6"
          >
            <X className="size-5" aria-hidden />
            بستن
          </button>
          <div className="w-full max-w-6xl overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
            <video
              controls
              autoPlay
              playsInline
              poster={trailer?.poster}
              className="aspect-video w-full bg-black object-contain"
            >
              {sources.map((source) => (
                <source key={source.src} src={source.src} type={source.type} />
              ))}
              مرورگر شما امکان پخش این تریلر را ندارد.
            </video>
            <div className="border-t border-white/10 px-4 py-3 sm:px-5">
              <p className="truncate text-sm font-black text-white sm:text-base">
                تریلر {title}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
