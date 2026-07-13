"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ListVideo, Play, PlayCircle, X } from "lucide-react";
import type { MediaDetails, SeriesEpisode } from "@/lib/providers/types";
import { VideoPlayer } from "@/components/media/VideoPlayer";

type Selection = {
  season?: string;
  episode?: string;
  playbackId?: string;
  title?: string;
};

function groupEpisodes(episodes?: SeriesEpisode[]) {
  const groups = new Map<number, SeriesEpisode[]>();

  for (const episode of episodes ?? []) {
    const current = groups.get(episode.season) ?? [];
    current.push(episode);
    groups.set(episode.season, current);
  }

  return [...groups.entries()].sort(([a], [b]) => a - b);
}

function hasDubbed(details: MediaDetails) {
  return details.badges.some((badge) => /دوبله/.test(badge));
}

async function lockLandscape() {
  if (typeof screen === "undefined" || !screen.orientation) return;
  const orientation = screen.orientation as ScreenOrientation & { lock?: (orientation: string) => Promise<void> };
  await orientation.lock?.("landscape").catch(() => undefined);
}

async function unlockLandscape() {
  if (typeof screen === "undefined" || !screen.orientation) return;
  screen.orientation.unlock?.();
}

async function enterNativeFullscreen() {
  if (typeof document === "undefined") return;
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen?.().catch(() => undefined);
  }
  await lockLandscape();
}

