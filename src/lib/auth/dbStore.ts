import "server-only";

import { neon } from "@neondatabase/serverless";
import { randomUUID } from "crypto";
import type { PublicUser, StoredSession, StoredUser, UserRole, UserStatus } from "@/lib/auth/types";

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

const databaseUrl = process.env.DATABASE_URL;
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
