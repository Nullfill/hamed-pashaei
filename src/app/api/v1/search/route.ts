import { apiError, apiSuccess, parseLimit } from "@/lib/api/v1";
import { requireApiClient } from "@/lib/api/clientGuard";
import { getProvider, searchAllProviders } from "@/lib/providers/registry";
import { toPublicError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireApiClient(request, "catalog:read");
  if (guard instanceof Response) return guard;
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";
    if (!query) return apiSuccess(request, { results: [] }, { query });
    const provider = searchParams.get("provider") || searchParams.get("src") || undefined;
    const results = provider ? await getProvider(provider).search(query) : await searchAllProviders(query);
    const limit = parseLimit(searchParams.get("limit"), 30, 100);
    return apiSuccess(request, { results: results.slice(0, limit) }, { query, provider: provider || "all" });
  } catch (error) {
    const publicError = toPublicError(error);
    return apiError(request, publicError.status, "SEARCH_UNAVAILABLE", publicError.message);
  }
}