function FullscreenPlaybackOverlay({
  details,
  dubbed,
  selection,
  onClose,
  episodeGroups,
  onSelectEpisode,
}: {
  details: MediaDetails;
  dubbed: string;
  selection?: Selection;
  onClose: () => void;
  episodeGroups?: Array<[number, SeriesEpisode[]]>;
  onSelectEpisode?: (episode: SeriesEpisode) => void;
}) {
  const shellRef = useRef<HTMLDivElement>(null);
  const [episodeMenuOpen, setEpisodeMenuOpen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [seasonOpen, setSeasonOpen] = useState<string | undefined>(selection?.season || episodeGroups?.[0]?.[0]?.toString());
  const isSeries = details.type === "series";
  const title = isSeries && selection ? `${details.titleFa || details.title} - فصل ${selection.season}، قسمت ${selection.episode}` : details.titleFa || details.title;
  const chromeVisible = controlsVisible || episodeMenuOpen;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const requestFullscreen = async () => {
      const element = shellRef.current;
      if (!element) return;
      if (!document.fullscreenElement) {
        await element.requestFullscreen().catch(() => undefined);
      }
      await lockLandscape();
    };

    void requestFullscreen();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      void unlockLandscape();
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    };
  }, [onClose]);

  return (
    <div ref={shellRef} className="fixed inset-0 z-[100] bg-black text-white">
      <div
        className={`absolute inset-x-0 top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-white/10 bg-black/85 px-3 backdrop-blur transition-opacity duration-300 sm:px-5 ${
          chromeVisible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <button type="button" onClick={onClose} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-white hover:bg-white/10">
          <X className="size-5" aria-hidden />
          بستن
        </button>
        <div className="min-w-0 flex-1 text-left sm:text-right">
          <h2 className="truncate text-sm font-black sm:text-lg">{title}</h2>
        </div>
        {isSeries && episodeGroups?.length ? (
          <button
            type="button"
            onClick={() => setEpisodeMenuOpen((value) => !value)}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold hover:bg-white/10"
          >
            <ListVideo className="size-4" aria-hidden />
            فصل و قسمت
          </button>
        ) : null}
      </div>

      <div className="absolute inset-0">
        <VideoPlayer
          id={details.id}
          type={details.type}
          provider={details.provider}
          dubbed={dubbed}
          season={selection?.season}
          episode={selection?.episode}
          playbackId={selection?.playbackId}
          title={title}
          poster={details.poster}
          autoPlay
          fill
          onControlsVisibilityChange={setControlsVisible}
        />

        {isSeries && episodeMenuOpen && episodeGroups?.length ? (
          <div className="absolute bottom-24 right-3 z-30 max-h-[min(70vh,34rem)] w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-white/10 bg-[#181818]/95 shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="font-black">انتخاب فصل و قسمت</span>
              <button type="button" onClick={() => setEpisodeMenuOpen(false)} className="rounded-md p-1 text-slate-300 hover:bg-white/10 hover:text-white" aria-label="بستن">
                <X className="size-4" />
              </button>
            </div>
            <div className="max-h-[calc(min(70vh,34rem)-3.5rem)] overflow-y-auto">
              {episodeGroups.map(([season, episodes]) => {
                const open = seasonOpen === String(season);
                return (
                  <div key={season} className="border-b border-white/5 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => setSeasonOpen(open ? undefined : String(season))}
                      className="flex w-full items-center justify-between px-4 py-3 text-right font-bold hover:bg-white/5"
                    >
                      <span>فصل {season}</span>
                      <ChevronDown className={`size-4 transition-smooth ${open ? "rotate-180" : ""}`} />
                    </button>
                    {open ? (
                      <div className="grid gap-1 px-2 pb-2">
                        {episodes.map((episode) => {
                          const active = selection?.season === String(episode.season) && selection?.episode === String(episode.episode);
                          return (
                            <button
                              key={`${episode.season}-${episode.episode}`}
                              type="button"
                              onClick={() => {
                                onSelectEpisode?.(episode);
                                setEpisodeMenuOpen(false);
                              }}
                              className={`rounded-lg px-3 py-2 text-right text-sm transition-smooth ${
                                active ? "bg-amber-500 font-black text-black" : "text-slate-200 hover:bg-white/10"
                              }`}
                            >
                              قسمت {episode.episode}
                              {episode.title ? <span className="block truncate text-xs opacity-75">{episode.title}</span> : null}
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function MoviePlaybackButton({ details }: { details: MediaDetails }) {
  const [open, setOpen] = useState(false);
  const dubbed = hasDubbed(details) ? "1" : "0";

  return (
    <>
      <button
        type="button"
        onClick={() => {
          void enterNativeFullscreen();
          setOpen(true);
        }}
        className="group inline-flex w-fit items-center gap-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-4 text-lg font-bold text-black shadow-lg shadow-amber-500/30 transition-smooth hover:scale-105"
      >
        <Play className="size-5 fill-current transition-smooth group-hover:scale-110" aria-hidden />
        پخش فیلم
      </button>

      {open ? <FullscreenPlaybackOverlay details={details} dubbed={dubbed} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function SeriesPlaybackPanel({ details }: { details: MediaDetails }) {
  const episodeGroups = useMemo(() => groupEpisodes(details.episodes), [details.episodes]);
  const [selection, setSelection] = useState<Selection>();
  const [open, setOpen] = useState(false);
  const episodeCount = details.episodes?.length ?? 0;
  const dubbed = hasDubbed(details) ? "1" : "0";

  function playEpisode(episode: SeriesEpisode) {
    void enterNativeFullscreen();
    setSelection({
      season: String(episode.season),
      episode: String(episode.episode),
      playbackId: episode.playbackId,
      title: episode.title,
    });
    setOpen(true);
  }

  if (!episodeGroups.length) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-[var(--surface)] p-8 text-center text-slate-400">
        برای این سریال هنوز قسمت قابل پخش پیدا نشد.
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-black text-white sm:text-3xl">
            <ListVideo className="size-6 text-amber-400" aria-hidden />
            فصل‌ها و قسمت‌ها
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {episodeGroups.length} فصل، {episodeCount} قسمت قابل پخش
          </p>
        </div>
      </div>

      {episodeGroups.map(([season, episodes]) => (
        <div key={season} className="min-w-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-[var(--surface)] shadow-xl shadow-black/10">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] bg-white/[0.03] px-4 py-3 sm:px-5">
            <div>
              <h3 className="text-lg font-black text-white">فصل {season}</h3>
              <p className="text-sm text-slate-400">{episodes.length} قسمت</p>
            </div>
            <span className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">
              {episodes.reduce((sum, episode) => sum + episode.links.length, 0)} کیفیت
            </span>
          </div>

          <div className="grid min-w-0 grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-3 p-3 sm:p-4">
            {episodes.map((episode) => (
              <button
                key={`${episode.season}-${episode.episode}`}
                type="button"
                onClick={() => playEpisode(episode)}
                className="group min-w-0 rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 text-right text-sm transition-smooth hover:border-amber-500/40 hover:bg-white/[0.08]"
              >
                <span className="mb-2 flex items-center justify-between gap-2">
                  <span className="rounded-md bg-black/25 px-2 py-1 text-xs font-black text-amber-300">قسمت {episode.episode}</span>
                  <PlayCircle className="size-4 shrink-0 text-slate-400 transition-colors group-hover:text-amber-300" aria-hidden />
                </span>
                <span className="block min-w-0 truncate font-bold text-white">{episode.title}</span>
                <span className="mt-1 block text-xs text-slate-400">{episode.links.length} کیفیت</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {open && selection ? (
        <FullscreenPlaybackOverlay
          details={details}
          dubbed={dubbed}
          selection={selection}
          episodeGroups={episodeGroups}
          onSelectEpisode={playEpisode}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}
