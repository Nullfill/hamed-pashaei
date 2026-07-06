import { fetchHtml } from "@/lib/http/fetchHtml";
import { ProviderConfigError } from "@/lib/utils/errors";

const DEFAULT_BASE_URL = "https://shabforoosh.ir";

export class ShabforooshClient {
  readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.SHABFOROOSH_BASE_URL || DEFAULT_BASE_URL;
  }

  async get(pathOrUrl: string): Promise<string> {
    const cookie = process.env.SHABFOROOSH_COOKIE;

    if (!cookie) {
      throw new ProviderConfigError();
    }

    const url = new URL(pathOrUrl, this.baseUrl).toString();

    return fetchHtml({
      url,
      headers: {
        Cookie: cookie,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fa-IR,fa;q=0.9,en-US;q=0.8,en;q=0.7",
        Referer: this.baseUrl,
      },
    });
  }
}
