import { apiError, apiSuccess } from "@/lib/api/v1";
import { requireApiClient } from "@/lib/api/clientGuard";
import { toMobileCountries } from "@/lib/providers/mobileContent";
import { getAllCountries } from "@/lib/providers/registry";
import { toPublicError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireApiClient(request, "catalog:read");
  if (guard instanceof Response) return guard;
  try {
    return apiSuccess(request, { countries: toMobileCountries(await getAllCountries()) });
  } catch (error) {
    const publicError = toPublicError(error);
    return apiError(request, publicError.status, "COUNTRIES_UNAVAILABLE", publicError.message);
  }
}
