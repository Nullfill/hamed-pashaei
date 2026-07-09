import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

function isAllowedSubtitleHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname.endsWith(".gapfilm.ir") ||
    hostname === "gapfilm.ir" ||
    hostname.endsWith(".acenteri.ir") ||
    hostname === "acenteri.ir" ||
    hostname.endsWith(".shabforoosh.ir") ||
    hostname === "shabforoosh.ir" ||
    hostname.endsWith(".majnoonbazar.ir") ||
    hostname === "majnoonbazar.ir" ||
    hostname.endsWith(".seo2024.ir") ||
    hostname === "seo2024.ir"
  );
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");

  if (!rawUrl) {
    return NextResponse.json({ error: "Subtitle URL is required." }, { status: 400 });
  }

  let subtitleUrl: URL;
  try {
    subtitleUrl = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "Subtitle URL is invalid." }, { status: 400 });
  }

  if (!/^https?:$/.test(subtitleUrl.protocol) || !isAllowedSubtitleHost(subtitleUrl.hostname)) {
    return NextResponse.json({ error: "Subtitle host is not allowed." }, { status: 403 });
  }

  try {
    const response = await fetch(subtitleUrl.toString(), {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0",
        Accept: "text/vtt,text/plain,*/*",
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Subtitle is unavailable." }, { status: 502 });
    }

    const text = await response.text();
    return new NextResponse(text, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Subtitle fetch failed." }, { status: 502 });
  }
}
