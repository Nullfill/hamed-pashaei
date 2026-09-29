import { apiSuccess } from "@/lib/api/v1";
import { requireApiClient } from "@/lib/api/clientGuard";
import { revokeMobileToken } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const guard = await requireApiClient(request);
  if (guard instanceof Response) return guard;
  const body = await request.json().catch(() => ({})) as { refreshToken?: unknown };
  const authorization = request.headers.get("authorization") || "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const refreshToken = typeof body.refreshToken === "string" ? body.refreshToken : undefined;

  if (bearer) await revokeMobileToken(bearer);
  if (refreshToken) await revokeMobileToken(refreshToken);

  // Logout is intentionally idempotent so the app can safely call it during cleanup.
  return apiSuccess(request, { loggedOut: true });
}
