import { NextResponse } from "next/server";
import { getProvider } from "@/lib/providers/registry";
import { mediaTypeSchema } from "@/lib/providers/types";
import { toPublicError } from "@/lib/utils/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = mediaTypeSchema.parse(searchParams.get("type"));
    const id = searchParams.get("id")?.trim();
    const dubbed = searchParams.get("dubbed") ?? "0";
    const provider = searchParams.get("src") || searchParams.get("provider");
    const season = searchParams.get("season") ?? undefined;
    const episode = searchParams.get("episode") ?? undefined;

    if (!id) {
      return NextResponse.json({ error: "شناسه محتوا معتبر نیست." }, { status: 400 });
    }

    const playback = await getProvider(provider).getPlayback({ type, id, dubbed, season, episode });
    return NextResponse.json(playback);
  } catch (error) {
    const publicError = toPublicError(error);
    return NextResponse.json({ error: publicError.message, sources: [] }, { status: publicError.status });
  }
}
