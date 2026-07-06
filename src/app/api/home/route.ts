import { NextResponse } from "next/server";
import { getAllHomeSections } from "@/lib/providers/registry";
import { toPublicError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sections = await getAllHomeSections();
    return NextResponse.json({ sections });
  } catch (error) {
    const publicError = toPublicError(error);
    return NextResponse.json({ error: publicError.message, sections: [] }, { status: publicError.status });
  }
}
