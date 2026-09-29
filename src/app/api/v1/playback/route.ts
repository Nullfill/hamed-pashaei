import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/v1";
import { requireApiClient } from "@/lib/api/clientGuard";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { toMobilePlayback } from "@/lib/providers/mobilePlayback";
import { getProvider } from "@/lib/providers/registry";
import { mediaTypeSchema } from "@/lib/providers/types";
import { toPublicError } from "@/lib/utils/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const inputSchema = z.object({
  provider: z.string().optional(),
  type: mediaTypeSchema,
  id: z.string().min(1),
  dubbed: z.union([z.string(), z.boolean()]).optional(),
  season: z.union([z.string(), z.number()]).optional(),
  episode: z.union([z.string(), z.number()]).optional(),
  playbackId: z.string().optional(),
  sourcePath: z.string().optional(),
});

async function handle(request: Request, raw: unknown) {
  const guard = await requireApiClient(request, "playback:read");
  if (guard instanceof Response) return guard;
  const user = await getAuthenticatedUser(request);
  if (!user) return apiError(request, 401, "AUTH_REQUIRED", "برای پخش محتوا وارد حساب شوید.");

  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) {
    return apiError(request, 400, "INVALID_PLAYBACK_REQUEST", "اطلاعات پخش معتبر نیست.", parsed.error.flatten().fieldErrors);
  }

  try {
    const provider = parsed.data.provider;
    const playback = await getProvider(provider).getPlayback({
      provider,
      id: parsed.data.id,
      type: parsed.data.type,
      dubbed: typeof parsed.data.dubbed === "boolean" ? (parsed.data.dubbed ? "1" : "0") : parsed.data.dubbed,
      season: parsed.data.season === undefined ? undefined : String(parsed.data.season),
      episode: parsed.data.episode === undefined ? undefined : String(parsed.data.episode),
      playbackId: parsed.data.playbackId,
      sourcePath: parsed.data.sourcePath,
    });
    const providerId = getProvider(provider).id;
    return apiSuccess(request, {
      provider: providerId,
      type: parsed.data.type,
      id: parsed.data.id,
      delivery: "direct",
      playback: toMobilePlayback(playback, request.url, providerId),
    });
  } catch (error) {
    const publicError = toPublicError(error);
    return apiError(request, publicError.status, "PLAYBACK_UNAVAILABLE", publicError.message);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return handle(request, {
    provider: searchParams.get("provider") || searchParams.get("src") || undefined,
    type: searchParams.get("type"),
    id: searchParams.get("id"),
    dubbed: searchParams.get("dubbed") || undefined,
    season: searchParams.get("season") || undefined,
    episode: searchParams.get("episode") || undefined,
    playbackId: searchParams.get("playbackId") || undefined,
  });
}

export async function POST(request: Request) {
  return handle(request, await request.json().catch(() => undefined));
}
