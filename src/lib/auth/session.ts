import "server-only";

import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { createSession, deleteSession, findSessionByTokenHash } from "@/lib/auth/store";
import type { PublicUser } from "@/lib/auth/types";

export const sessionCookieName = "film_session";
const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;

function hashToken(token: string): string {
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
