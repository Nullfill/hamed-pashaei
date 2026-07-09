import "server-only";

import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import {
  countDbUsers,
  createDbSession,
  createDbUser,
  deleteDbSession,
  findDbSessionByTokenHash,
  findDbUserByEmail,
  findDbUserById,
  listDbUsers,
  updateDbUserAccess,
  updateDbUserPassword,
} from "@/lib/auth/dbStore";
import type { AuthStoreData, PublicUser, StoredSession, StoredUser, UserRole, UserStatus } from "@/lib/auth/types";

const storePath = process.env.AUTH_STORE_PATH || path.join(process.cwd(), "data", "auth.json");
const emptyStore: AuthStoreData = { users: [], sessions: [] };
const useDatabaseStore = Boolean(process.env.DATABASE_URL);
let writeQueue = Promise.resolve();

function toPublicUser(user: StoredUser): PublicUser {
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

async function ensureStoreFile() {
  await fs.mkdir(path.dirname(storePath), { recursive: true });

  try {
    await fs.access(storePath);
  } catch {
    await fs.writeFile(storePath, JSON.stringify(emptyStore, null, 2), "utf8");
  }
}

async function readStore(): Promise<AuthStoreData> {
  await ensureStoreFile();

  try {
    const text = await fs.readFile(storePath, "utf8");
    const parsed = JSON.parse(text) as Partial<AuthStoreData>;
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    };
  } catch {
    return { ...emptyStore };
  }
}

async function writeStore(data: AuthStoreData): Promise<void> {
  await fs.mkdir(path.dirname(storePath), { recursive: true });
  const tmpPath = `${storePath}.${process.pid}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmpPath, storePath);
}

function withWrite<T>(operation: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(operation, operation);
  writeQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function countUsers(): Promise<number> {
  if (useDatabaseStore) {
    return countDbUsers();
  }

  const store = await readStore();
  return store.users.length;
}

export async function listUsers(): Promise<PublicUser[]> {
  if (useDatabaseStore) {
    return listDbUsers();
  }

  const store = await readStore();
  return store.users.map(toPublicUser).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function findUserByEmail(email: string): Promise<StoredUser | undefined> {
  const normalized = normalizeEmail(email);
  if (useDatabaseStore) {
    return findDbUserByEmail(normalized);
  }

  const store = await readStore();
  return store.users.find((user) => user.email === normalized);
}

export async function findUserById(id: string): Promise<StoredUser | undefined> {
  if (useDatabaseStore) {
    return findDbUserById(id);
  }

  const store = await readStore();
  return store.users.find((user) => user.id === id);
}

export async function createUser(input: { name?: string; email: string; passwordHash: string; role?: UserRole }): Promise<PublicUser> {
  if (useDatabaseStore) {
    return createDbUser({
      ...input,
      email: normalizeEmail(input.email),
    });
  }

  return withWrite(async () => {
    const store = await readStore();
    const email = normalizeEmail(input.email);

    if (store.users.some((user) => user.email === email)) {
      throw new Error("USER_EXISTS");
    }

    const now = new Date().toISOString();
    const user: StoredUser = {
      id: randomUUID(),
      name: input.name?.trim() || undefined,
      email,
      passwordHash: input.passwordHash,
      role: input.role || "USER",
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    };

    store.users.push(user);
    await writeStore(store);
    return toPublicUser(user);
  });
}

export async function updateUserAccess(input: { userId: string; role: UserRole; status: UserStatus }): Promise<void> {
  if (useDatabaseStore) {
    await updateDbUserAccess(input);
    return;
  }

  return withWrite(async () => {
    const store = await readStore();
    const user = store.users.find((item) => item.id === input.userId);
    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    user.role = input.role;
    user.status = input.status;
    user.updatedAt = new Date().toISOString();

    if (input.status === "DISABLED") {
      store.sessions = store.sessions.filter((session) => session.userId !== input.userId);
    }

    await writeStore(store);
  });
}

export async function updateUserPassword(input: { userId: string; passwordHash: string }): Promise<void> {
  if (useDatabaseStore) {
    await updateDbUserPassword(input);
    return;
  }

  return withWrite(async () => {
    const store = await readStore();
    const user = store.users.find((item) => item.id === input.userId);
    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    user.passwordHash = input.passwordHash;
    user.updatedAt = new Date().toISOString();
    store.sessions = store.sessions.filter((session) => session.userId !== input.userId);
    await writeStore(store);
  });
}

export async function createSession(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<StoredSession> {
  if (useDatabaseStore) {
    return createDbSession(input);
  }

  return withWrite(async () => {
    const store = await readStore();
    const session: StoredSession = {
      id: randomUUID(),
      tokenHash: input.tokenHash,
      userId: input.userId,
      expiresAt: input.expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
    };

    store.sessions = store.sessions.filter((item) => new Date(item.expiresAt).getTime() > Date.now());
    store.sessions.push(session);
    await writeStore(store);
    return session;
  });
}

export async function findSessionByTokenHash(tokenHash: string): Promise<{ session: StoredSession; user: StoredUser } | undefined> {
  if (useDatabaseStore) {
    return findDbSessionByTokenHash(tokenHash);
  }

  const store = await readStore();
  const session = store.sessions.find((item) => item.tokenHash === tokenHash);
  if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
    return undefined;
  }

  const user = store.users.find((item) => item.id === session.userId);
  if (!user) {
    return undefined;
  }

  return { session, user };
}

export async function deleteSession(tokenHash: string): Promise<void> {
  if (useDatabaseStore) {
    await deleteDbSession(tokenHash);
    return;
  }

  return withWrite(async () => {
    const store = await readStore();
    store.sessions = store.sessions.filter((session) => session.tokenHash !== tokenHash);
    await writeStore(store);
  });
}
