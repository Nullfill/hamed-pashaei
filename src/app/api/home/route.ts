import { NextResponse } from "next/server";
import { getAllHomeSections } from "@/lib/providers/registry";
import { toPublicError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const sections = await getAllHomeSections();
    const { searchParams } = new URL(request.url);
    const offset = Math.max(
      0,
      Math.min(sections.length, Number(searchParams.get("offset") || 0)),
    );
    const limit = Math.max(
      1,
      Math.min(12, Number(searchParams.get("limit") || 6)),
    );
    const page = sections.slice(offset, offset + limit);
    return NextResponse.json({
      sections: page,
      offset,
      nextOffset: offset + page.length,
      total: sections.length,
      hasMore: offset + page.length < sections.length,
    });
  } catch (error) {
    const publicError = toPublicError(error);
    return NextResponse.json(
      { error: publicError.message, sections: [] },
      { status: publicError.status },
    );
  }
}
