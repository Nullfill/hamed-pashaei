import "server-only";

import { getProviderProxyDispatcher, getProxyUrl } from "@/lib/http/providerProxy";
import { ProviderFetchError } from "@/lib/utils/errors";
import type { Dispatcher } from "undici";
import { HttpsProxyAgent } from "https-proxy-agent";

type RequestOptions = {
  method?: "GET" | "POST";
  params?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  headers?: HeadersInit;
  timeoutMs?: number;
};

export class GapfilmClient {
  readonly apiBaseUrl = "https://core.gapfilm.ir";
  readonly siteBaseUrl = "https://www.gapfilm.ir";

  async requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(path, this.apiBaseUrl);
    const dispatcher = getProviderProxyDispatcher();
    const proxyUrl = getProxyUrl();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 15000);

    for (const [key, value] of Object.entries(options.params ?? {})) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    const fetchOptions: RequestInit & { dispatcher?: Dispatcher; agent?: any } = {
      method: options.method ?? (options.body ? "POST" : "GET"),
      headers: {
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Content-Type": "application/json",
        Origin: this.siteBaseUrl,
        PlatformType: "Web",
        Referer: `${this.siteBaseUrl}/`,
        "Sec-GPC": "1",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:153.0) Gecko/20100101 Firefox/153.0",
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
      dispatcher,
      agent: proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined,
      signal: controller.signal,
    };

    try {
      const response = await fetch(url.toString(), fetchOptions);

      if (!response.ok) {
        throw new ProviderFetchError(`Gapfilm request failed: ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ProviderFetchError) {
        throw error;
      }

      throw new ProviderFetchError("Gapfilm request failed.");
    } finally {
      clearTimeout(timeout);
    }
  }
}
