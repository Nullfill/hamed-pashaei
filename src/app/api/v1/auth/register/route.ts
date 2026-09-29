import { apiError, apiSuccess } from "@/lib/api/v1";
import { requireApiClient } from "@/lib/api/clientGuard";
import { hashPassword } from "@/lib/auth/password";
import { issueMobileTokens, publicMobileTokens } from "@/lib/auth/session";
import { countUsers, createUser } from "@/lib/auth/store";
import { registerSchema } from "@/lib/auth/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = await requireApiClient(request);
  if (guard instanceof Response) return guard;
  const body = await request.json().catch(() => undefined);
  const parsed = registerSchema.pick({ name: true, email: true, password: true }).safeParse(body);
  if (!parsed.success) {
    return apiError(request, 400, "INVALID_REGISTRATION", "اطلاعات ثبت‌نام معتبر نیست.", parsed.error.flatten().fieldErrors);
  }

  try {
    const userCount = await countUsers();
    const user = await createUser({
      name: parsed.data.name || undefined,
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
      role: userCount === 0 ? "ADMIN" : "USER",
    });
    const tokens = await issueMobileTokens(user.id);
    return apiSuccess(request, { user, tokens: publicMobileTokens(tokens) }, { firstUserIsAdmin: userCount === 0 });
  } catch (error) {
    if (error instanceof Error && error.message === "USER_EXISTS") {
      return apiError(request, 409, "USER_EXISTS", "این ایمیل قبلاً ثبت شده است.");
    }
    return apiError(request, 500, "REGISTRATION_FAILED", "ثبت‌نام انجام نشد.");
  }
}
