import { apiError, apiSuccess } from "@/lib/api/v1";
import { requireApiClient } from "@/lib/api/clientGuard";
import { toMobileSection } from "@/lib/providers/mobileContent";
import { getKidsSections } from "@/lib/providers/registry";
import { toPublicError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireApiClient(request, "catalog:read");
  if (guard instanceof Response) return guard;
  try {
    const sections = await getKidsSections();
    return apiSuccess(request, { sections: sections.map((section) => toMobileSection(section, request.url)) });
  } catch (error) {
    const publicError = toPublicError(error);
    return apiError(request, publicError.status, "KIDS_UNAVAILABLE", publicError.message);
  }
}
