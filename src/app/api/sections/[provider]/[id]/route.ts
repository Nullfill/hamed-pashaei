import { NextResponse } from "next/server";
import { getSection } from "@/lib/providers/registry";
import { toPublicError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string; id: string }> },
) {
  try {
    const values = await params;
    const searchParams = new URL(request.url).searchParams;
    const page = Number(searchParams.get("page") || 1);
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
    const section = await getSection(
      values.provider,
      decodeURIComponent(values.id),
      searchParams.get("type") || undefined,
      safePage,
    );
    return NextResponse.json({ section }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const publicError = toPublicError(error);
    return NextResponse.json(
      { error: { message: publicError.message } },
      { status: publicError.status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
