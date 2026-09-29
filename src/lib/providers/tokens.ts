import "server-only";

import { neon } from "@neondatabase/serverless";
import { getDatabaseUrl } from "@/lib/utils/env";

const databaseUrl = getDatabaseUrl();
const sql = databaseUrl ? neon(databaseUrl) : undefined;

async function ensureTokenTable() {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS auth_tokens (
      provider TEXT PRIMARY KEY,
      token TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

export async function setProviderToken(provider: "filimo" | "gapfilm", token: string) {
  if (!sql) return;
  await ensureTokenTable();
  await sql`
    INSERT INTO auth_tokens (provider, token, updated_at)
    VALUES (${provider}, ${token}, now())
    ON CONFLICT (provider) DO UPDATE SET token = EXCLUDED.token, updated_at = now()
  `;
}

export async function getProviderToken(provider: "filimo" | "gapfilm"): Promise<string | undefined> {
  let envToken: string | undefined;
  if (provider === "filimo") envToken = process.env.FILIMO_AUTH_TOKEN;
  if (provider === "gapfilm") envToken = process.env.GAPFILM_AUTH_TOKEN;
  
  if (!sql) return envToken?.trim();

  try {
    await ensureTokenTable();
    const rows = await sql`SELECT token FROM auth_tokens WHERE provider = ${provider} LIMIT 1`;
    if (rows.length > 0 && rows[0].token) {
      return rows[0].token;
    }
  } catch (error) {
    console.error("Failed to read token from db", error);
  }
  return envToken?.trim();
}
