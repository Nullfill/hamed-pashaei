import "server-only";

import { pbkdf2, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const pbkdf2Async = promisify(pbkdf2);
const iterations = 310000;
const keyLength = 32;
const digest = "sha256";

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("base64url");
  const key = await pbkdf2Async(password, salt, iterations, keyLength, digest);
  return `pbkdf2_${digest}$${iterations}$${salt}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, iterationText, salt, hash] = storedHash.split("$");
  const [, storedDigest] = algorithm?.split("_") ?? [];
  const storedIterations = Number(iterationText);

  if (!storedDigest || !Number.isFinite(storedIterations) || !salt || !hash) {
    return false;
  }

  const expected = Buffer.from(hash, "base64url");
  const actual = await pbkdf2Async(password, salt, storedIterations, expected.length, storedDigest);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
