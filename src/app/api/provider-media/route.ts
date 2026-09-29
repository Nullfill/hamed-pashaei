import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const allowedHosts = [
  "filimo.com",
  "aparat.com",
  "aparat.cloud",
  "sheyda.com",
  "arvancloud.ir",
  "arvanstorage.ir",
  "gapfilm.ir",
  "shabforoosh.ir",
];

function isAllowed(url: URL): boolean {
  if (url.protocol !== "https:") return false;
  const hostname = url.hostname.toLowerCase();
  return allowedHosts.some(
    (host) => hostname === host || hostname.endsWith(`.${host}`),
  );
}

function mediaProxyUrl(url: URL): string {
  return `/api/provider-media?url=${encodeURIComponent(url.toString())}`;
}

function isManifestUrl(url: URL): boolean {
  return (
    url.pathname.toLowerCase().endsWith(".m3u8") ||
    url.search.toLowerCase().includes(".m3u8")
  );
}

function rewriteManifest(manifest: string, manifestUrl: URL): string {
  return manifest
    .split(/\r?\n/)
    .map((line) => {
      if (!line) return line;
      if (!line.startsWith("#")) {
        const target = new URL(line.trim(), manifestUrl);
        return isAllowed(target) ? mediaProxyUrl(target) : line;
      }
      return line.replace(/URI="([^"]+)"/g, (match, value: string) => {
        const target = new URL(value, manifestUrl);
        return isAllowed(target) ? `URI="${mediaProxyUrl(target)}"` : match;
      });
    })
    .join("\n");
}

export async function GET(request: Request) {
  const rawTarget = new URL(request.url).searchParams.get("url");
  if (!rawTarget) {
    return NextResponse.json({ error: "Media URL is required." }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(rawTarget);
  } catch {
    return NextResponse.json({ error: "Invalid media URL." }, { status: 400 });
  }

  if (!isAllowed(target)) {
    return NextResponse.json({ error: "Media host is not allowed." }, { status: 400 });
  }

  // ── High Performance Optimization ──────────────────────────────────────────
  // If the target is a binary video segment (.ts, .mp4, .m4s, etc.), NEVER proxy
  // the heavy bytes through the server. Redirect the client directly to the origin
  // CDN using an HTTP 302 Found response.
  // This shifts 100% of the video bandwidth onto the user's Iranian connection,
  // reduces server load to near-zero, and prevents Cloudflare/Vercel timeouts.
  const isVideoChunk = /\.(ts|mp4|m4s|m4a|aac)(?:\?|$)/i.test(target.pathname);
  if (isVideoChunk) {
    const redirectHeaders = new Headers({
      Location: target.toString(),
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Cache-Control": "public, max-age=86400",
    });
    return new NextResponse(null, { status: 302, headers: redirectHeaders });
  }

  // Only tiny text manifests (.m3u8) are fetched by the server to handle CORS
  // and inject mediaProxyUrls.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const isSheyda =
      target.hostname === "sheyda.com" || target.hostname.endsWith(".sheyda.com");
    const isGapfilm = target.hostname === "core.gapfilm.ir" || target.hostname.endsWith(".gapfilm.ir");
    const isFilimo = target.hostname === "www.filimo.com" || target.hostname.endsWith(".filimo.com");
    const response = await fetch(target, {
      headers: {
        Accept: "application/vnd.apple.mpegurl,*/*",
        Referer: target.hostname.endsWith("aparat.com")
          ? "https://www.aparat.com/"
          : target.hostname.endsWith("sheyda.com")
            ? "https://www.sheyda.com/"
            : target.hostname.endsWith("gapfilm.ir")
              ? "https://www.gapfilm.ir/"
              : "https://www.filimo.com/",
        ...(isSheyda ? { Origin: "https://www.sheyda.com" } : {}),
        ...(isGapfilm ? { Origin: "https://www.gapfilm.ir", PlatformType: "Web", SourceEnvironment: "Website", "X-Forwarded-For": "5.52.12.34", "X-Real-IP": "5.52.12.34", "Client-IP": "5.52.12.34" } : {}),
        ...(isFilimo ? { "X-Forwarded-For": "5.52.12.34", "X-Real-IP": "5.52.12.34", "Client-IP": "5.52.12.34" } : {}),
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok || !response.body) {
      return NextResponse.json({ error: "Media upstream failed." }, { status: 502 });
    }

    const finalUrl = new URL(response.url || target.toString());
    if (!isAllowed(finalUrl)) {
      return NextResponse.json({ error: "Media redirect is not allowed." }, { status: 502 });
    }

    const contentType = response.headers.get("content-type") || "";
    const isManifest =
      contentType.includes("mpegurl") ||
      isManifestUrl(finalUrl) ||
      isManifestUrl(target);

    if (isManifest) {
      const manifest = rewriteManifest(await response.text(), finalUrl);
      return new NextResponse(manifest, {
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        },
      });
    }

    // If upstream returned a non-manifest stream, redirect client to the final URL
    return NextResponse.redirect(finalUrl.toString(), 302);
  } catch {
    return NextResponse.json({ error: "Media request failed." }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
