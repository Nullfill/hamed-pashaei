import { NextResponse } from "next/server";
import { getProvider, searchAllProviders } from "@/lib/providers/registry";
import { toPublicError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() ?? "";
    const provider = searchParams.get("src") || searchParams.get("provider");

    if (!query) {
      return NextResponse.json({ results: [] });
    }

    const results = provider ? await getProvider(provider).search(query) : await searchAllProviders(query);
    return NextResponse.json({ results });
  } catch (error) {
    const publicError = toPublicError(error);
    return NextResponse.json({ error: publicError.message }, { status: publicError.status });
  }
}
