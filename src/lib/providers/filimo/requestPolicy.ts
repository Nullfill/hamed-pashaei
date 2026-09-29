import { request as httpsRequest } from "node:https";
import { HttpsProxyAgent } from "https-proxy-agent";

/**
 * Filimo accepts the configured proxy when requests are sent with
 * HttpsProxyAgent. Using an undici dispatcher (or passing both transports)
 * can make an otherwise valid authenticated watch request return 403.
 */
export type FilimoRequestPolicyOptions = {
  auth?: boolean;
  proxy?: boolean;
};

export type FilimoRequestTransport = "direct" | "https-proxy-agent";

export type FilimoProxyResponse = {
  status: number;
  body: string;
};

export function requestThroughHttpsProxy(
  url: URL,
  headers: Record<string, string>,
  proxyUrl: string,
  signal: AbortSignal,
): Promise<FilimoProxyResponse> {
  return new Promise((resolve, reject) => {
    const request = httpsRequest(
      url,
      {
        method: "GET",
        headers,
        agent: new HttpsProxyAgent(proxyUrl),
        signal,
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.setEncoding("utf8");
        response.on("data", (chunk: string) => chunks.push(Buffer.from(chunk)));
        response.on("end", () => {
          resolve({
            status: response.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
        response.on("error", reject);
      },
    );

    request.on("error", reject);
    request.end();
  });
}

export function shouldUseFilimoProxy(
  options: FilimoRequestPolicyOptions = {},
  configuredProxyUrl?: string,
): boolean {
  if (typeof options.proxy === "boolean") {
    return options.proxy;
  }

  return Boolean(configuredProxyUrl?.trim());
}

export function getFilimoRequestTransport(
  options: FilimoRequestPolicyOptions = {},
  configuredProxyUrl?: string,
): FilimoRequestTransport {
  return shouldUseFilimoProxy(options, configuredProxyUrl) &&
    configuredProxyUrl?.trim()
    ? "https-proxy-agent"
    : "direct";
}

export function normalizeFilimoAuthToken(
  value: string | undefined,
): string | undefined {
  const token = value
    ?.trim()
    .replace(/^Bearer\s+/i, "")
    .trim();
  return token || undefined;
}
