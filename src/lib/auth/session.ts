import "server-only";

import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import {
  createMobileSession,
  createSession,
  deleteSession,
  findMobileSessionByTokenHash,
  findSessionByTokenHash,
  revokeMobileSession,
  revokeMobileSessionsForUser,
} from "@/lib/auth/store";
import type { PublicUser } from "@/lib/auth/types";

export const sessionCookieName = "film_session";
const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

function publicUser(user: PublicUser): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function createUserSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionMaxAgeSeconds * 1000);
  await createSession({ userId, tokenHash: hashToken(token), expiresAt });

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAgeSeconds,
    expires: expiresAt,
  });
}

export async function getCurrentUser(): Promise<PublicUser | undefined> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (!token) {
    return undefined;
  }

  const result = await findSessionByTokenHash(hashToken(token));
  if (!result || result.user.status !== "ACTIVE") {
    return undefined;
  }

  return publicUser(result.user);
}

export async function clearUserSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (token) {
    await deleteSession(hashToken(token));
  }

  cookieStore.delete(sessionCookieName);
}

const mobileAccessMaxAgeSeconds = 15 * 60;
const mobileRefreshMaxAgeSeconds = 90 * 24 * 60 * 60;

export interface MobileTokenResponse {
  tokenType: "Bearer";
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
}

export function publicMobileTokens(tokens: MobileTokenResponse & { refreshSessionId: string }): MobileTokenResponse {
  return {
    tokenType: tokens.tokenType,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    accessTokenExpiresAt: tokens.accessTokenExpiresAt,
    refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
  };
}

function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function issueMobileTokens(userId: string): Promise<MobileTokenResponse & { refreshSessionId: string }> {
  const accessToken = newToken();
  const refreshToken = newToken();
  const accessExpiresAt = new Date(Date.now() + mobileAccessMaxAgeSeconds * 1000);
  const refreshExpiresAt = new Date(Date.now() + mobileRefreshMaxAgeSeconds * 1000);

  await createMobileSession({
    userId,
    tokenHash: hashToken(accessToken),
    kind: "access",
    expiresAt: accessExpiresAt,
  });
  const refreshSession = await createMobileSession({
    userId,
    tokenHash: hashToken(refreshToken),
    kind: "refresh",
    expiresAt: refreshExpiresAt,
  });

  return {
    tokenType: "Bearer",
    accessToken,
    refreshToken,
    accessTokenExpiresAt: accessExpiresAt.toISOString(),
    refreshTokenExpiresAt: refreshExpiresAt.toISOString(),
    refreshSessionId: refreshSession.id,
  };
}

export async function getMobileSession(token: string) {
  return findMobileSessionByTokenHash(hashToken(token));
}

export async function getMobileAccessUser(token: string): Promise<PublicUser | undefined> {
  const result = await getMobileSession(token);
  if (!result || result.session.kind !== "access" || result.user.status !== "ACTIVE") {
    return undefined;
  }
  return publicUser(result.user);
}

export async function getAuthenticatedUser(request?: Request): Promise<PublicUser | undefined> {
  const authorization = request?.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (match?.[1]) {
    return getMobileAccessUser(match[1].trim());
  }

  return getCurrentUser();
}

export async function revokeMobileToken(token: string, replacedBy?: string): Promise<void> {
  await revokeMobileSession(hashToken(token), replacedBy);
}

export async function revokeAllMobileTokens(userId: string): Promise<void> {
  await revokeMobileSessionsForUser(userId);
}
