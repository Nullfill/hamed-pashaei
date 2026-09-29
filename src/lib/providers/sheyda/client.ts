import "server-only";

import { HttpsProxyAgent } from "https-proxy-agent";
import type { Dispatcher } from "undici";
import { getProviderProxyDispatcher, getProxyUrl } from "@/lib/http/providerProxy";
import { ProviderConfigError, ProviderFetchError } from "@/lib/utils/errors";

const DEFAULT_API_URL = "https://api.sheyda.com/query";
const DEFAULT_AUTH_URL = "https://mikasa.sheyda.com/graphql";
const DEFAULT_SOURCE_ID = "202314";

type GraphqlError = {
  message?: string;
  extensions?: {
    message?: string;
    statusCode?: number;
  };
};

type GraphqlResponse<T> = {
  data?: T;
  errors?: GraphqlError[];
};

const GET_DID_QUERY = `
  query getDid {
    getDid {
      statusCode
      message
      data { did }
    }
  }
`;

function cleanToken(value?: string): string | undefined {
  const token = value?.trim().replace(/^Bearer\s+/i, "");
  return token || undefined;
}

function didFromJwt(token?: string): string | undefined {
  if (!token) return undefined;
  try {
    const payload = token.split(".")[1];
    if (!payload) return undefined;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(Buffer.from(normalized, "base64").toString("utf8")) as { did?: unknown };
    return typeof decoded.did === "string" && decoded.did ? decoded.did : undefined;
  } catch {
    return undefined;
  }
}

export class SheydaClient {
  readonly apiUrl = process.env.SHEYDA_API_URL?.trim() || DEFAULT_API_URL;
  readonly authUrl = process.env.SHEYDA_AUTH_URL?.trim() || DEFAULT_AUTH_URL;
  readonly sourceId = process.env.SHEYDA_SOURCE_ID?.trim() || DEFAULT_SOURCE_ID;
  private anonymousDid?: Promise<string>;

  private get accessToken(): string | undefined {
    return cleanToken(process.env.SHEYDA_ACCESS_TOKEN);
  }

  private async post<T>(
    url: string,
    operationName: string,
    query: string,
    variables: Record<string, unknown>,
    headers: Record<string, string> = {},
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    const proxyUrl = await getProxyUrl();
    const dispatcher = proxyUrl ? await getProviderProxyDispatcher() : undefined;
    try {
      const fetchOptions: RequestInit & {
        dispatcher?: Dispatcher;
        agent?: HttpsProxyAgent<string>;
      } = {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Sheyda TV compatible provider)",
          "x-source-p": this.sourceId,
          ...headers,
        },
        body: JSON.stringify({ operationName, query, variables }),
        cache: "no-store",
        signal: controller.signal,
        dispatcher,
        agent: proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined,
      };
      const response = await fetch(url, fetchOptions);
      const payload = (await response.json()) as GraphqlResponse<T>;
      const firstError = payload.errors?.[0];
      if (!response.ok || firstError || !payload.data) {
        const upstreamStatus = firstError?.extensions?.statusCode;
        const status = upstreamStatus === 401 || upstreamStatus === 403 ? upstreamStatus : 502;
        throw new ProviderFetchError(
          firstError?.extensions?.message || firstError?.message || `درخواست شیدا ناموفق بود: ${response.status}`,
          status,
        );
      }
      return payload.data;
    } catch (error) {
      if (error instanceof ProviderFetchError) throw error;
      throw new ProviderFetchError("ارتباط با سرویس شیدا ناموفق بود.");
    } finally {
      clearTimeout(timeout);
    }
  }

  private getAnonymousDid(): Promise<string> {
    this.anonymousDid ??= this.post<{
      getDid?: { data?: { did?: string } };
    }>(this.authUrl, "getDid", GET_DID_QUERY, {}).then((payload) => {
      const did = payload.getDid?.data?.did;
      if (!did) throw new ProviderFetchError("شناسه دستگاه شیدا دریافت نشد.");
      return did;
    });
    return this.anonymousDid;
  }

  private async getDid(): Promise<string> {
    const configured = process.env.SHEYDA_DEVICE_ID?.trim();
    return configured || didFromJwt(this.accessToken) || this.getAnonymousDid();
  }

  async request<T>(
    operationName: string,
    query: string,
    variables: Record<string, unknown> = {},
    options: { auth?: boolean } = {},
  ): Promise<T> {
    const token = this.accessToken;
    if (options.auth && !token) {
      throw new ProviderConfigError(
        "برای پخش محتوای شیدا، SHEYDA_ACCESS_TOKEN را با توکن حساب شیدا تنظیم کنید.",
      );
    }

    const did = await this.getDid();
    return this.post<T>(this.apiUrl, operationName, query, variables, {
      did,
      ...(token ? { atk: token } : {}),
    });
  }
}
