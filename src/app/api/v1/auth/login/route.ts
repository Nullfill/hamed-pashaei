import { apiError, apiSuccess } from "@/lib/api/v1";
import { requireApiClient } from "@/lib/api/clientGuard";
import { verifyPassword } from "@/lib/auth/password";
import { issueMobileTokens, publicMobileTokens } from "@/lib/auth/session";
import { findUserByEmail } from "@/lib/auth/store";
import { loginSchema } from "@/lib/auth/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = await requireApiClient(request);
  if (guard instanceof Response) return guard;
  const body = await request.json().catch(() => undefined);
  const parsed = loginSchema.pick({ email: true, password: true }).safeParse(body);
  if (!parsed.success) {
    return apiError(request, 400, "INVALID_CREDENTIALS", "ایمیل یا رمز عبور معتبر نیست.");
  }

  const user = await findUserByEmail(parsed.data.email);
  const validPassword = user ? await verifyPassword(parsed.data.password, user.passwordHash) : false;
  if (!user || !validPassword || user.status !== "ACTIVE") {
    return apiError(request, 401, "INVALID_CREDENTIALS", "ایمیل یا رمز عبور اشتباه است.");
  }

  const tokens = await issueMobileTokens(user.id);
  return apiSuccess(request, { user, tokens: publicMobileTokens(tokens) });
}
