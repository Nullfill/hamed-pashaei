import { apiError, apiSuccess, parseBoolean, parsePage } from "@/lib/api/v1";
import { requireApiClient } from "@/lib/api/clientGuard";
import { toMobileItem } from "@/lib/providers/mobileContent";
import { browseAllProviders, browseByCategoryKeys, browseProvider } from "@/lib/providers/registry";
import { mediaTypeSchema } from "@/lib/providers/types";
import { toPublicError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireApiClient(request, "catalog:read");
  if (guard instanceof Response) return guard;
  try {
    const { searchParams } = new URL(request.url);
    const type = mediaTypeSchema.parse(searchParams.get("type") || "movie");
    const page = parsePage(searchParams.get("page"));
    const source = searchParams.get("provider") || searchParams.get("src") || undefined;
    const input = {
      type,
      page,
      genres: searchParams.get("genres") || undefined,
      country: searchParams.get("country") || undefined,
      dubbed: parseBoolean(searchParams.get("dubbed")) || false,
      subtitle: parseBoolean(searchParams.get("subtitle")) || false,
    };
    const categoryKeys = searchParams.get("categories") || searchParams.get("cats") || undefined;
    const result = categoryKeys
      ? await browseByCategoryKeys({ ...input, categoryKeys, source })
      : source
        ? await browseProvider(source, input)
        : await browseAllProviders(input);

    return apiSuccess(request, {
      ...result,
      items: result.items.map((item) => toMobileItem(item, request.url)),
    }, { page, type });
  } catch (error) {
    const publicError = toPublicError(error);
    return apiError(request, publicError.status, "CATALOG_UNAVAILABLE", publicError.message);
  }
}
