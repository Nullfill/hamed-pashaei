import { z } from "zod";
import { apiError, apiSuccess, parseLimit } from "@/lib/api/v1";
import { requireApiClient } from "@/lib/api/clientGuard";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { isFavorite, listFavorites, setFavorite } from "@/lib/activity/store";
import { mediaTypeSchema } from "@/lib/providers/types";

export const dynamic = "force-dynamic";

const itemSchema = z.object({
  provider: z.string().optional(),
  type: mediaTypeSchema,
  id: z.string().min(1),
  title: z.string().optional(),
  poster: z.string().optional(),
  favorite: z.boolean(),
});

export async function GET(request: Request) {
  const guard = await requireApiClient(request, "profile:read");
  if (guard instanceof Response) return guard;
  const user = await getAuthenticatedUser(request);
  if (!user) return apiError(request, 401, "AUTH_REQUIRED", "برای مشاهده علاقه‌مندی‌ها وارد حساب شوید.");
  const limit = parseLimit(new URL(request.url).searchParams.get("limit"), 50, 100);
  return apiSuccess(request, { favorites: await listFavorites(user.id, limit) });
}

export async function PUT(request: Request) {
  const guard = await requireApiClient(request, "profile:write");
  if (guard instanceof Response) return guard;
  const user = await getAuthenticatedUser(request);
  if (!user) return apiError(request, 401, "AUTH_REQUIRED", "برای تغییر علاقه‌مندی وارد حساب شوید.");
  const parsed = itemSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return apiError(request, 400, "INVALID_FAVORITE", "اطلاعات علاقه‌مندی معتبر نیست.");
  await setFavorite(user.id, parsed.data, parsed.data.favorite);
  return apiSuccess(request, { favorite: await isFavorite(user.id, parsed.data) });
}

export async function DELETE(request: Request) {
  const guard = await requireApiClient(request, "profile:write");
  if (guard instanceof Response) return guard;
  const user = await getAuthenticatedUser(request);
  if (!user) return apiError(request, 401, "AUTH_REQUIRED", "برای تغییر علاقه‌مندی وارد حساب شوید.");
  const parsed = itemSchema
    .omit({ title: true, poster: true, favorite: true })
    .safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return apiError(request, 400, "INVALID_FAVORITE", "اطلاعات علاقه‌مندی معتبر نیست.");
  await setFavorite(user.id, parsed.data, false);
  return apiSuccess(request, { favorite: false });
}
