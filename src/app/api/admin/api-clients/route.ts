import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/api/v1";
import { createApiKey } from "@/lib/auth/apiClients";
import { getCurrentUser } from "@/lib/auth/session";
import { createApiClient, listApiClients, revokeApiClient } from "@/lib/auth/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().trim().min(2).max(100),
  scopes: z.array(z.string().min(1).max(80)).min(1).max(20).default(["*"]),
  rateLimit: z.number().int().min(1).max(10000).default(120),
  expiresAt: z.string().datetime().optional(),
});

async function requireAdmin(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN" || user.status !== "ACTIVE") {
    return apiError(request, 403, "ADMIN_REQUIRED", "دسترسی مدیر لازم است.");
  }
  return user;
}

export async function GET(request: Request) {
  const user = await requireAdmin(request);
  if (user instanceof Response) return user;
  const clients = await listApiClients();
  return apiSuccess(request, {
    clients: clients.map(({ keyHash: _keyHash, ...client }) => client),
  });
}

export async function POST(request: Request) {
  const user = await requireAdmin(request);
  if (user instanceof Response) return user;
  const parsed = createSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return apiError(request, 400, "INVALID_API_CLIENT", "اطلاعات API Client معتبر نیست.");

  const key = createApiKey();
  const client = await createApiClient({
    name: parsed.data.name,
    keyHash: key.hash,
    keyPrefix: key.prefix,
    scopes: parsed.data.scopes,
    rateLimit: parsed.data.rateLimit,
    expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
  });
  const safeClient = {
    id: client.id,
    name: client.name,
    keyPrefix: client.keyPrefix,
    scopes: client.scopes,
    status: client.status,
    rateLimit: client.rateLimit,
    expiresAt: client.expiresAt,
    createdAt: client.createdAt,
    lastUsedAt: client.lastUsedAt,
  };
  return apiSuccess(request, {
    client: safeClient,
    apiKey: key.value,
    warning: "این کلید فقط همین یک بار نمایش داده می‌شود.",
  }, {}, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await requireAdmin(request);
  if (user instanceof Response) return user;
  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) return apiError(request, 400, "INVALID_API_CLIENT", "شناسه API Client لازم است.");
  try {
    await revokeApiClient(id);
    return apiSuccess(request, { revoked: true, id });
  } catch (error) {
    if (error instanceof Error && error.message === "API_CLIENT_NOT_FOUND") {
      return apiError(request, 404, "API_CLIENT_NOT_FOUND", "API Client پیدا نشد.");
    }
    return apiError(request, 500, "API_CLIENT_REVOKE_FAILED", "لغو API Client انجام نشد.");
  }
}
