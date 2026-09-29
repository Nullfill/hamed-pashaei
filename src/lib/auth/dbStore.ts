import "server-only";

import { neon } from "@neondatabase/serverless";
import { randomUUID } from "crypto";
import { getDatabaseUrl } from "@/lib/utils/env";
import type {
  MobileTokenKind,
  ApiClientStatus,
  PublicUser,
  StoredMobileSession,
  StoredSession,
  StoredUser,
  UserRole,
  UserStatus,
} from "@/lib/auth/types";

type DbUserRow = {
  id: string;
  name: string | null;
  email: string;
  password_hash: string;
  role: UserRole;
  status: UserStatus;
  created_at: Date | string;
  updated_at: Date | string;
};

type DbSessionRow = {
  id: string;
  token_hash: string;
  user_id: string;
  expires_at: Date | string;
  created_at: Date | string;
};

type DbMobileSessionRow = {
  id: string;
  token_hash: string;
  user_id: string;
  kind: MobileTokenKind;
  expires_at: Date | string;
  created_at: Date | string;
  revoked_at: Date | string | null;
  replaced_by: string | null;
};

type DbApiClientRow = {
  id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  scopes: string[] | null;
  status: ApiClientStatus;
  rate_limit: number;
  expires_at: Date | string | null;
  created_at: Date | string;
  last_used_at: Date | string | null;
};

const databaseUrl = getDatabaseUrl();
const sql = databaseUrl ? neon(databaseUrl) : undefined;

function requireSql() {
  if (!sql) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return sql;
}

function dateString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function userFromRow(row: DbUserRow): StoredUser {
  return {
    id: row.id,
    name: row.name || undefined,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    status: row.status,
    createdAt: dateString(row.created_at),
    updatedAt: dateString(row.updated_at),
  };
}

function sessionFromRow(row: DbSessionRow): StoredSession {
  return {
    id: row.id,
    tokenHash: row.token_hash,
    userId: row.user_id,
    expiresAt: dateString(row.expires_at),
    createdAt: dateString(row.created_at),
  };
}

function mobileSessionFromRow(row: DbMobileSessionRow): StoredMobileSession {
  return {
    id: row.id,
    tokenHash: row.token_hash,
    userId: row.user_id,
    kind: row.kind,
    expiresAt: dateString(row.expires_at),
    createdAt: dateString(row.created_at),
    revokedAt: row.revoked_at ? dateString(row.revoked_at) : undefined,
    replacedBy: row.replaced_by || undefined,
  };
}

function apiClientFromRow(row: DbApiClientRow) {
  return {
    id: row.id,
    name: row.name,
    keyHash: row.key_hash,
    keyPrefix: row.key_prefix,
    scopes: Array.isArray(row.scopes) ? row.scopes : [],
    status: row.status,
    rateLimit: Number(row.rate_limit || 0),
    expiresAt: row.expires_at ? dateString(row.expires_at) : undefined,
    createdAt: dateString(row.created_at),
    lastUsedAt: row.last_used_at ? dateString(row.last_used_at) : undefined,
  };
}

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

export async function countDbUsers(): Promise<number> {
  const db = requireSql();
  const rows = await db`SELECT count(*)::int AS count FROM users`;
  return Number(rows[0]?.count || 0);
}

export async function listDbUsers(): Promise<PublicUser[]> {
  const db = requireSql();
  const rows = (await db`
    SELECT id, name, email, password_hash, role, status, created_at, updated_at
    FROM users
    ORDER BY created_at DESC
  `) as DbUserRow[];

  return rows.map((row) => toPublicUser(userFromRow(row)));
}

export async function findDbUserByEmail(email: string): Promise<StoredUser | undefined> {
  const db = requireSql();
  const rows = (await db`
    SELECT id, name, email, password_hash, role, status, created_at, updated_at
    FROM users
    WHERE email = ${email}
    LIMIT 1
  `) as DbUserRow[];

  return rows[0] ? userFromRow(rows[0]) : undefined;
}

export async function findDbUserById(id: string): Promise<StoredUser | undefined> {
  const db = requireSql();
  const rows = (await db`
    SELECT id, name, email, password_hash, role, status, created_at, updated_at
    FROM users
    WHERE id = ${id}
    LIMIT 1
  `) as DbUserRow[];

  return rows[0] ? userFromRow(rows[0]) : undefined;
}

