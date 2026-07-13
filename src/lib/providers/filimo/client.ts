import "server-only";

import { getProviderProxyDispatcher, getProxyUrl } from "@/lib/http/providerProxy";
import { ProviderConfigError, ProviderFetchError } from "@/lib/utils/errors";
import { HttpsProxyAgent } from "https-proxy-agent";
import type { Dispatcher } from "undici";

type RequestOptions = {
  params?: Record<string, string | number | boolean | undefined | null>;
  auth?: boolean;
  simple?: boolean;
  timeoutMs?: number;
};

export class FilimoClient {
  readonly siteBaseUrl = process.env.FILIMO_BASE_URL?.trim() || "https://www.filimo.com";
  readonly apiBaseUrl = `${this.siteBaseUrl.replace(/\/$/, "")}/api/fa/v1/`;

  async requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path.replace(/^\//, ""), this.apiBaseUrl);
    const token = process.env.FILIMO_AUTH_TOKEN?.trim();
    if (options.auth && !token) {
      throw new ProviderConfigError("توکن پخش فیلیمو تنظیم نشده است.");
    }

    for (const [key, value] of Object.entries(options.params ?? {})) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 15000);
    const proxyUrl = getProxyUrl();
    const dispatcher = getProviderProxyDispatcher();
    const headers: HeadersInit = {
      Accept: "application/json",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: `${this.siteBaseUrl}/`,
      "Sec-GPC": "1",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:153.0) Gecko/20100101 Firefox/153.0",
      trackerabtest: JSON.stringify({ leadToApp: "origin" }),
      useragent: JSON.stringify({ os: "react", pf: "site" }),
    };

    if (options.simple !== false) headers.jsonType = "simple";
    if (token && options.auth) headers.authorization = `Bearer ${token}`;

    try {
      const response = await fetch(url, {
        headers,
        cache: "no-store",
        dispatcher,
        agent: proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined,
        signal: controller.signal,
      } as RequestInit & {
        dispatcher?: Dispatcher;
        agent?: HttpsProxyAgent<string>;
      });

      if (!response.ok) {
        throw new ProviderFetchError(
          response.status === 401 || response.status === 403
            ? "دسترسی پخش فیلیمو منقضی یا نامعتبر است."
            : `درخواست فیلیمو ناموفق بود: ${response.status}`,
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ProviderConfigError || error instanceof ProviderFetchError) {
        throw error;
      }
      throw new ProviderFetchError("دریافت داده از فیلیمو ناموفق بود.");
    } finally {
      clearTimeout(timeout);
    }
  }
}
