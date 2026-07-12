/* global console, process */

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

async function loadEnvFile(path) {
  if (!existsSync(path)) {
    return;
  }

  const text = await readFile(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const [key, ...parts] = trimmed.split("=");
    if (process.env[key]) {
      continue;
    }

    process.env[key] = parts
      .join("=")
      .trim()
      .replace(/^["']|["']$/g, "");
  }
}

await loadEnvFile(".env.local");
await loadEnvFile(".env");

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error(
    "DATABASE_URL is missing. Add your Neon connection string to .env or .env.local first.",
  );
  process.exit(1);
}

const sql = neon(databaseUrl);

await sql`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISABLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    token_hash TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

await sql`CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id)`;
await sql`CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at)`;

await sql`
  CREATE TABLE IF NOT EXISTS watch_progress (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    media_type TEXT NOT NULL,
    media_id TEXT NOT NULL,
    season TEXT NOT NULL DEFAULT '0',
    episode TEXT NOT NULL DEFAULT '0',
    title TEXT,
    poster TEXT,
    progress_seconds INTEGER NOT NULL DEFAULT 0,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, provider, media_type, media_id, season, episode)
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS favorites (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    media_type TEXT NOT NULL,
    media_id TEXT NOT NULL,
    title TEXT,
    poster TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, provider, media_type, media_id)
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS page_views (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    visitor_id TEXT,
    path TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;
await sql`ALTER TABLE page_views ADD COLUMN IF NOT EXISTS visitor_id TEXT`;

await sql`CREATE INDEX IF NOT EXISTS watch_progress_user_id_idx ON watch_progress(user_id)`;
await sql`CREATE INDEX IF NOT EXISTS watch_progress_updated_at_idx ON watch_progress(updated_at)`;
await sql`CREATE INDEX IF NOT EXISTS favorites_user_id_idx ON favorites(user_id)`;
await sql`CREATE INDEX IF NOT EXISTS page_views_created_at_idx ON page_views(created_at)`;
await sql`CREATE INDEX IF NOT EXISTS page_views_path_idx ON page_views(path)`;
await sql`CREATE INDEX IF NOT EXISTS page_views_visitor_id_idx ON page_views(visitor_id)`;
await sql`CREATE INDEX IF NOT EXISTS page_views_visitor_path_created_idx ON page_views(visitor_id, path, created_at DESC)`;

console.log("Database schema is ready.");