export async function createDbUser(input: { name?: string; email: string; passwordHash: string; role?: UserRole }): Promise<PublicUser> {
  const db = requireSql();
  const id = randomUUID();

  try {
    const rows = (await db`
      INSERT INTO users (id, name, email, password_hash, role, status)
      VALUES (${id}, ${input.name || null}, ${input.email}, ${input.passwordHash}, ${input.role || "USER"}, 'ACTIVE')
      RETURNING id, name, email, password_hash, role, status, created_at, updated_at
    `) as DbUserRow[];

    return toPublicUser(userFromRow(rows[0]));
  } catch (error) {
    if (error instanceof Error && /duplicate key|unique/i.test(error.message)) {
      throw new Error("USER_EXISTS");
    }

    throw error;
  }
}

export async function updateDbUserAccess(input: { userId: string; role: UserRole; status: UserStatus }): Promise<void> {
  const db = requireSql();
  const rows = await db`
    UPDATE users
    SET role = ${input.role}, status = ${input.status}, updated_at = now()
    WHERE id = ${input.userId}
    RETURNING id
  `;

  if (!rows.length) {
    throw new Error("USER_NOT_FOUND");
  }

  if (input.status === "DISABLED") {
    await db`DELETE FROM sessions WHERE user_id = ${input.userId}`;
  }
}

export async function updateDbUserPassword(input: { userId: string; passwordHash: string }): Promise<void> {
  const db = requireSql();
  const rows = await db`
    UPDATE users
    SET password_hash = ${input.passwordHash}, updated_at = now()
    WHERE id = ${input.userId}
    RETURNING id
  `;

  if (!rows.length) {
    throw new Error("USER_NOT_FOUND");
  }
}

export async function createDbSession(input: { userId: string; tokenHash: string; expiresAt: Date }): Promise<StoredSession> {
  const db = requireSql();
  await db`DELETE FROM sessions WHERE expires_at <= now()`;

  const rows = (await db`
    INSERT INTO sessions (id, token_hash, user_id, expires_at)
    VALUES (${randomUUID()}, ${input.tokenHash}, ${input.userId}, ${input.expiresAt.toISOString()})
    RETURNING id, token_hash, user_id, expires_at, created_at
  `) as DbSessionRow[];

  return sessionFromRow(rows[0]);
}

export async function findDbSessionByTokenHash(tokenHash: string): Promise<{ session: StoredSession; user: StoredUser } | undefined> {
  const db = requireSql();
  const rows = (await db`
    SELECT
      s.id AS session_id,
      s.token_hash,
      s.user_id,
      s.expires_at,
      s.created_at AS session_created_at,
      u.id AS user_id_value,
      u.name,
      u.email,
      u.password_hash,
      u.role,
      u.status,
      u.created_at AS user_created_at,
      u.updated_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ${tokenHash}
      AND s.expires_at > now()
    LIMIT 1
  `) as Array<{
    session_id: string;
    token_hash: string;
    user_id: string;
    expires_at: Date | string;
    session_created_at: Date | string;
    user_id_value: string;
    name: string | null;
    email: string;
    password_hash: string;
    role: UserRole;
    status: UserStatus;
    user_created_at: Date | string;
    updated_at: Date | string;
  }>;

  const row = rows[0];
  if (!row) {
    return undefined;
  }

  return {
    session: sessionFromRow({
      id: row.session_id,
      token_hash: row.token_hash,
      user_id: row.user_id,
      expires_at: row.expires_at,
      created_at: row.session_created_at,
    }),
    user: userFromRow({
      id: row.user_id_value,
      name: row.name,
      email: row.email,
      password_hash: row.password_hash,
      role: row.role,
      status: row.status,
      created_at: row.user_created_at,
      updated_at: row.updated_at,
    }),
  };
}

export async function deleteDbSession(tokenHash: string): Promise<void> {
  const db = requireSql();
  await db`DELETE FROM sessions WHERE token_hash = ${tokenHash}`;
}

export async function createDbMobileSession(input: {
  userId: string;
  tokenHash: string;
  kind: MobileTokenKind;
  expiresAt: Date;
  replacedBy?: string;
}): Promise<StoredMobileSession> {
  const db = requireSql();
  const rows = (await db`
    INSERT INTO mobile_sessions (id, token_hash, user_id, kind, expires_at, replaced_by)
    VALUES (${randomUUID()}, ${input.tokenHash}, ${input.userId}, ${input.kind}, ${input.expiresAt.toISOString()}, ${input.replacedBy || null})
    RETURNING id, token_hash, user_id, kind, expires_at, created_at, revoked_at, replaced_by
  `) as DbMobileSessionRow[];
  return mobileSessionFromRow(rows[0]);
}

