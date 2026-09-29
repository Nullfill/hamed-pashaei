import "server-only";

import { createHash, randomBytes } from "crypto";
import { findApiClientByKeyHash, touchApiClient } from "@/lib/auth/store";

export function hashApiKey(value: string): string {
  return createHash("sha256").update(value).digest("base64url");
}

export function createApiKey(): { value: string; hash: string; prefix: string } {
  const value = `film_${randomBytes(32).toString("base64url")}`;
  return { value, hash: hashApiKey(value), prefix: value.slice(0, 13) };
}

export async function authenticateApiClient(request: Request, scope?: string) {
  const key = request.headers.get("x-api-key")?.trim();
  if (!key) return undefined;
  const client = await findApiClientByKeyHash(hashApiKey(key));
  if (!client) return undefined;
  if (scope && !client.scopes.includes(scope) && !client.scopes.includes("*")) return undefined;
  void touchApiClient(client.id);
  return client;
}

