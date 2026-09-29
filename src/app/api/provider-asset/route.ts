import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const allowedHosts = ["gapfilm.ir", "shabforoosh.ir", "majnoonbazar.ir"];

function isAllowedHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return allowedHosts.some(
    (host) => normalized === host || normalized.endsWith(`.${host}`),
  );
}

function parseTarget(requestUrl: string): URL | undefined {
  const target = new URL(requestUrl).searchParams.get("url");
  if (!target) {
    return undefined;
  }

  try {
    const url = new URL(target);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      !isAllowedHost(url.hostname)
    ) {
      return undefined;
    }

    return url;
  } catch {
    return undefined;
  }
}

export async function GET(request: Request) {
  const target = parseTarget(request.url);
  if (!target) {
    return NextResponse.json(
      { error: "Invalid provider asset URL." },
      { status: 400 },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const fetchOptions: RequestInit = {
      headers: {
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8",
        "Accept-Language": "fa-IR,fa;q=0.9,en-US;q=0.8,en;q=0.7",
        Referer: target.origin,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0",
      },
      cache: "no-store",
      signal: controller.signal,
    };

    const response = await fetch(target.toString(), fetchOptions);

    if (!response.ok || !response.body) {
      return NextResponse.json(
        { error: "Provider asset is unavailable." },
        { status: 502 },
      );
    }

    const headers = new Headers();
    const contentType = response.headers.get("content-type");
    const contentLength = response.headers.get("content-length");

    if (contentType) {
      headers.set("Content-Type", contentType);
    }

    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }

    headers.set(
      "Cache-Control",
      "public, max-age=3600, stale-while-revalidate=86400",
    );

    return new NextResponse(response.body, {
      status: 200,
      headers,
    });
  } catch {
    return NextResponse.json(
      { error: "Provider asset request failed." },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
