"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Maximize, Pause, Play, Settings, Sun, Volume2, VolumeX, X } from "lucide-react";
import type { MediaType, PlaybackData, PlaybackSource } from "@/lib/providers/types";

type PlaybackMode = "dub" | "sub";
type GestureKind = "brightness" | "volume";
type SubtitleMode = "off" | "fa" | "en";

type SubtitleCue = {
  start: number;
  end: number;
  text: string;
};

type TouchGesture = {
  pointerId: number;
  kind: GestureKind;
  startY: number;
  startValue: number;
  height: number;
  moved: boolean;
};

interface VideoPlayerProps {
  id: string;
  type: MediaType;
  provider?: string;
  dubbed?: string;
  season?: string;
  episode?: string;
  playbackId?: string;
  title?: string;
  poster?: string;
  autoPlay?: boolean;
  fill?: boolean;
  onControlsVisibilityChange?: (visible: boolean) => void;
}

function sourceMode(source: PlaybackSource): PlaybackMode {
  return source.dubbed ? "dub" : "sub";
}

function modeLabel(mode: PlaybackMode) {
  return mode === "dub" ? "دوبله فارسی" : "زبان اصلی / زیرنویس";
}

function qualityRank(source?: PlaybackSource) {
  return Number(source?.quality || 0);
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function storageKey(input: Pick<VideoPlayerProps, "id" | "type" | "provider" | "season" | "episode">) {
  return `film-progress:${input.provider || "default"}:${input.type}:${input.id}:${input.season || "0"}:${input.episode || "0"}`;
}

function readProgress(key: string) {
  if (typeof window === "undefined") return 0;
  const value = Number(window.localStorage.getItem(key) || 0);
  return Number.isFinite(value) ? value : 0;
}

function writeProgress(key: string, time: number, duration: number) {
  if (typeof window === "undefined" || !Number.isFinite(time) || time < 5) return;
  if (Number.isFinite(duration) && duration > 0 && time > duration - 8) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, String(Math.floor(time)));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function parseSubtitleTime(value: string) {
  const match = value.trim().match(/(?:(\d{1,2}):)?(\d{1,2}):(\d{1,2})(?:[,.](\d{1,3}))?/);
  if (!match) return 0;

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  const milliseconds = Number((match[4] || "0").padEnd(3, "0"));

  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

function parseSubtitleText(text: string): SubtitleCue[] {
  return text
    .replace(/^\uFEFF/, "")
    .replace(/\r/g, "")
    .split(/\n{2,}/)
    .flatMap((block) => {
      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => line !== "WEBVTT" && !line.startsWith("NOTE"));
      const timeIndex = lines.findIndex((line) => line.includes("-->"));
      if (timeIndex === -1) return [];

      const [startRaw, endRaw] = lines[timeIndex].split("-->").map((part) => part.trim().split(/\s+/)[0]);
      const cueText = lines
        .slice(timeIndex + 1)
        .join("\n")
        .replace(/<[^>]+>/g, "")
        .trim();

      if (!startRaw || !endRaw || !cueText) return [];

      return [
        {
          start: parseSubtitleTime(startRaw),
          end: parseSubtitleTime(endRaw),
          text: cueText,
        },
      ];
    })
    .sort((a, b) => a.start - b.start);
}

async function lockLandscape() {
  if (typeof screen === "undefined" || !screen.orientation) return;
  const orientation = screen.orientation as ScreenOrientation & { lock?: (orientation: string) => Promise<void> };
  await orientation.lock?.("landscape").catch(() => undefined);
}

export function VideoPlayer({
  id,
  type,
  provider,
  dubbed = "0",
  season,
  episode,
  playbackId,
  title,
  poster,
  autoPlay = false,
  fill = false,
  onControlsVisibilityChange,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gestureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gestureRef = useRef<TouchGesture | null>(null);
  const pendingResumeRef = useRef(0);
  const lastSavedAtRef = useRef(0);
  const lastServerSavedAtRef = useRef(0);

  const progressKey = useMemo(() => storageKey({ id, type, provider, season, episode }), [episode, id, provider, season, type]);
  const [data, setData] = useState<PlaybackData>({ sources: [] });
  const [mode, setMode] = useState<PlaybackMode>(dubbed === "1" ? "dub" : "sub");
  const [selected, setSelected] = useState<PlaybackSource | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [brightness, setBrightness] = useState(1);
  const [gestureHud, setGestureHud] = useState<{ kind: GestureKind; value: number }>();
  const [subtitleMode, setSubtitleMode] = useState<SubtitleMode>("off");
  const [subtitleCues, setSubtitleCues] = useState<SubtitleCue[]>([]);
  const [subtitleError, setSubtitleError] = useState<string>();
  const controlsVisible = showControls || !playing || showSettings;

  useEffect(() => {
    const controller = new AbortController();

    async function loadPlayback() {
      setLoading(true);
      setError(undefined);
      setSelected(undefined);

      const params = new URLSearchParams({ type, id, dubbed });
      if (provider) params.set("src", provider === "gapfilm" ? "b" : provider === "shabforoosh" ? "a" : provider === "filimo" ? "c" : provider);
      if (season) params.set("season", season);
      if (episode) params.set("episode", episode);
      if (playbackId) params.set("playbackId", playbackId);

      const response = await fetch(`/api/playback?${params.toString()}`, {
        signal: controller.signal,
        cache: "no-store",
      });
      const payload = (await response.json()) as PlaybackData & { error?: string };

      if (!response.ok) throw new Error(payload.error || "دریافت لینک پخش ناموفق بود.");

      const sortedSources = [...payload.sources].sort((a, b) => qualityRank(b) - qualityRank(a));
      const hasDub = sortedSources.some((source) => source.dubbed);
      const hasSub = sortedSources.some((source) => !source.dubbed);
      const preferredMode: PlaybackMode = dubbed === "1" && hasDub ? "dub" : hasDub ? "dub" : hasSub ? "sub" : "dub";
      const firstSource = sortedSources.find((source) => sourceMode(source) === preferredMode) ?? sortedSources[0];

      let serverProgress = 0;
      const progressParams = new URLSearchParams({
        type,
        id,
        provider: provider || "default",
      });
      if (season) progressParams.set("season", season);
      if (episode) progressParams.set("episode", episode);

      const progressResponse = await fetch(`/api/activity/progress?${progressParams.toString()}`, {
        signal: controller.signal,
        cache: "no-store",
      }).catch(() => undefined);

      if (progressResponse?.ok) {
        const progressPayload = (await progressResponse.json()) as { progress?: { progressSeconds?: number } };
        serverProgress = Number(progressPayload.progress?.progressSeconds || 0);
      }

      pendingResumeRef.current = Math.max(serverProgress, readProgress(progressKey));
      setData({ ...payload, sources: sortedSources });
      setMode(preferredMode);
      setSelected(firstSource);
    }

    loadPlayback()
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : "لینک پخش یافت نشد.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [dubbed, episode, id, playbackId, progressKey, provider, season, type]);

  const saveServerProgress = (time: number, videoDuration: number) => {
    if (!Number.isFinite(time) || time < 5) return;

    void fetch("/api/activity/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: provider || "default",
        type,
        id,
        season,
        episode,
        title,
        poster: data.poster || poster,
        progressSeconds: Math.floor(time),
        durationSeconds: Number.isFinite(videoDuration) ? Math.floor(videoDuration) : 0,
      }),
      keepalive: true,
    }).catch(() => undefined);
  };

  const modes = useMemo(() => {
    const available = new Set<PlaybackMode>();
    data.sources.forEach((source) => available.add(sourceMode(source)));
    return [...available].sort((a) => (a === "dub" ? -1 : 1));
  }, [data.sources]);

  const modeSources = useMemo(
    () => data.sources.filter((source) => sourceMode(source) === mode).sort((a, b) => qualityRank(b) - qualityRank(a)),
    [data.sources, mode],
  );

  const sourceKey = selected?.src ?? "empty";
  const selectedIsHls = Boolean(
    selected &&
      (selected.type?.includes("mpegurl") || /\.m3u8(?:\?|$)/i.test(selected.src)),
  );
  const activeSubtitleUrl = selected ? (subtitleMode === "fa" ? selected.subtitleFa : subtitleMode === "en" ? selected.subtitleEn : undefined) : undefined;
  const activeSubtitleText = subtitleMode === "off" ? "" : subtitleCues.find((cue) => currentTime >= cue.start && currentTime <= cue.end)?.text || "";

  async function keepFullscreenLandscape() {
    if (!fill) return;
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      await container.requestFullscreen?.().catch(() => undefined);
    }
    await lockLandscape();
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selected || !selectedIsHls) return;
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = selected.src;
      return;
    }

    let cancelled = false;
    let instance: { destroy: () => void } | undefined;
    void import("hls.js").then(({ default: Hls }) => {
      if (cancelled || !Hls.isSupported()) return;
      const hls = new Hls({ enableWorker: true });
      instance = hls;
      hls.loadSource(selected.src);
      hls.attachMedia(video);
    });

    return () => {
      cancelled = true;
      instance?.destroy();
    };
  }, [selected, selectedIsHls, sourceKey]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      const resumeAt = pendingResumeRef.current || readProgress(progressKey);
      setDuration(video.duration || 0);
      if (resumeAt > 5 && (!Number.isFinite(video.duration) || resumeAt < video.duration - 8)) {
        video.currentTime = resumeAt;
        setCurrentTime(resumeAt);
      }
      void keepFullscreenLandscape();
      if (autoPlay) void video.play().catch(() => undefined);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      const now = Date.now();
      if (now - lastSavedAtRef.current > 4000) {
        writeProgress(progressKey, video.currentTime, video.duration);
        lastSavedAtRef.current = now;
      }
      if (now - lastServerSavedAtRef.current > 12000) {
        saveServerProgress(video.currentTime, video.duration);
        lastServerSavedAtRef.current = now;
      }
    };
    const handleDurationChange = () => setDuration(video.duration || 0);
    const handlePlay = () => setPlaying(true);
    const handlePause = () => {
      setPlaying(false);
      writeProgress(progressKey, video.currentTime, video.duration);
      saveServerProgress(video.currentTime, video.duration);
    };
    const handleEnded = () => {
      setPlaying(false);
      window.localStorage.removeItem(progressKey);
    };
    const handleVolumeChange = () => {
      setVolume(video.volume);
      setMuted(video.muted);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("volumechange", handleVolumeChange);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("volumechange", handleVolumeChange);
    };
  }, [autoPlay, progressKey, sourceKey, data.poster, episode, id, poster, provider, season, title, type]);

  useEffect(() => {
    if (!selected) {
      setSubtitleMode("off");
      return;
    }

    setSubtitleMode((current) => {
      if (current === "fa" && selected.subtitleFa) return "fa";
      if (current === "en" && selected.subtitleEn) return "en";
      if (selected.subtitleFa) return "fa";
      if (selected.subtitleEn) return "en";
      return "off";
    });
  }, [selected]);

  useEffect(() => {
    const controller = new AbortController();
    setSubtitleCues([]);
    setSubtitleError(undefined);

    if (!activeSubtitleUrl) {
      return () => controller.abort();
    }
    const subtitleUrl = activeSubtitleUrl;

    async function loadSubtitle() {
      const response = await fetch(`/api/subtitle?url=${encodeURIComponent(subtitleUrl)}`, {
        signal: controller.signal,
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("زیرنویس دریافت نشد.");
      }

      const text = await response.text();
      if (!controller.signal.aborted) {
        setSubtitleCues(parseSubtitleText(text));
      }
    }

    loadSubtitle().catch((error: unknown) => {
      if (!controller.signal.aborted) {
        setSubtitleError(error instanceof Error ? error.message : "زیرنویس دریافت نشد.");
      }
    });

    return () => controller.abort();
  }, [activeSubtitleUrl]);

  useEffect(() => {
    if (!fill) return;
    void keepFullscreenLandscape();

    const onFullscreenChange = () => {
      if (document.fullscreenElement) {
        void lockLandscape();
      }
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [fill, sourceKey]);

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (gestureTimeoutRef.current) clearTimeout(gestureTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    onControlsVisibilityChange?.(controlsVisible);
  }, [controlsVisible, onControlsVisibilityChange]);

  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (playing) controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  const scheduleControlsHide = () => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (playing) controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  const showGestureHud = (kind: GestureKind, value: number) => {
    setGestureHud({ kind, value });
    if (gestureTimeoutRef.current) clearTimeout(gestureTimeoutRef.current);
    gestureTimeoutRef.current = setTimeout(() => setGestureHud(undefined), 700);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) video.pause();
    else void video.play();
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const time = Number(event.target.value);
    video.currentTime = time;
    setCurrentTime(time);
    writeProgress(progressKey, time, video.duration);
  };

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const nextVolume = Number(event.target.value);
    video.volume = nextVolume;
    if (nextVolume > 0 && muted) video.muted = false;
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !muted;
  };

  const setVideoVolume = (nextVolume: number) => {
    const video = videoRef.current;
    if (!video) return;
    const normalized = clamp(nextVolume, 0, 1);
    video.volume = normalized;
    video.muted = normalized === 0;
    setVolume(normalized);
    setMuted(normalized === 0);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) void containerRef.current.requestFullscreen();
    else void document.exitFullscreen();
  };

  function selectSource(source: PlaybackSource) {
    pendingResumeRef.current = videoRef.current?.currentTime || currentTime || readProgress(progressKey);
    if (videoRef.current) writeProgress(progressKey, pendingResumeRef.current, videoRef.current.duration);
    if (videoRef.current) saveServerProgress(pendingResumeRef.current, videoRef.current.duration);
    void keepFullscreenLandscape();
    setSelected(source);
    setShowSettings(false);
  }

  function changeMode(nextMode: PlaybackMode) {
    setMode(nextMode);
    const sameQuality = data.sources.find(
      (source) => sourceMode(source) === nextMode && source.quality && selected?.quality && source.quality === selected.quality,
    );
    const fallback = data.sources.filter((source) => sourceMode(source) === nextMode).sort((a, b) => qualityRank(b) - qualityRank(a))[0];
    if (sameQuality || fallback) selectSource(sameQuality ?? fallback);
  }

  function toggleControls() {
    setShowSettings(false);
    setShowControls((current) => {
      const next = !current;
      if (next) scheduleControlsHide();
      return next;
    });
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "touch") return;
    const target = event.target as HTMLElement;
    if (target.closest("button,input")) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const kind: GestureKind = event.clientX < rect.left + rect.width / 2 ? "brightness" : "volume";
    gestureRef.current = {
      pointerId: event.pointerId,
      kind,
      startY: event.clientY,
      startValue: kind === "brightness" ? brightness : muted ? 0 : volume,
      height: Math.max(rect.height, 1),
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;
    if (!gesture || event.pointerId !== gesture.pointerId) return;

    const delta = (gesture.startY - event.clientY) / gesture.height;
    if (Math.abs(event.clientY - gesture.startY) < 10 && !gesture.moved) return;

    gesture.moved = true;
    event.preventDefault();

    if (gesture.kind === "brightness") {
      const nextBrightness = clamp(gesture.startValue + delta * 1.2, 0.35, 1.35);
      setBrightness(nextBrightness);
      showGestureHud("brightness", Math.round(((nextBrightness - 0.35) / 1) * 100));
      return;
    }

    const nextVolume = clamp(gesture.startValue + delta * 1.25, 0, 1);
    setVideoVolume(nextVolume);
    showGestureHud("volume", Math.round(nextVolume * 100));
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;
    if (!gesture || event.pointerId !== gesture.pointerId) return;
    gestureRef.current = null;

    if (!gesture.moved) {
      toggleControls();
    }
  }

  function handlePointerCancel() {
    gestureRef.current = null;
  }

  const shellClass = fill
    ? "group relative h-full w-full touch-none overflow-hidden bg-black"
    : "group relative touch-none overflow-hidden rounded-2xl border border-white/[0.08] bg-black shadow-2xl";
  const videoClass = fill ? "h-full w-full bg-black object-contain" : "aspect-video w-full bg-black";
  const placeholderClass = fill
    ? "grid h-full w-full place-items-center bg-black"
    : "grid aspect-video place-items-center rounded-2xl border border-white/[0.08] bg-[var(--surface)]";

  if (loading) {
    return (
      <div className={placeholderClass}>
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="size-10 animate-spin text-amber-500" />
          <p className="text-sm">در حال آماده‌سازی پخش...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${placeholderClass} px-6 text-center`}>
        <p className="text-slate-300">{error}</p>
      </div>
    );
  }

  if (!selected) {
    return <div className={`${placeholderClass} text-slate-400`}>لینک پخش یافت نشد.</div>;
  }

  return (
    <div
      ref={containerRef}
      className={shellClass}
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => playing && setShowControls(false)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <video ref={videoRef} key={sourceKey} poster={data.poster} className={videoClass} style={{ filter: `brightness(${brightness})` }} playsInline preload="metadata">
        {!selectedIsHls ? <source src={selected.src} type={selected.type} /> : null}
      </video>

      {activeSubtitleText ? (
        <div
          dir="auto"
          className={`pointer-events-none absolute inset-x-4 z-20 mx-auto max-w-5xl text-center text-lg font-black leading-9 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] transition-[bottom] sm:text-2xl ${
            controlsVisible ? "bottom-28 sm:bottom-32" : "bottom-10 sm:bottom-12"
          }`}
        >
          {activeSubtitleText.split("\n").map((line, index) => (
            <span key={`${line}-${index}`} className="box-decoration-clone bg-black/55 px-2 py-1">
              {line}
              {index < activeSubtitleText.split("\n").length - 1 ? <br /> : null}
            </span>
          ))}
        </div>
      ) : null}

      {gestureHud ? (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 flex min-w-32 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3 rounded-2xl bg-black/70 px-5 py-4 text-white shadow-2xl backdrop-blur">
          {gestureHud.kind === "brightness" ? <Sun className="size-7" /> : <Volume2 className="size-7" />}
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-white" style={{ width: `${clamp(gestureHud.value, 0, 100)}%` }} />
          </div>
          <span className="text-xs font-bold">{clamp(gestureHud.value, 0, 100)}%</span>
        </div>
      ) : null}

      <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 transition-opacity duration-300 ${controlsVisible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}>
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={Math.min(currentTime, duration || currentTime)}
          onChange={handleSeek}
          className="mb-3 h-1 w-full cursor-pointer appearance-none rounded-full bg-white/20 [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-500"
        />

        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={togglePlay} className="grid size-10 shrink-0 place-items-center rounded-lg text-white transition-smooth hover:bg-white/20" aria-label={playing ? "توقف" : "پخش"}>
              {playing ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}
            </button>
            <button onClick={toggleMute} className="grid size-10 shrink-0 place-items-center rounded-lg text-white transition-smooth hover:bg-white/20" aria-label={muted ? "فعال کردن صدا" : "بی‌صدا"}>
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
            <span className="hidden whitespace-nowrap text-sm font-medium text-white sm:block">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="relative">
              <button onClick={() => setShowSettings((value) => !value)} className="grid size-10 place-items-center rounded-lg text-white transition-smooth hover:bg-white/20" aria-label="تنظیمات">
                <Settings className="size-5" />
              </button>

              {showSettings ? (
                <div className="absolute bottom-full left-0 mb-2 w-64 rounded-xl border border-white/[0.08] bg-black/95 p-3 shadow-2xl backdrop-blur-md">
                  <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="font-bold text-white">تنظیمات پخش</span>
                    <button onClick={() => setShowSettings(false)} className="grid size-6 place-items-center rounded text-slate-400 hover:text-white" aria-label="بستن">
                      <X className="size-4" />
                    </button>
                  </div>

                  {modes.length > 1 ? (
                    <div className="mb-3">
                      <p className="mb-2 text-xs font-bold text-slate-400">نسخه پخش</p>
                      <div className="flex flex-col gap-1">
                        {modes.map((item) => (
                          <button key={item} onClick={() => changeMode(item)} className={`rounded-lg px-3 py-2 text-right text-sm transition-smooth ${mode === item ? "bg-amber-500 font-bold text-black" : "text-slate-300 hover:bg-white/10"}`}>
                            {modeLabel(item)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {modeSources.length > 1 ? (
                    <div className="mb-3">
                      <p className="mb-2 text-xs font-bold text-slate-400">کیفیت تصویر</p>
                      <div className="flex flex-col gap-1">
                        {modeSources.map((source) => (
                          <button key={source.src} onClick={() => selectSource(source)} className={`rounded-lg px-3 py-2 text-right text-sm transition-smooth ${selected.src === source.src ? "bg-amber-500 font-bold text-black" : "text-slate-300 hover:bg-white/10"}`}>
                            {source.quality ? `${source.quality}p` : "کیفیت اصلی"}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {selected.subtitleFa || selected.subtitleEn ? (
                    <div>
                      <p className="mb-2 text-xs font-bold text-slate-400">زیرنویس</p>
                      <div className="flex flex-col gap-1">
                        <button type="button" onClick={() => setSubtitleMode("off")} className={`rounded-lg px-3 py-2 text-right text-sm transition-smooth ${subtitleMode === "off" ? "bg-amber-500 font-bold text-black" : "text-slate-300 hover:bg-white/10"}`}>
                          خاموش
                        </button>
                        {selected.subtitleFa ? (
                          <button type="button" onClick={() => setSubtitleMode("fa")} className={`rounded-lg px-3 py-2 text-right text-sm transition-smooth ${subtitleMode === "fa" ? "bg-amber-500 font-bold text-black" : "text-slate-300 hover:bg-white/10"}`}>
                            فارسی
                          </button>
                        ) : null}
                        {selected.subtitleEn ? (
                          <button type="button" onClick={() => setSubtitleMode("en")} className={`rounded-lg px-3 py-2 text-right text-sm transition-smooth ${subtitleMode === "en" ? "bg-amber-500 font-bold text-black" : "text-slate-300 hover:bg-white/10"}`}>
                            انگلیسی
                          </button>
                        ) : null}
                      </div>
                      {subtitleError ? <p className="mt-2 text-xs text-red-300">{subtitleError}</p> : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <button onClick={toggleFullscreen} className="grid size-10 place-items-center rounded-lg text-white transition-smooth hover:bg-white/20" aria-label="تمام صفحه">
              <Maximize className="size-5" />
            </button>
          </div>
        </div>
      </div>

      {!playing ? (
        <button onClick={togglePlay} className="absolute left-1/2 top-1/2 grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white backdrop-blur-md transition-smooth hover:scale-110 hover:bg-black/80" aria-label="پخش">
          <Play className="mr-1 size-10 fill-current" />
        </button>
      ) : null}
    </div>
  );
}
