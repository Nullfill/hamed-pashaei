import { NextResponse } from "next/server";
import { browseAllProviders, browseByCategoryKeys, getProvider } from "@/lib/providers/registry";
import { mediaTypeSchema } from "@/lib/providers/types";
import { toPublicError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = mediaTypeSchema.parse(searchParams.get("type") ?? "movie");
    const page = Number(searchParams.get("page") || 1);
    const genres = searchParams.get("genres") || undefined;
    const categoryKeys = searchParams.get("cats") || undefined;
    const country = searchParams.get("country") || undefined;
    const dubbed = searchParams.get("dubbed") === "1";
    const subtitle = searchParams.get("subtitle") === "1";
    const source = searchParams.get("src") || searchParams.get("provider");

    const input = {
      type,
      page: Number.isFinite(page) && page > 0 ? page : 1,
      genres,
      country,
      dubbed,
      subtitle,
    };

    const result = categoryKeys
      ? await browseByCategoryKeys({ ...input, categoryKeys, source })
      : source
        ? await getProvider(source).browse(input)
        : await browseAllProviders(input);

    return NextResponse.json(result);
  } catch (error) {
    const publicError = toPublicError(error);
    return NextResponse.json({ error: publicError.message, items: [] }, { status: publicError.status });
  }
}
