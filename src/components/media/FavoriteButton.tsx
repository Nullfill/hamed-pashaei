"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import type { MediaDetails } from "@/lib/providers/types";

export function FavoriteButton({ details }: { details: MediaDetails }) {
  const [favorite, setFavorite] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      provider: details.provider,
      type: details.type,
      id: details.id,
    });

    fetch(`/api/activity/favorite?${params.toString()}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then((response) => (response.ok ? response.json() : undefined))
      .then((payload: { favorite?: boolean } | undefined) => {
        if (!controller.signal.aborted) setFavorite(Boolean(payload?.favorite));
      })
      .catch(() => undefined)
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [details.id, details.provider, details.type]);

  const toggleFavorite = async () => {
    const next = !favorite;
    setFavorite(next);

    const response = await fetch("/api/activity/favorite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: details.provider,
        type: details.type,
        id: details.id,
        title: details.titleFa || details.title,
        poster: details.poster,
        favorite: next,
      }),
    }).catch(() => undefined);

    if (!response?.ok) {
      setFavorite(!next);
    }
  };

  return (
    <button
      type="button"
      disabled={loading}
      onClick={toggleFavorite}
      className={`inline-flex w-fit items-center gap-2 rounded-xl border px-5 py-3 text-sm font-black transition-smooth ${
        favorite
          ? "border-red-400/40 bg-red-500/15 text-red-200 hover:bg-red-500/20"
          : "border-white/[0.08] bg-white/[0.04] text-slate-200 hover:border-red-400/40 hover:bg-white/[0.08]"
      } disabled:cursor-not-allowed disabled:opacity-60`}
    >
      <Heart className={`size-4 ${favorite ? "fill-current" : ""}`} aria-hidden />
      {favorite ? "نشان شده" : "نشان کردن"}
    </button>
  );
}
