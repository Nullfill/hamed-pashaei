import { ProviderFetchError } from "@/lib/utils/errors";
import { getProviderProxyDispatcher, getProxyUrl } from "@/lib/http/providerProxy";
import type { Dispatcher } from "undici";
import { HttpsProxyAgent } from "https-proxy-agent";

interface FetchHtmlOptions {
  url: string;
  headers: HeadersInit;
  timeoutMs?: number;
  next?: NextFetchRequestConfig;
}

export async function fetchHtml({ url, headers, timeoutMs = 15000, next }: FetchHtmlOptions): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const proxyUrl = await getProxyUrl();
  const dispatcher = proxyUrl ? await getProviderProxyDispatcher() : undefined;

  try {
    const fetchOptions: RequestInit & { dispatcher?: Dispatcher; agent?: HttpsProxyAgent<string>; next?: NextFetchRequestConfig } = {
      headers,
      signal: controller.signal,
      cache: "no-store",
      next,
      dispatcher,
      agent: proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined,
    };

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      throw new ProviderFetchError(`منبع قدیمی پاسخ ${response.status} برگرداند.`);
    }

    return await response.text();
  } catch (error) {
    if (error instanceof ProviderFetchError) {
      throw error;
    }

    throw new ProviderFetchError("ارتباط با منبع قدیمی برقرار نشد.");
  } finally {
    clearTimeout(timeout);
  }
}
