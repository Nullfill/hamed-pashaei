/**
 * GapFilm Provider Gateway — Cloudflare Worker
 *
 * Routes:
 *  GET  /filimo/*          → Filimo JSON API (auth via env FILIMO_AUTH_TOKEN)
 *  POST /sheyda/*          → Sheyda GraphQL  (auth via env SHEYDA_ACCESS_TOKEN)
 *  GET  /gapfilm/*         → Gapfilm REST    (no auth required)
 *  GET  /shabforoosh/*     → Shabforoosh HTML/JSON (cookie via env SHABFOROOSH_COOKIE)
 *  GET  /health            → 200 OK
 *
 * Security: every request must carry header  X-Gateway-Secret: <GATEWAY_SECRET env>
 */

const CORS_ORIGIN_PATTERN = /^https?:\/\/(localhost(:\d+)?|.*\.vercel\.app|.*\.runflare\.run)$/;

function corsHeaders(origin) {
  const allowed =
    origin && (CORS_ORIGIN_PATTERN.test(origin) || origin === "*") ? origin : null;
  if (!allowed) return {};
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Gateway-Secret",
    "Access-Control-Max-Age": "86400",
  };
}

function json(data, status = 200, origin = "") {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // Health check (no auth required)
    if (url.pathname === "/health") {
      return new Response("ok", { status: 200 });
    }

    // ── Auth guard ──────────────────────────────────────────────────────────
    const secret = env.GATEWAY_SECRET;
    if (secret) {
      const provided = request.headers.get("X-Gateway-Secret");
      if (!provided || provided !== secret) {
        return json({ error: "Unauthorized" }, 401, origin);
      }
    }

    const path = url.pathname;

    // ── /filimo/* ───────────────────────────────────────────────────────────
    if (path.startsWith("/filimo/")) {
      const filimoBase = "https://www.filimo.com/api/fa/v1/";
      const subpath = path.replace(/^\/filimo\//, "");
      const targetUrl = new URL(subpath, filimoBase);
      // Forward all search params
      url.searchParams.forEach((v, k) => targetUrl.searchParams.set(k, v));

      const token = env.FILIMO_AUTH_TOKEN?.trim().replace(/^Bearer\s+/i, "");
      const headers = {
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://www.filimo.com/",
        "Sec-GPC": "1",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0",
        trackerabtest: JSON.stringify({ leadToApp: "origin" }),
        useragent: JSON.stringify({ os: "react", pf: "site" }),
        jsonType: "simple",
      };
      const authParam = url.searchParams.get("_auth");
      if (authParam === "1" && token) headers["authorization"] = `Bearer ${token}`;

      const upstream = await fetch(targetUrl.toString(), {
        method: "GET",
        headers,
        cf: { cacheTtl: 0 },
      });
      const body = await upstream.text();
      return new Response(body, {
        status: upstream.status,
        headers: {
          "Content-Type": upstream.headers.get("Content-Type") || "application/json",
          ...corsHeaders(origin),
        },
      });
    }

    // ── /sheyda/* ───────────────────────────────────────────────────────────
    if (path.startsWith("/sheyda/")) {
      const subpath = path.replace(/^\/sheyda\//, "");
      const isAuth = subpath.startsWith("auth/");
      const targetUrl = isAuth
        ? "https://mikasa.sheyda.com/graphql"
        : "https://api.sheyda.com/query";

      const token = env.SHEYDA_ACCESS_TOKEN?.trim().replace(/^Bearer\s+/i, "");
      const sourceId = env.SHEYDA_SOURCE_ID || "202314";

      let bodyText = "";
      try { bodyText = await request.text(); } catch { bodyText = "{}"; }

      const reqHeaders = {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Sheyda TV compatible provider)",
        "x-source-p": sourceId,
      };
      // did and atk are forwarded from the Next.js client via custom headers
      const did = request.headers.get("x-sheyda-did");
      const atk = request.headers.get("x-sheyda-atk") || token;
      if (did) reqHeaders["did"] = did;
      if (atk) reqHeaders["atk"] = atk;

      const upstream = await fetch(targetUrl, {
        method: "POST",
        headers: reqHeaders,
        body: bodyText,
        cf: { cacheTtl: 0 },
      });
      const body = await upstream.text();
      return new Response(body, {
        status: upstream.status,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders(origin),
        },
      });
    }

    // ── /gapfilm/* ──────────────────────────────────────────────────────────
    if (path.startsWith("/gapfilm/")) {
      const subpath = path.replace(/^\/gapfilm\//, "");
      const targetUrl = new URL(subpath, "https://core.gapfilm.ir/");
      url.searchParams.forEach((v, k) => targetUrl.searchParams.set(k, v));

      let bodyText = "";
      const isPost = request.method === "POST";
      if (isPost) { try { bodyText = await request.text(); } catch { bodyText = ""; } }

      const upstream = await fetch(targetUrl.toString(), {
        method: isPost ? "POST" : "GET",
        headers: {
          Accept: "*/*",
          "Accept-Language": "en-US,en;q=0.9",
          "Content-Type": "application/json",
          Origin: "https://www.gapfilm.ir",
          PlatformType: "Web",
          Referer: "https://www.gapfilm.ir/",
          "Sec-GPC": "1",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0",
        },
        body: isPost ? bodyText : undefined,
        cf: { cacheTtl: 0 },
      });
      const body = await upstream.text();
      return new Response(body, {
        status: upstream.status,
        headers: {
          "Content-Type": upstream.headers.get("Content-Type") || "application/json",
          ...corsHeaders(origin),
        },
      });
    }

    // ── /shabforoosh/* ──────────────────────────────────────────────────────
    if (path.startsWith("/shabforoosh/")) {
      const subpath = path.replace(/^\/shabforoosh\//, "");
      const targetUrl = new URL(subpath, "https://shabforoosh.ir/");
      url.searchParams.forEach((v, k) => targetUrl.searchParams.set(k, v));

      const cookie = env.SHABFOROOSH_COOKIE?.trim();
      const isJson = targetUrl.pathname.startsWith("/wp-json/");
      const reqHeaders = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0",
        Accept: isJson
          ? "application/json"
          : "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fa-IR,fa;q=0.9,en-US;q=0.8,en;q=0.7",
        Referer: "https://shabforoosh.ir/",
      };
      if (cookie) reqHeaders["Cookie"] = cookie;

      const upstream = await fetch(targetUrl.toString(), {
        method: "GET",
        headers: reqHeaders,
        cf: { cacheTtl: 0 },
      });
      const body = await upstream.text();
      return new Response(body, {
        status: upstream.status,
        headers: {
          "Content-Type": upstream.headers.get("Content-Type") || "text/html",
          ...corsHeaders(origin),
        },
      });
    }

    return json({ error: "Not found" }, 404, origin);
  },
};
