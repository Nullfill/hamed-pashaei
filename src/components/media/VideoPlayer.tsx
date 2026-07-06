"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Play, Pause, Volume2, VolumeX, Maximize, Settings, X } from "lucide-react";
import type { MediaType, PlaybackData, PlaybackSource } from "@/lib/providers/types";

type PlaybackMode = "dub" | "sub";

interface VideoPlayerProps {
  id: string;
  type: MediaType;
  provider?: string;
  dubbed?: string;
  season?: string;
  episode?: string;
}

function sourceMode(source: PlaybackSource): PlaybackMode {
  return source.dubbed ? "dub" : "sub";
}

function modeLabel(mode: PlaybackMode) {
  return mode === "dub" ? "دوبله فارسی" : "زبان اصلی + زیرنویس";
}

function qualityRank(source?: PlaybackSource) {
  return Number(source?.quality || 0);
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VideoPlayer({ id, type, provider, dubbed = "0", season, episode }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [data, setData] = useState<PlaybackData>({ sources: [] });
  const [mode, setMode] = useState<PlaybackMode>(dubbed === "1" ? "dub" : "sub");
  const [selected, setSelected] = useState<PlaybackSource | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  
  // Player states
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPlayback() {
      setLoading(true);
      setError(undefined);

      const params = new URLSearchParams({ type, id, dubbed });
      if (provider) {
        params.set("src", provider === "gapfilm" ? "b" : provider === "shabforoosh" ? "a" : provider);
      }
      if (season) {
        params.set("season", season);
      }
      if (episode) {
        params.set("episode", episode);
      }

      const response = await fetch(`/api/playback?${params.toString()}`, {
        signal: controller.signal,
        cache: "no-store",
      });
      const payload = (await response.json()) as PlaybackData & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "دریافت لینک پخش ناموفق بود.");
      }

      const sortedSources = [...payload.sources].sort((a, b) => qualityRank(b) - qualityRank(a));
      const hasDub = sortedSources.some((source) => source.dubbed);
      const hasSub = sortedSources.some((source) => !source.dubbed);
      const preferredMode: PlaybackMode = dubbed === "1" && hasDub ? "dub" : hasDub ? "dub" : hasSub ? "sub" : "dub";
      const firstSource = sortedSources.find((source) => sourceMode(source) === preferredMode) ?? sortedSources[0];

      setData({ ...payload, sources: sortedSources });
      setMode(preferredMode);
      setSelected(firstSource);
    }

    loadPlayback()
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "لینک پخش یافت نشد.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [dubbed, episode, id, provider, season, type]);

  const modes = useMemo(() => {
    const available = new Set<PlaybackMode>();
    data.sources.forEach((source) => available.add(sourceMode(source)));
    return [...available].sort((a) => (a === "dub" ? -1 : 1));
  }, [data.sources]);

  const modeSources = useMemo(
    () => data.sources.filter((source) => sourceMode(source) === mode).sort((a, b) => qualityRank(b) - qualityRank(a)),
    [data.sources, mode],
  );

  const sourceKey = useMemo(() => selected?.src ?? "empty", [selected?.src]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handlePlay = () => setPlaying(true);
    const handlePause = () => setPlaying(false);
    const handleVolumeChange = () => {
      setVolume(video.volume);
      setMuted(video.muted);
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("volumechange", handleVolumeChange);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("volumechange", handleVolumeChange);
    };
  }, [sourceKey]);

  // Hide controls after inactivity
  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (playing) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const time = parseFloat(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const vol = parseFloat(e.target.value);
    videoRef.current.volume = vol;
    setVolume(vol);
    if (vol > 0 && muted) {
      videoRef.current.muted = false;
      setMuted(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !muted;
    setMuted(!muted);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  function changeMode(nextMode: PlaybackMode) {
    setMode(nextMode);
    const sameQuality = data.sources.find(
      (source) => sourceMode(source) === nextMode && source.quality && selected?.quality && source.quality === selected.quality,
    );
    const fallback = data.sources
      .filter((source) => sourceMode(source) === nextMode)
      .sort((a, b) => qualityRank(b) - qualityRank(a))[0];
    setSelected(sameQuality ?? fallback);
    setShowSettings(false);
  }

  function changeQuality(source: PlaybackSource) {
    const currentTimeBackup = videoRef.current?.currentTime || 0;
    setSelected(source);
    setShowSettings(false);
    // Restore playback position after source change
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = currentTimeBackup;
        if (playing) {
          videoRef.current.play();
        }
      }
    }, 100);
  }

  if (loading) {
    return (
      <div className="grid aspect-video place-items-center rounded-2xl border border-white/[0.08] bg-[var(--surface)]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="size-10 animate-spin text-amber-500" />
          <p className="text-sm">در حال آماده‌سازی پخش...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid aspect-video place-items-center rounded-2xl border border-red-500/20 bg-red-500/5 px-6 text-center">
        <p className="text-slate-300">{error}</p>
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="grid aspect-video place-items-center rounded-2xl border border-white/[0.08] bg-[var(--surface)] text-slate-400">
        لینک پخش یافت نشد.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Custom Video Player */}
      <div
        ref={containerRef}
        className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-black shadow-2xl"
        onMouseMove={resetControlsTimeout}
        onMouseLeave={() => playing && setShowControls(false)}
      >
        <video
          ref={videoRef}
          key={sourceKey}
          poster={data.poster}
          className="aspect-video w-full bg-black"
          playsInline
          preload="metadata"
          onClick={togglePlay}
        >
          <source src={selected.src} type={selected.type} />
          {selected.subtitleFa ? <track kind="subtitles" src={selected.subtitleFa} srcLang="fa" label="فارسی" default /> : null}
          {selected.subtitleEn ? <track kind="subtitles" src={selected.subtitleEn} srcLang="en" label="English" /> : null}
        </video>

        {/* Custom Controls */}
        <div
          className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 transition-opacity duration-300 ${
            showControls || !playing ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* Progress Bar */}
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="mb-3 h-1 w-full cursor-pointer appearance-none rounded-full bg-white/20 [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-500"
          />

          <div className="flex items-center justify-between gap-4">
            {/* Left Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="grid size-10 place-items-center rounded-lg text-white transition-smooth hover:bg-white/20"
                aria-label={playing ? "توقف" : "پخش"}
              >
                {playing ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}
              </button>

              <button
                onClick={toggleMute}
                className="grid size-10 place-items-center rounded-lg text-white transition-smooth hover:bg-white/20"
                aria-label={muted ? "فعال کردن صدا" : "بی‌صدا"}
              >
                {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={muted ? 0 : volume}
                onChange={handleVolumeChange}
                className="hidden h-1 w-20 cursor-pointer appearance-none rounded-full bg-white/20 sm:block [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
              />

              <span className="hidden text-sm font-medium text-white sm:block">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="grid size-10 place-items-center rounded-lg text-white transition-smooth hover:bg-white/20"
                  aria-label="تنظیمات"
                >
                  <Settings className="size-5" />
                </button>

                {/* Settings Menu */}
                {showSettings && (
                  <div className="absolute bottom-full left-0 mb-2 w-64 rounded-xl border border-white/[0.08] bg-black/95 p-3 shadow-2xl backdrop-blur-md">
                    <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="font-bold text-white">تنظیمات پخش</span>
                      <button
                        onClick={() => setShowSettings(false)}
                        className="grid size-6 place-items-center rounded text-slate-400 hover:text-white"
                      >
                        <X className="size-4" />
                      </button>
                    </div>

                    {/* Audio Mode */}
                    {modes.length > 1 && (
                      <div className="mb-3">
                        <p className="mb-2 text-xs font-bold text-slate-400">نسخه پخش</p>
                        <div className="flex flex-col gap-1">
                          {modes.map((item) => (
                            <button
                              key={item}
                              onClick={() => changeMode(item)}
                              className={`rounded-lg px-3 py-2 text-right text-sm transition-smooth ${
                                mode === item
                                  ? "bg-amber-500 font-bold text-black"
                                  : "text-slate-300 hover:bg-white/10"
                              }`}
                            >
                              {modeLabel(item)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quality */}
                    {modeSources.length > 1 && (
                      <div>
                        <p className="mb-2 text-xs font-bold text-slate-400">کیفیت تصویر</p>
                        <div className="flex flex-col gap-1">
                          {modeSources.map((source) => (
                            <button
                              key={source.src}
                              onClick={() => changeQuality(source)}
                              className={`rounded-lg px-3 py-2 text-right text-sm transition-smooth ${
                                selected.src === source.src
                                  ? "bg-amber-500 font-bold text-black"
                                  : "text-slate-300 hover:bg-white/10"
                              }`}
                            >
                              {source.quality ? `${source.quality}p` : "کیفیت اصلی"}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={toggleFullscreen}
                className="grid size-10 place-items-center rounded-lg text-white transition-smooth hover:bg-white/20"
                aria-label="تمام صفحه"
              >
                <Maximize className="size-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Center Play Button (when paused) */}
        {!playing && (
          <button
            onClick={togglePlay}
            className="absolute left-1/2 top-1/2 grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md transition-smooth hover:scale-110 hover:bg-black/80"
            aria-label="پخش"
          >
            <Play className="mr-1 size-10 fill-current" />
          </button>
        )}
      </div>
    </div>
  );
}
