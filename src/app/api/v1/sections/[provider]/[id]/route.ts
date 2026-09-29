import { apiError, apiSuccess, parsePage } from "@/lib/api/v1";
import { requireApiClient } from "@/lib/api/clientGuard";
import { toMobileSection } from "@/lib/providers/mobileContent";
import { getSection } from "@/lib/providers/registry";
import { toPublicError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string; id: string }> },
) {
  const guard = await requireApiClient(request, "catalog:read");
  if (guard instanceof Response) return guard;
  try {
    const values = await params;
    const searchParams = new URL(request.url).searchParams;
    const section = await getSection(values.provider, decodeURIComponent(values.id), searchParams.get("type") || undefined, parsePage(searchParams.get("page")));
    return apiSuccess(request, { section: toMobileSection(section, request.url) });
  } catch (error) {
    const publicError = toPublicError(error);
    return apiError(request, publicError.status, "SECTION_UNAVAILABLE", publicError.message);
  }
}
