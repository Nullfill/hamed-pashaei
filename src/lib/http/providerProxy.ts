import "server-only";

import { ProxyAgent, type Dispatcher } from "undici";

let proxyDispatcher: Dispatcher | undefined;
let proxyUrl: string | undefined;

export function getProviderProxyDispatcher(): Dispatcher | undefined {
  const configuredProxyUrl = process.env.PROVIDER_HTTP_PROXY?.trim();

  if (!configuredProxyUrl) {
    return undefined;
  }

  if (!proxyDispatcher || proxyUrl !== configuredProxyUrl) {
    proxyDispatcher = new ProxyAgent(configuredProxyUrl);
    proxyUrl = configuredProxyUrl;
  }

  return proxyDispatcher;
}

export function getProxyUrl(): string | undefined {
  return process.env.PROVIDER_HTTP_PROXY?.trim();
}
