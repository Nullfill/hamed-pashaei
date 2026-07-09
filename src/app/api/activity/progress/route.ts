import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getWatchProgress, saveWatchProgress } from "@/lib/activity/store";
import { mediaTypeSchema } from "@/lib/providers/types";

const progressSchema = z.object({
  provider: z.string().optional(),
  type: mediaTypeSchema,
  id: z.string().min(1),
  season: z.string().optional(),
  episode: z.string().optional(),
  title: z.string().optional(),
  poster: z.string().optional(),
  progressSeconds: z.number().min(0),
  durationSeconds: z.number().min(0).optional(),
});

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ progress: undefined }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = progressSchema
    .pick({ provider: true, type: true, id: true, season: true, episode: true })
    .safeParse({
      provider: searchParams.get("provider") || searchParams.get("src") || undefined,
      type: searchParams.get("type"),
      id: searchParams.get("id"),
      season: searchParams.get("season") || undefined,
      episode: searchParams.get("episode") || undefined,
    });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid progress request." }, { status: 400 });
  }

  const progress = await getWatchProgress(user.id, parsed.data);
  return NextResponse.json({ progress });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const parsed = progressSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid progress payload." }, { status: 400 });
  }

  const progress = await saveWatchProgress(user.id, parsed.data);
  return NextResponse.json({ progress });
}
