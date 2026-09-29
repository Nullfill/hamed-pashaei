import "server-only";

import { neon } from "@neondatabase/serverless";
import { ProxyAgent, type Dispatcher } from "undici";
import { getDatabaseUrl } from "@/lib/utils/env";

const SETTING_KEY = "provider_proxy_enabled";
const CACHE_TTL_MS = 5_000;
let proxyDispatcher: Dispatcher | undefined;
let proxyUrl: string | undefined;
let cachedEnabled: boolean | undefined;
let cacheExpiresAt = 0;
const databaseUrl = getDatabaseUrl();
const sql = databaseUrl ? neon(databaseUrl) : undefined;

async function ensureSettingsTable(): Promise<void> {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

async function readProxyEnabled(): Promise<boolean> {
  const now = Date.now();
  if (cachedEnabled !== undefined && now < cacheExpiresAt) return cachedEnabled;

  let enabled = Boolean(process.env.PROVIDER_HTTP_PROXY?.trim());
  if (sql) {
    await ensureSettingsTable();
    const rows = await sql`SELECT value FROM app_settings WHERE key = ${SETTING_KEY} LIMIT 1`;
    if (typeof rows[0]?.value === "boolean") enabled = rows[0].value;
  }
  cachedEnabled = enabled;
  cacheExpiresAt = now + CACHE_TTL_MS;
  return enabled;
}

export type ProviderProxyStatus = { enabled: boolean; configured: boolean };

export async function getProviderProxyStatus(): Promise<ProviderProxyStatus> {
  return {
    enabled: await readProxyEnabled(),
    configured: Boolean(process.env.PROVIDER_HTTP_PROXY?.trim()),
  };
}

export async function setProviderProxyEnabled(enabled: boolean): Promise<void> {
  if (!sql) throw new Error("DATABASE_URL is not configured.");
  await ensureSettingsTable();
  await sql`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (${SETTING_KEY}, ${JSON.stringify(enabled)}::jsonb, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `;
  cachedEnabled = enabled;
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;
}

export async function getProxyUrl(): Promise<string | undefined> {
  if (!(await readProxyEnabled())) return undefined;
  return process.env.PROVIDER_HTTP_PROXY?.trim() || undefined;
}

export async function getProviderProxyDispatcher(): Promise<Dispatcher | undefined> {
  const configuredProxyUrl = await getProxyUrl();
  if (!configuredProxyUrl) return undefined;
  if (!proxyDispatcher || proxyUrl !== configuredProxyUrl) {
    proxyDispatcher = new ProxyAgent(configuredProxyUrl);
    proxyUrl = configuredProxyUrl;
  }
  return proxyDispatcher;
}