export async function findDbMobileSessionByTokenHash(tokenHash: string): Promise<{
  session: StoredMobileSession;
  user: StoredUser;
} | undefined> {
  const db = requireSql();
  const rows = (await db`
    SELECT
      ms.id,
      ms.token_hash,
      ms.user_id,
      ms.kind,
      ms.expires_at,
      ms.created_at,
      ms.revoked_at,
      ms.replaced_by,
      u.id AS user_id_value,
      u.name,
      u.email,
      u.password_hash,
      u.role,
      u.status,
      u.created_at AS user_created_at,
      u.updated_at
    FROM mobile_sessions ms
    JOIN users u ON u.id = ms.user_id
    WHERE ms.token_hash = ${tokenHash}
      AND ms.revoked_at IS NULL
      AND ms.expires_at > now()
    LIMIT 1
  `) as Array<DbMobileSessionRow & {
    user_id_value: string;
    name: string | null;
    email: string;
    password_hash: string;
    role: UserRole;
    status: UserStatus;
    user_created_at: Date | string;
    updated_at: Date | string;
  }>;

  const row = rows[0];
  if (!row) return undefined;
  return {
    session: mobileSessionFromRow(row),
    user: userFromRow({
      id: row.user_id_value,
      name: row.name,
      email: row.email,
      password_hash: row.password_hash,
      role: row.role,
      status: row.status,
      created_at: row.user_created_at,
      updated_at: row.updated_at,
    }),
  };
}

export async function revokeDbMobileSession(tokenHash: string, replacedBy?: string): Promise<void> {
  const db = requireSql();
  await db`
    UPDATE mobile_sessions
    SET revoked_at = now(), replaced_by = ${replacedBy || null}
    WHERE token_hash = ${tokenHash} AND revoked_at IS NULL
  `;
}

export async function revokeDbMobileSessionsForUser(userId: string): Promise<void> {
  const db = requireSql();
  await db`UPDATE mobile_sessions SET revoked_at = now() WHERE user_id = ${userId} AND revoked_at IS NULL`;
}

export async function createDbApiClient(input: {
  name: string;
  keyHash: string;
  keyPrefix: string;
  scopes: string[];
  rateLimit: number;
  expiresAt?: Date;
}) {
  const db = requireSql();
  const rows = (await db`
    INSERT INTO api_clients (id, name, key_hash, key_prefix, scopes, status, rate_limit, expires_at)
    VALUES (${randomUUID()}, ${input.name.trim()}, ${input.keyHash}, ${input.keyPrefix}, ${JSON.stringify(input.scopes)}::jsonb, 'ACTIVE', ${input.rateLimit}, ${input.expiresAt?.toISOString() || null})
    RETURNING id, name, key_hash, key_prefix, scopes, status, rate_limit, expires_at, created_at, last_used_at
  `) as DbApiClientRow[];
  return apiClientFromRow(rows[0]);
}

export async function listDbApiClients() {
  const db = requireSql();
  const rows = (await db`
    SELECT id, name, key_hash, key_prefix, scopes, status, rate_limit, expires_at, created_at, last_used_at
    FROM api_clients
    ORDER BY created_at DESC
  `) as DbApiClientRow[];
  return rows.map(apiClientFromRow);
}

export async function findDbApiClientByKeyHash(keyHash: string) {
  const db = requireSql();
  const rows = (await db`
    SELECT id, name, key_hash, key_prefix, scopes, status, rate_limit, expires_at, created_at, last_used_at
    FROM api_clients
    WHERE key_hash = ${keyHash} AND status = 'ACTIVE'
      AND (expires_at IS NULL OR expires_at > now())
    LIMIT 1
  `) as DbApiClientRow[];
  return rows[0] ? apiClientFromRow(rows[0]) : undefined;
}

export async function revokeDbApiClient(id: string): Promise<void> {
  const db = requireSql();
  const rows = await db`UPDATE api_clients SET status = 'REVOKED' WHERE id = ${id} RETURNING id`;
  if (!rows.length) throw new Error("API_CLIENT_NOT_FOUND");
}

export async function touchDbApiClient(id: string): Promise<void> {
  const db = requireSql();
  await db`UPDATE api_clients SET last_used_at = now() WHERE id = ${id}`;
}
