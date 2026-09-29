import { apiError, apiSuccess } from "@/lib/api/v1";
import { requireApiClient } from "@/lib/api/clientGuard";
import { toMobileDetails } from "@/lib/providers/mobilePlayback";
import { fromPublicProviderCode, getProvider } from "@/lib/providers/registry";
import { mediaTypeSchema } from "@/lib/providers/types";
import { toPublicError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string; type: string; id: string }> },
) {
  const guard = await requireApiClient(request, "catalog:read");
  if (guard instanceof Response) return guard;
  try {
    const values = await params;
    const type = mediaTypeSchema.parse(values.type);
    const providerId = fromPublicProviderCode(values.provider);
    if (!providerId) return apiError(request, 404, "PROVIDER_NOT_FOUND", "Provider پیدا نشد.");
    const details = await getProvider(providerId).getDetails({ id: decodeURIComponent(values.id), type });
    return apiSuccess(request, { media: toMobileDetails(details, request.url) });
  } catch (error) {
    const publicError = toPublicError(error);
    return apiError(request, publicError.status, "MEDIA_UNAVAILABLE", publicError.message);
  }
}
