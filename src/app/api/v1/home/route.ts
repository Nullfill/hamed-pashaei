import { apiError, apiSuccess, parseLimit } from "@/lib/api/v1";
import { requireApiClient } from "@/lib/api/clientGuard";
import { toMobileSection } from "@/lib/providers/mobileContent";
import { getAllHomeSections } from "@/lib/providers/registry";
import { toPublicError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireApiClient(request);
  if (guard instanceof Response) return guard;
  try {
    const sections = await getAllHomeSections();
    const { searchParams } = new URL(request.url);
    const offset = Math.max(0, Math.min(sections.length, Number(searchParams.get("offset") || 0)));
    const limit = parseLimit(searchParams.get("limit"), 6, 12);
    const page = sections.slice(offset, offset + limit).map((section) => toMobileSection(section, request.url));
    return apiSuccess(request, { sections: page }, {
      offset,
      nextOffset: offset + page.length,
      total: sections.length,
      hasMore: offset + page.length < sections.length,
    });
  } catch (error) {
    const publicError = toPublicError(error);
    return apiError(request, publicError.status, "HOME_UNAVAILABLE", publicError.message);
  }
}
