"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronLeft, ListVideo, PanelRight, Play, PlayCircle, X } from "lucide-react";
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
  return details.badges.some((badge) => /دوبله|ط¯ظˆط¨ظ„ظ‡/i.test(badge));
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
  const displayTitle = isSeries && selection ? `${details.titleFa || details.title} · فصل ${selection.season}، قسمت ${selection.episode}` : details.titleFa || details.title;
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
    <div ref={shellRef} dir="rtl" className="fixed inset-0 z-[100] isolate overflow-hidden bg-[#050608] text-white" role="dialog" aria-modal="true" aria-label="پخش ویدئو">
      <div
        className={`absolute inset-x-0 top-0 z-[70] flex min-h-20 items-center justify-between gap-4 bg-gradient-to-b from-black/90 via-black/55 to-transparent px-3 pb-5 pt-3 transition-opacity duration-300 sm:px-6 sm:pt-5 ${
          chromeVisible ? "opacity-100" : "opacity-0"
        }`}
        style={{ pointerEvents: chromeVisible ? "auto" : "none" }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button type="button" onClick={onClose} className="group pointer-events-auto relative z-10 grid size-10 shrink-0 touch-manipulation place-items-center rounded-full border border-white/15 bg-black/35 text-white shadow-lg backdrop-blur-xl transition hover:border-white/30 hover:bg-white/15" aria-label="بستن پخش‌کننده">
            <X className="size-5 transition-transform group-hover:rotate-90" aria-hidden />
          </button>
          <div className="min-w-0">
            <p className="mb-0.5 text-[10px] font-bold tracking-[0.18em] text-white/45 sm:text-xs">در حال پخش</p>
            <h2 className="max-w-[min(52vw,48rem)] truncate text-sm font-black text-white sm:text-lg">{displayTitle}</h2>
          </div>
        </div>
        {isSeries && episodeGroups?.length ? (
          <button
            type="button"
            onClick={() => setEpisodeMenuOpen((value) => !value)}
            className={`group pointer-events-auto relative z-10 inline-flex shrink-0 touch-manipulation items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold shadow-lg backdrop-blur-xl transition sm:px-4 sm:text-sm ${episodeMenuOpen ? "border-amber-400/70 bg-amber-400 text-black" : "border-white/20 bg-black/40 text-white hover:border-white/35 hover:bg-white/15"}`}
            aria-expanded={episodeMenuOpen}
            aria-controls="episode-drawer"
          >
            <PanelRight className="size-4 transition-transform group-hover:-translate-x-0.5" aria-hidden />
            فصل‌ها و قسمت‌ها
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
          title={displayTitle}
          poster={details.poster}
          autoPlay
          fill
          manageFullscreen={false}
          onControlsVisibilityChange={setControlsVisible}
        />

        {isSeries && episodeMenuOpen && episodeGroups?.length ? (
          <aside id="episode-drawer" className="player-episode-drawer" aria-label="فهرست فصل‌ها و قسمت‌ها" onPointerDown={(event) => event.stopPropagation()}>
             <div className="flex items-center justify-between border-b border-white/10 px-4 py-4 sm:px-5">
              <div>
                <p className="text-base font-black">فصل‌ها و قسمت‌ها</p>
                <p className="mt-0.5 text-[11px] text-white/45">قسمت موردنظر را برای ادامه انتخاب کنید</p>
              </div>
              <button type="button" onClick={() => setEpisodeMenuOpen(false)} className="grid size-9 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/10 hover:text-white" aria-label="بستن فهرست">
                <X className="size-4" />
              </button>
            </div>
             <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
              {episodeGroups.map(([season, episodes]) => {
                const open = seasonOpen === String(season);
                return (
                   <div key={season} className="mb-2 last:mb-0">
                    <button
                      type="button"
                      onClick={() => setSeasonOpen(open ? undefined : String(season))}
                       className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-right text-sm font-bold transition ${open ? "border-amber-400/60 bg-amber-400 text-black shadow-[0_8px_24px_rgba(245,158,11,0.16)]" : "border-white/[0.08] bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white"}`}
                    >
                      <span>فصل {season}</span>
                      <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
                    </button>
                    {open ? (
                       <div className="grid gap-2 px-1 pt-2">
                        {episodes.map((episode) => {
                          const active = selection?.season === String(episode.season) && selection?.episode === String(episode.episode);
                          return (
                            <button
                              key={`${episode.season}-${episode.episode}`}
                              type="button"
                              onClick={() => {
                                setSeasonOpen(String(episode.season));
                                onSelectEpisode?.(episode);
                                setEpisodeMenuOpen(false);
                              }}
                              className={`group flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-right text-sm transition ${
                                active ? "border-amber-400/70 bg-amber-400/[0.14] font-black text-amber-200" : "border-white/[0.07] bg-white/[0.025] text-slate-200 hover:border-white/20 hover:bg-white/[0.08]"
                              }`}
                            >
                              <span className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-white/[0.08]">
                                {episode.poster ? <img src={episode.poster} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" /> : <span className="absolute inset-0 grid place-items-center"><PlayCircle className="size-5 text-white/35" /></span>}
                                <span className="absolute right-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">{episode.episode}</span>
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate">قسمت {episode.episode}</span>
                                {episode.title ? <span className="mt-0.5 block truncate text-xs opacity-65">{episode.title}</span> : null}
                              </span>
                              <span className={`grid size-7 shrink-0 place-items-center rounded-full ${active ? "bg-amber-400 text-black" : "bg-white/[0.06] text-white/35 group-hover:text-white"}`}>
                                {active ? <Check className="size-3.5" /> : <ChevronLeft className="size-3.5" />}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </aside>
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
  const [activeSeason, setActiveSeason] = useState<number | undefined>(episodeGroups[0]?.[0]);
  const [progress, setProgress] = useState<Record<string, { seconds: number; duration: number; completed: boolean }>>({});
  const episodeCount = details.episodes?.length ?? 0;
  const dubbed = hasDubbed(details) ? "1" : "0";
  const activeEpisodes = episodeGroups.find(([season]) => season === activeSeason)?.[1] ?? [];

  useEffect(() => {
    setActiveSeason((current) => current && episodeGroups.some(([season]) => season === current) ? current : episodeGroups[0]?.[0]);
  }, [episodeGroups]);

  useEffect(() => {
    let cancelled = false;
    async function loadProgress() {
      const entries = await Promise.all(
        (details.episodes ?? []).filter((episode) => episode.playbackId).map(async (episode) => {
          const params = new URLSearchParams({
            provider: details.provider,
            type: details.type,
            id: details.id,
            season: String(episode.season),
            episode: String(episode.episode),
          });
          try {
            const response = await fetch(`/api/activity/progress?${params}`, { cache: "no-store" });
            const payload = (await response.json()) as { progress?: { progressSeconds?: number; durationSeconds?: number; completed?: boolean } };
            return [`${episode.season}:${episode.episode}`, {
              seconds: payload.progress?.progressSeconds ?? 0,
              duration: payload.progress?.durationSeconds ?? 0,
              completed: Boolean(payload.progress?.completed),
            }] as const;
          } catch {
            return null;
          }
        }),
      );
      if (!cancelled) {
        const validEntries = entries.filter(Boolean) as Array<readonly [string, { seconds: number; duration: number; completed: boolean }] >;
        setProgress(Object.fromEntries(validEntries));
      }
    }
    void loadProgress();
    return () => { cancelled = true; };
  }, [details.id, details.provider, details.type, details.episodes]);

  if (!episodeGroups.length) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-[var(--surface)] p-8 text-center text-slate-400">
        برای این سریال هنوز قسمت قابل پخش پیدا نشد.
      </div>
    );
  }

  const playEpisode = (episode: SeriesEpisode) => {
    void enterNativeFullscreen();
    setSelection({ season: String(episode.season), episode: String(episode.episode), playbackId: episode.playbackId, title: episode.title });
    setOpen(true);
  };

  const formatStatus = (item?: { seconds: number; duration: number; completed: boolean }) => {
    if (!item || (!item.seconds && !item.completed)) return "";
    if (item.completed) return "دیده شده";
    const remaining = Math.max(0, Math.ceil((item.duration - item.seconds) / 60));
    return remaining ? `${remaining} دقیقه مانده` : "در حال پخش";
  };

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl bg-[#0b0c0e] text-white">
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/[0.07] bg-[#0b0c0e]/85 px-3 py-3 backdrop-blur-[10px] sm:px-5">
        <span className="text-xs text-slate-400">{episodeCount} قسمت</span>
        <h2 className="flex items-center gap-2 text-sm font-bold"><ListVideo className="size-4 text-amber-300" aria-hidden /> فصل‌ها و قسمت‌ها</h2>
      </div>
      <div className="flex gap-5 overflow-x-auto border-b border-white/[0.06] px-3 sm:px-5" role="tablist">
        {episodeGroups.map(([season, episodes]) => {
          const active = season === activeSeason;
          return <button key={season} type="button" role="tab" aria-selected={active} onClick={() => setActiveSeason(season)} className={`shrink-0 border-b-2 px-1 py-3 text-sm transition-colors ${active ? "border-amber-300 text-white" : "border-transparent text-slate-500 hover:text-slate-300"}`}>
            فصل {season} <span className="mr-1 text-[10px] text-slate-500">{episodes.length}</span>
          </button>;
        })}
      </div>
      <div className="divide-y divide-white/[0.04] px-1 py-1 sm:px-3">
        {activeEpisodes.map((episode) => {
          const key = `${episode.season}:${episode.episode}`;
          const item = progress[key];
          const current = selection?.playbackId === episode.playbackId && open;
          const completed = Boolean(item?.completed);
          const percent = item?.duration ? Math.min(100, (item.seconds / item.duration) * 100) : 0;
          return <button key={key} type="button" onClick={() => playEpisode(episode)} className={`group flex min-h-[72px] w-full items-center gap-3 rounded-xl px-2 py-2 text-right transition-colors duration-150 hover:bg-white/[0.06] sm:gap-4 sm:px-3 ${current ? "bg-amber-300/[0.07]" : ""}`}>
            <span className={`relative h-14 w-[88px] shrink-0 overflow-hidden rounded-lg bg-white/[0.07] ${current ? "ring-1 ring-amber-300" : ""}`}>
              {episode.poster ? <img src={episode.poster} alt="" className="h-full w-full object-cover" loading="lazy" /> : <span className="absolute inset-0 grid place-items-center"><PlayCircle className="size-6 text-slate-500" /></span>}
              <span className="absolute right-1 top-1 rounded bg-black/70 px-1 text-[10px] text-slate-200">{episode.episode}</span>
              <span className="absolute inset-0 grid place-items-center opacity-70 transition-opacity group-hover:opacity-100"><span className="grid size-7 place-items-center rounded-full bg-black/65"><Play className="mr-[-2px] size-3.5 fill-white" /></span></span>
              {percent > 0 ? <span className="absolute inset-x-0 bottom-0 h-0.5 bg-black/60"><span className="block h-full bg-amber-300" style={{ width: `${percent}%` }} /></span> : null}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-slate-100">{episode.title || `قسمت ${episode.episode}`}</span>
              <span className="mt-1 block truncate text-xs text-slate-500">{episode.runtime || ""}{episode.runtime && formatStatus(item) ? " · " : ""}{formatStatus(item)}</span>
            </span>
            <span className="shrink-0 text-slate-600">{current ? <ChevronLeft className="size-4 text-amber-300" /> : completed ? <Check className="size-4 text-amber-300" /> : <ChevronLeft className="size-4" />}</span>
          </button>;
        })}
      </div>

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
