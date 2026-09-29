import { apiError } from "@/lib/api/v1";
import { authenticateApiClient } from "@/lib/auth/apiClients";

export async function requireApiClient(request: Request, scope?: string) {
  const required = process.env.MOBILE_API_REQUIRE_KEY === "1" ||
    (process.env.MOBILE_API_REQUIRE_KEY !== "0" && process.env.NODE_ENV === "production");
  if (!required) return undefined;

  const key = request.headers.get("x-api-key")?.trim();
  if (!key) return apiError(request, 401, "API_KEY_REQUIRED", "X-API-Key لازم است.");
  const client = await authenticateApiClient(request, scope);
  if (!client) return apiError(request, 403, "API_KEY_INVALID", "API Client معتبر نیست یا Scope لازم را ندارد.");
  return client;
}

