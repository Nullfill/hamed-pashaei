import { apiError, apiSuccess } from "@/lib/api/v1";
import { requireApiClient } from "@/lib/api/clientGuard";
import { getAuthenticatedUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireApiClient(request, "profile:read");
  if (guard instanceof Response) return guard;
  const user = await getAuthenticatedUser(request);
  if (!user) return apiError(request, 401, "AUTH_REQUIRED", "برای این درخواست وارد حساب شوید.");
  return apiSuccess(request, { user });
}
