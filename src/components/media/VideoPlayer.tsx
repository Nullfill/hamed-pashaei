"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Maximize, Pause, Play, RotateCcw, RotateCw, Settings, Sun, Volume2, VolumeX, X } from "lucide-react";
import type Hls from "hls.js";
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
  manageFullscreen?: boolean;
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

function isHlsSource(source?: PlaybackSource) {
  if (!source) return false;
  if (source.type?.toLowerCase().includes("mpegurl")) return true;

  try {
    const parsed = new URL(source.src, "http://localhost");
    const candidate = parsed.searchParams.get("url") || source.src;
    return /\.m3u8(?:\?|$)/i.test(candidate);
  } catch {
    return /\.m3u8(?:\?|$)/i.test(source.src);
  }
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
  manageFullscreen = true,
  onControlsVisibilityChange,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gestureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gestureRef = useRef<TouchGesture | null>(null);
  const pendingResumeRef = useRef(0);
  const pendingPlayRef = useRef(false);
  const autoPlayAttemptedRef = useRef(false);
  const lastSavedAtRef = useRef(0);
  const lastServerSavedAtRef = useRef(0);

  const progressKey = useMemo(() => storageKey({ id, type, provider, season, episode }), [episode, id, provider, season, type]);
  const [data, setData] = useState<PlaybackData>({ sources: [] });
  const [mode, setMode] = useState<PlaybackMode>(dubbed === "1" ? "dub" : "sub");
  const [selected, setSelected] = useState<PlaybackSource | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceError, setSourceError] = useState<string>();
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
    const ignoreExpectedMediaAbort = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (reason instanceof DOMException && reason.name === "AbortError") event.preventDefault();
    };
    window.addEventListener("unhandledrejection", ignoreExpectedMediaAbort);
    return () => window.removeEventListener("unhandledrejection", ignoreExpectedMediaAbort);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPlayback() {
      setLoading(true);
      setError(undefined);
      setSelected(undefined);

      const params = new URLSearchParams({ type, id, dubbed });
      if (provider) params.set("src", provider === "gapfilm" ? "b" : provider === "shabforoosh" ? "a" : provider === "filimo" ? "c" : provider === "sheyda" ? "d" : provider);
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
  const posterUrl = data.poster || poster;
  const progressPercent = duration > 0 ? clamp((currentTime / duration) * 100, 0, 100) : 0;
  const selectedIsHls = isHlsSource(selected);
  const activeSubtitleUrl = selected ? (subtitleMode === "fa" ? selected.subtitleFa : subtitleMode === "en" ? selected.subtitleEn : undefined) : undefined;
  const activeSubtitleText = subtitleMode === "off" ? "" : subtitleCues.find((cue) => currentTime >= cue.start && currentTime <= cue.end)?.text || "";

  async function keepFullscreenLandscape() {
    if (!fill) return;
    const container = containerRef.current;
    if (!container) return;

    if (manageFullscreen && !document.fullscreenElement) {
      await container.requestFullscreen?.().catch(() => undefined);
    }
    await lockLandscape();
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !selected) {
      setSourceLoading(false);
      return;
    }

    autoPlayAttemptedRef.current = false;
    setSourceError(undefined);
    if (!selectedIsHls) {
      setSourceLoading(false);
      return;
    }

    setSourceLoading(true);
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = selected.src;
      video.load();
      return;
    }

    let cancelled = false;
    let instance: Hls | undefined;
    let networkRecoveryAttempted = false;
    let mediaRecoveryAttempted = false;
    void import("hls.js").then(({ default: Hls }) => {
      if (cancelled) return;
      if (!Hls.isSupported()) {
        setSourceLoading(false);
        setSourceError("مرورگر شما از پخش این فرمت ویدیو پشتیبانی نمی‌کند.");
        return;
      }
      const hls = new Hls({ enableWorker: true });
      instance = hls;
      hls.on(Hls.Events.ERROR, (_event, details) => {
        if (cancelled || !details.fatal) return;
        if (details.type === Hls.ErrorTypes.NETWORK_ERROR && !networkRecoveryAttempted) {
          networkRecoveryAttempted = true;
          hls.startLoad();
          return;
        }
        if (details.type === Hls.ErrorTypes.MEDIA_ERROR && !mediaRecoveryAttempted) {
          mediaRecoveryAttempted = true;
          hls.recoverMediaError();
          return;
        }
        setSourceLoading(false);
        setSourceError(`خطای پخش HLS: ${details.details}`);
        hls.destroy();
      });
      hls.attachMedia(video);
      hls.loadSource(selected.src);
    }).catch(() => {
      if (!cancelled) {
        setSourceLoading(false);
        setSourceError("راه‌اندازی پخش‌کننده ویدیو ناموفق بود.");
      }
    });

    return () => {
      cancelled = true;
      pendingPlayRef.current = false;
      instance?.destroy();
    };
  }, [selected, selectedIsHls, sourceKey]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setSourceError(undefined);
      const resumeAt = pendingResumeRef.current || readProgress(progressKey);
      setDuration(video.duration || 0);
      if (resumeAt > 5 && (!Number.isFinite(video.duration) || resumeAt < video.duration - 8)) {
        video.currentTime = resumeAt;
        setCurrentTime(resumeAt);
      }
      void keepFullscreenLandscape();
    };
    const handleCanPlay = () => {
      setSourceLoading(false);
      setSourceError(undefined);
      const shouldAutoPlay = autoPlay && !autoPlayAttemptedRef.current;
      autoPlayAttemptedRef.current = true;
      if (shouldAutoPlay || pendingPlayRef.current) {
        pendingPlayRef.current = false;
        void video.play().catch((playError: unknown) => {
          if (!(playError instanceof DOMException) || playError.name !== "AbortError") {
            setSourceError("ویدیو آماده‌ی پخش نشد. چند لحظه بعد دوباره تلاش کنید.");
          }
        });
      }
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
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("volumechange", handleVolumeChange);

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("canplay", handleCanPlay);
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
  }, [fill, manageFullscreen, sourceKey]);

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
    if (playing) {
      pendingPlayRef.current = false;
      video.pause();
      return;
    }
    if (video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
      pendingPlayRef.current = true;
      setSourceLoading(true);
      return;
    }
    void video.play().catch((playError: unknown) => {
      if (playError instanceof DOMException && (playError.name === "AbortError" || playError.name === "NotAllowedError")) return;
      setSourceError("این منبع ویدیو در مرورگر قابل پخش نیست.");
    });
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const time = Number(event.target.value);
    video.currentTime = time;
    setCurrentTime(time);
    writeProgress(progressKey, time, video.duration);
  };

  const seekBy = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    const next = clamp(video.currentTime + seconds, 0, video.duration || Infinity);
    video.currentTime = next;
    setCurrentTime(next);
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
    if (!document.fullscreenElement) void containerRef.current.requestFullscreen().catch(() => undefined);
    else void document.exitFullscreen().catch(() => undefined);
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
    ? `player-shell player-shell-fill group relative h-full w-full touch-none overflow-hidden bg-black ${showSettings ? "player-shell-settings-open" : ""}`
    : `player-shell group relative touch-none overflow-hidden rounded-2xl border border-white/[0.08] bg-black shadow-2xl ${showSettings ? "player-shell-settings-open" : ""}`;
  const videoClass = fill ? "player-video relative z-10 h-full w-full bg-black object-contain" : "player-video relative z-10 aspect-video w-full bg-black";
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
      {data.poster ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 scale-110 bg-cover bg-center opacity-25 blur-2xl"
          style={{ backgroundImage: `url(${posterUrl})` }}
        />
      ) : null}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.06),transparent_48%),linear-gradient(180deg,rgba(2,4,6,0.18),rgba(2,4,6,0.5))]" />
      <video ref={videoRef} key={sourceKey} poster={posterUrl} className={videoClass} style={{ filter: `brightness(${brightness})` }} playsInline preload="metadata">
        {!selectedIsHls ? <source src={selected.src} type={selected.type} /> : null}
      </video>

      {sourceLoading && !sourceError ? (
        <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
          <span className="grid size-14 place-items-center rounded-full bg-black/65 text-amber-400 backdrop-blur-sm">
            <Loader2 className="size-7 animate-spin" aria-label="در حال آماده‌سازی ویدیو" />
          </span>
        </div>
      ) : null}

      {sourceError ? (
        <div className="absolute inset-0 z-30 grid place-items-center bg-black/70 px-6 text-center backdrop-blur-sm">
          <div className="max-w-md">
            <p className="text-sm leading-7 text-slate-200">{sourceError}</p>
            <button
              type="button"
              onClick={() => {
                pendingPlayRef.current = true;
                setSourceError(undefined);
                setSelected((current) => current ? { ...current } : current);
              }}
              className="mt-4 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-black transition-colors hover:bg-amber-300"
            >
              تلاش دوباره
            </button>
          </div>
        </div>
      ) : null}

      {activeSubtitleText ? (
        <div
          dir="auto"
          className={`player-subtitle pointer-events-none transition-[bottom] ${
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
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-40 flex min-w-36 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-3 rounded-3xl border border-white/15 bg-[#0b0d10]/80 px-6 py-5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
          <span className="grid size-11 place-items-center rounded-2xl bg-amber-400/15 text-amber-300">
            {gestureHud.kind === "brightness" ? <Sun className="size-6" /> : <Volume2 className="size-6" />}
          </span>
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-amber-400 transition-[width]" style={{ width: `${clamp(gestureHud.value, 0, 100)}%` }} />
          </div>
          <span className="text-xs font-bold text-white/80">{gestureHud.kind === "brightness" ? "روشنایی" : "صدا"} · {clamp(gestureHud.value, 0, 100)}%</span>
        </div>
      ) : null}

      <div className={`player-chrome transition-opacity duration-300 ${controlsVisible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}>
        <div dir="rtl" className="mb-1.5 flex items-center justify-between px-1 text-[10px] font-semibold tabular-nums text-white/60 sm:text-xs">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <input
          dir="ltr"
          type="range"
          min="0"
          max={duration || 0}
          value={Math.min(currentTime, duration || currentTime)}
          onChange={handleSeek}
          style={{ background: `linear-gradient(to right, #f59e0b ${progressPercent}%, rgba(255,255,255,0.2) ${progressPercent}%)` }}
          className="player-range mb-3"
        />

        <div dir="ltr" className="player-control-bar gap-1 sm:gap-3 sm:px-3 sm:py-2.5">
          <div className="flex min-w-0 items-center gap-1 sm:gap-2">
            <button onClick={togglePlay} className={`grid size-10 shrink-0 place-items-center rounded-full transition-all sm:size-11 ${playing ? "bg-amber-400 text-black shadow-[0_0_0_4px_rgba(245,158,11,0.16)]" : "bg-white/[0.08] text-white hover:bg-amber-400 hover:text-black"}`} aria-label={playing ? "توقف" : "پخش"}>
              {playing ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}
            </button>
            <button onClick={() => seekBy(-10)} className="relative grid size-9 shrink-0 place-items-center rounded-full text-white/75 transition-colors hover:bg-white/10 hover:text-white sm:size-10" aria-label="۱۰ ثانیه عقب"><RotateCcw className="size-5" /><span className="absolute text-[8px] font-black">10</span></button>
            <button onClick={() => seekBy(10)} className="relative grid size-9 shrink-0 place-items-center rounded-full text-white/75 transition-colors hover:bg-white/10 hover:text-white sm:size-10" aria-label="۱۰ ثانیه جلو"><RotateCw className="size-5" /><span className="absolute text-[8px] font-black">10</span></button>
            <button onClick={toggleMute} className="grid size-9 shrink-0 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white sm:size-10" aria-label={muted ? "فعال کردن صدا" : "بی‌صدا"}>
              {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
            </button>
            <input
              dir="ltr"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={muted ? 0 : volume}
              onChange={handleVolumeChange}
              className="hidden h-1 w-20 cursor-pointer appearance-none rounded-full bg-white/20 accent-amber-400 sm:block"
            />
            <span className="hidden whitespace-nowrap text-xs font-medium tabular-nums text-slate-300 sm:block">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <div className="relative">
              <button onClick={() => setShowSettings((value) => !value)} className={`grid size-10 place-items-center rounded-xl transition-colors hover:bg-white/15 ${showSettings ? "bg-amber-400 text-black shadow-[0_0_0_4px_rgba(245,158,11,0.14)]" : "text-white"}`} aria-label="تنظیمات">
                <Settings className="size-5" />
              </button>

              {showSettings ? (
                <div id="video-player-settings" dir="rtl" role="dialog" aria-label="تنظیمات پخش" onPointerDown={(event) => event.stopPropagation()} className="player-settings-panel p-3.5 text-right max-sm:p-4">
                  <div className="mb-3 flex items-start justify-between gap-3 border-b border-white/[0.1] pb-3">
                    <div><span className="block text-sm font-bold text-white">تنظیمات پخش</span><span className="text-[11px] text-slate-500">کیفیت، صدا و زیرنویس</span></div>
                    <button onClick={() => setShowSettings(false)} className="grid size-6 place-items-center rounded text-slate-400 hover:text-white" aria-label="بستن">
                      <X className="size-4" />
                    </button>
                  </div>

                  {modes.length > 1 ? (
                    <div className="mb-3.5">
                      <p className="mb-2 text-xs font-bold text-slate-400">نسخه پخش</p>
                      <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/[0.07] bg-black/25 p-1">
                        {modes.map((item) => (
                          <button type="button" key={item} onClick={() => changeMode(item)} aria-selected={mode === item} className={`player-settings-option justify-center px-2.5 py-2 text-center text-xs ${mode === item ? "font-bold" : ""}`}>
                            {modeLabel(item)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {modeSources.length > 1 ? (
                    <div className="mb-3.5">
                      <p className="mb-2 text-xs font-bold text-slate-400">کیفیت تصویر</p>
                      <div className="flex flex-col gap-1 rounded-xl border border-white/[0.07] bg-black/20 p-1">
                        {modeSources.map((source) => (
                        <button type="button" key={source.src} onClick={() => selectSource(source)} aria-selected={selected.src === source.src} className={`player-settings-option min-h-10 px-3 py-2 text-right text-sm ${selected.src === source.src ? "font-bold" : ""}`}>
                            {source.quality ? `${source.quality}p` : "کیفیت اصلی"}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {selected.subtitleFa || selected.subtitleEn ? (
                    <div>
                      <p className="mb-2 text-xs font-bold text-slate-400">زیرنویس</p>
                      <div className="flex flex-col gap-1 rounded-xl border border-white/[0.07] bg-black/20 p-1">
                          <button type="button" onClick={() => setSubtitleMode("off")} aria-selected={subtitleMode === "off"} className={`player-settings-option px-3 py-2 text-right text-sm ${subtitleMode === "off" ? "font-bold" : ""}`}>
                          خاموش
                        </button>
                        {selected.subtitleFa ? (
                          <button type="button" onClick={() => setSubtitleMode("fa")} aria-selected={subtitleMode === "fa"} className={`player-settings-option px-3 py-2 text-right text-sm ${subtitleMode === "fa" ? "font-bold" : ""}`}>
                            فارسی
                          </button>
                        ) : null}
                        {selected.subtitleEn ? (
                          <button type="button" onClick={() => setSubtitleMode("en")} aria-selected={subtitleMode === "en"} className={`player-settings-option px-3 py-2 text-right text-sm ${subtitleMode === "en" ? "font-bold" : ""}`}>
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

            <button onClick={toggleFullscreen} className="grid size-10 place-items-center rounded-xl text-white transition-colors hover:bg-white/15" aria-label="تمام صفحه">
              <Maximize className="size-5" />
            </button>
          </div>
        </div>
      </div>

      {!playing ? (
        <button onClick={togglePlay} className="group absolute left-1/2 top-1/2 z-30 grid size-[4.75rem] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-amber-300/70 bg-amber-400 text-black shadow-[0_0_0_8px_rgba(245,158,11,0.12),0_18px_50px_rgba(0,0,0,0.45)] transition duration-300 hover:scale-110 hover:bg-amber-300 sm:size-20" aria-label="پخش">
          <Play className="mr-[-3px] size-9 fill-current transition-transform group-hover:scale-110 sm:size-10" />
        </button>
      ) : null}
    </div>
  );
}
