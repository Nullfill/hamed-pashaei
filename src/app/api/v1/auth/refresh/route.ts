import { apiError, apiSuccess } from "@/lib/api/v1";
import { requireApiClient } from "@/lib/api/clientGuard";
import { issueMobileTokens, getMobileSession, publicMobileTokens, revokeMobileToken } from "@/lib/auth/session";
import { findUserById } from "@/lib/auth/store";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ refreshToken: z.string().min(20) });

export async function POST(request: Request) {
  const guard = await requireApiClient(request);
  if (guard instanceof Response) return guard;
  const parsed = schema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) {
    return apiError(request, 400, "INVALID_REFRESH_TOKEN", "Refresh token معتبر نیست.");
  }

  const current = await getMobileSession(parsed.data.refreshToken);
  if (!current || current.session.kind !== "refresh") {
    return apiError(request, 401, "REFRESH_TOKEN_EXPIRED", "Refresh token منقضی یا باطل شده است.");
  }

  const user = await findUserById(current.user.id);
  if (!user || user.status !== "ACTIVE") {
    return apiError(request, 401, "ACCOUNT_UNAVAILABLE", "حساب کاربری فعال نیست.");
  }

  const tokens = await issueMobileTokens(user.id);
  await revokeMobileToken(parsed.data.refreshToken, tokens.refreshSessionId);
  return apiSuccess(request, { user, tokens: publicMobileTokens(tokens) });
}
