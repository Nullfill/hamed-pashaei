import { fetchHtml } from "@/lib/http/fetchHtml";


const DEFAULT_BASE_URL = "https://shabforoosh.ir";

export class ShabforooshClient {
  readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.SHABFOROOSH_BASE_URL || DEFAULT_BASE_URL;
  }

  async get(pathOrUrl: string): Promise<string> {
    const cookie = process.env.SHABFOROOSH_COOKIE?.trim();

    const target = new URL(pathOrUrl, this.baseUrl);
    const isJsonApi = target.pathname.startsWith("/wp-json/");
    const fetchUrl = target.toString();

    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0",
      Accept: isJsonApi
        ? "application/json"
        : "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "fa-IR,fa;q=0.9,en-US;q=0.8,en;q=0.7",
      Referer: this.baseUrl,
      ...(cookie ? { Cookie: cookie } : {}),
    };

    if (gatewayUrl && process.env.GATEWAY_SECRET) {
      headers["X-Proxy-Secret"] = process.env.GATEWAY_SECRET.trim();
    }

    return fetchHtml({
      url: fetchUrl,
      timeoutMs: isJsonApi ? 30000 : 15000,
      headers,
    });
  }
}
