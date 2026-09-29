import "server-only";

import { buildGatewayUrl, getGatewayUrl, getProxyUrl } from "@/lib/http/providerProxy";
import { ProviderConfigError, ProviderFetchError } from "@/lib/utils/errors";
import {
  getFilimoRequestTransport,
  normalizeFilimoAuthToken,
  requestThroughHttpsProxy,
} from "./requestPolicy";

type RequestOptions = {
  params?: Record<string, string | number | boolean | undefined | null>;
  auth?: boolean;
  simple?: boolean;
  proxy?: boolean;
  timeoutMs?: number;
};

export class FilimoClient {
  readonly siteBaseUrl =
    process.env.FILIMO_BASE_URL?.trim() || "https://www.filimo.com";
  readonly apiBaseUrl = `${this.siteBaseUrl.replace(/\/$/, "")}/api/fa/v1/`;

  async requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { getProviderToken } = await import("@/lib/providers/tokens");
    const url = new URL(path.replace(/^\//, ""), this.apiBaseUrl);
    const rawToken = await getProviderToken("filimo");
    const token = normalizeFilimoAuthToken(rawToken);
    if (options.auth && !token) {
      throw new ProviderConfigError("توکن پخش فیلیمو تنظیم نشده است.");
    }

    for (const [key, value] of Object.entries(options.params ?? {})) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      options.timeoutMs ?? 15000,
    );
    const configuredProxyUrl = await getProxyUrl();
    const transport = getFilimoRequestTransport(options, configuredProxyUrl);
    const gatewayUrl = getGatewayUrl();
    const fetchUrl = gatewayUrl ? buildGatewayUrl(url.toString()) : url;
    const proxyUrl = gatewayUrl
      ? undefined
      : transport === "https-proxy-agent"
        ? configuredProxyUrl
        : undefined;
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: `${this.siteBaseUrl}/`,
      "Sec-GPC": "1",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:153.0) Gecko/20100101 Firefox/153.0",
      trackerabtest: JSON.stringify({ leadToApp: "origin" }),
      useragent: JSON.stringify({ os: "react", pf: "site" }),
      "X-Forwarded-For": "5.62.251.84",
      "X-Real-IP": "5.62.251.84",
      "Client-IP": "5.62.251.84",
    };

    if (gatewayUrl && process.env.GATEWAY_SECRET) {
      headers["X-Proxy-Secret"] = process.env.GATEWAY_SECRET.trim();
    }
    if (options.simple !== false) headers.jsonType = "simple";
    if (token && options.auth) {
      headers.authorization = `Bearer ${token}`;
      headers.Cookie = `token=${token}; asp_auth=${token};`;
    }

    try {
      const response = proxyUrl
        ? await requestThroughHttpsProxy(
            url,
            headers,
            proxyUrl,
            controller.signal,
          )
        : await (async () => {
            const directResponse = await fetch(fetchUrl, {
              headers,
              cache: "no-store",
              signal: controller.signal,
            });
            return {
              status: directResponse.status,
              body: await directResponse.text(),
            };
          })();

      if (response.status < 200 || response.status >= 300) {
        const status =
          response.status === 401 || response.status === 403
            ? response.status
            : 502;
        throw new ProviderFetchError(
          response.status === 401
            ? "احراز هویت پخش فیلیمو نامعتبر یا منقضی است."
            : response.status === 403
              ? "دسترسی پخش فیلیمو از سمت سرویس رد شد؛ توکن یا مسیر شبکه را بررسی کنید."
              : `درخواست فیلیمو ناموفق بود: ${response.status}`,
          status,
        );
      }

      return JSON.parse(response.body) as T;
    } catch (error) {
      if (
        error instanceof ProviderConfigError ||
        error instanceof ProviderFetchError
      ) {
        throw error;
      }
      throw new ProviderFetchError("دریافت داده از فیلیمو ناموفق بود.");
    } finally {
      clearTimeout(timeout);
    }
  }
}
