import { z } from "zod";
import { apiError, apiSuccess, parseLimit } from "@/lib/api/v1";
import { requireApiClient } from "@/lib/api/clientGuard";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { getWatchProgress, listWatchProgress, saveWatchProgress } from "@/lib/activity/store";
import { mediaTypeSchema } from "@/lib/providers/types";

export const dynamic = "force-dynamic";

const itemSchema = z.object({
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
  const guard = await requireApiClient(request, "profile:read");
  if (guard instanceof Response) return guard;
  const user = await getAuthenticatedUser(request);
  if (!user) return apiError(request, 401, "AUTH_REQUIRED", "برای مشاهده ادامه تماشا وارد حساب شوید.");
  const { searchParams } = new URL(request.url);
  const limit = parseLimit(searchParams.get("limit"), 50, 100);
  const type = searchParams.get("type");
  const id = searchParams.get("id");
  if (type && id) {
    const parsed = itemSchema.pick({ provider: true, type: true, id: true, season: true, episode: true }).safeParse({
      provider: searchParams.get("provider") || undefined,
      type,
      id,
      season: searchParams.get("season") || undefined,
      episode: searchParams.get("episode") || undefined,
    });
    if (!parsed.success) return apiError(request, 400, "INVALID_PROGRESS", "شناسه پیشرفت معتبر نیست.");
    return apiSuccess(request, { progress: await getWatchProgress(user.id, parsed.data) });
  }
  return apiSuccess(request, { progress: await listWatchProgress(user.id, limit) });
}

export async function PUT(request: Request) {
  const guard = await requireApiClient(request, "profile:write");
  if (guard instanceof Response) return guard;
  const user = await getAuthenticatedUser(request);
  if (!user) return apiError(request, 401, "AUTH_REQUIRED", "برای ذخیره پیشرفت وارد حساب شوید.");
  const parsed = itemSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return apiError(request, 400, "INVALID_PROGRESS", "اطلاعات پیشرفت معتبر نیست.");
  return apiSuccess(request, { progress: await saveWatchProgress(user.id, parsed.data) });
}
