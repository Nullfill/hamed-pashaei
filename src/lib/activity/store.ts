import "server-only";

import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { neon } from "@neondatabase/serverless";
import type { MediaActivityInput, DailyTraffic, FavoriteItem, TrafficSummary, WatchProgressItem } from "@/lib/activity/types";

type ActivityData = {
  watchProgress: WatchProgressItem[];
  favorites: FavoriteItem[];
  pageViews: Array<{ id: string; userId?: string; path: string; userAgent?: string; createdAt: string }>;
};

const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : undefined;
const storePath = process.env.ACTIVITY_STORE_PATH || path.join(process.cwd(), "data", "activity.json");
const emptyStore: ActivityData = { watchProgress: [], favorites: [], pageViews: [] };
let writeQueue = Promise.resolve();

function providerId(provider?: string): string {
  return provider || "default";
}

function seasonId(season?: string): string {
  return season || "0";
}

function episodeId(episode?: string): string {
  return episode || "0";
}

function mediaKey(userId: string, media: MediaActivityInput): string {
  return [userId, providerId(media.provider), media.type, media.id, seasonId(media.season), episodeId(media.episode)].join(":");
}

async function ensureStoreFile() {
  await fs.mkdir(path.dirname(storePath), { recursive: true });
  try {
    await fs.access(storePath);
  } catch {
    await fs.writeFile(storePath, JSON.stringify(emptyStore, null, 2), "utf8");
  }
}

async function readStore(): Promise<ActivityData> {
  await ensureStoreFile();
  try {
    const text = await fs.readFile(storePath, "utf8");
    const parsed = JSON.parse(text) as Partial<ActivityData>;
    return {
      watchProgress: Array.isArray(parsed.watchProgress) ? parsed.watchProgress : [],
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      pageViews: Array.isArray(parsed.pageViews) ? parsed.pageViews : [],
    };
  } catch {
    return { ...emptyStore };
  }
}

async function writeStore(data: ActivityData) {
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

export async function saveWatchProgress(
  userId: string,
  media: MediaActivityInput & { progressSeconds: number; durationSeconds?: number },
): Promise<WatchProgressItem> {
  const item: WatchProgressItem = {
    userId,
    provider: providerId(media.provider),
    type: media.type,
    id: media.id,
    season: seasonId(media.season),
    episode: episodeId(media.episode),
    title: media.title,
    poster: media.poster,
    progressSeconds: Math.max(0, Math.floor(media.progressSeconds)),
    durationSeconds: Math.max(0, Math.floor(media.durationSeconds || 0)),
    completed: Boolean(media.durationSeconds && media.progressSeconds > media.durationSeconds - 8),
    updatedAt: new Date().toISOString(),
  };

  if (sql) {
    const rows = await sql`
      INSERT INTO watch_progress (
        user_id, provider, media_type, media_id, season, episode, title, poster,
        progress_seconds, duration_seconds, completed, updated_at
      )
      VALUES (
        ${userId}, ${item.provider}, ${item.type}, ${item.id}, ${item.season}, ${item.episode}, ${item.title || null}, ${item.poster || null},
        ${item.progressSeconds}, ${item.durationSeconds}, ${item.completed}, now()
      )
      ON CONFLICT (user_id, provider, media_type, media_id, season, episode)
      DO UPDATE SET
        title = EXCLUDED.title,
        poster = EXCLUDED.poster,
        progress_seconds = EXCLUDED.progress_seconds,
        duration_seconds = EXCLUDED.duration_seconds,
        completed = EXCLUDED.completed,
        updated_at = now()
      RETURNING updated_at
    `;
    item.updatedAt = new Date(rows[0].updated_at as string).toISOString();
    return item;
  }

  return withWrite(async () => {
    const store = await readStore();
    const key = mediaKey(userId, item);
    store.watchProgress = store.watchProgress.filter((progress) => mediaKey(userId, progress) !== key);
    store.watchProgress.push(item);
    await writeStore(store);
    return item;
  });
}

export async function getWatchProgress(userId: string, media: MediaActivityInput): Promise<WatchProgressItem | undefined> {
  if (sql) {
    const rows = await sql`
      SELECT user_id, provider, media_type, media_id, season, episode, title, poster,
        progress_seconds, duration_seconds, completed, updated_at
      FROM watch_progress
      WHERE user_id = ${userId}
        AND provider = ${providerId(media.provider)}
        AND media_type = ${media.type}
        AND media_id = ${media.id}
        AND season = ${seasonId(media.season)}
        AND episode = ${episodeId(media.episode)}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return undefined;
    return {
      userId: String(row.user_id),
      provider: String(row.provider),
      type: row.media_type as MediaActivityInput["type"],
      id: String(row.media_id),
      season: String(row.season),
      episode: String(row.episode),
      title: row.title ? String(row.title) : undefined,
      poster: row.poster ? String(row.poster) : undefined,
      progressSeconds: Number(row.progress_seconds || 0),
      durationSeconds: Number(row.duration_seconds || 0),
      completed: Boolean(row.completed),
      updatedAt: new Date(row.updated_at as string).toISOString(),
    };
  }

  const store = await readStore();
  const key = mediaKey(userId, media);
  return store.watchProgress.find((progress) => mediaKey(userId, progress) === key);
}

export async function listWatchProgress(userId?: string, limit = 50): Promise<WatchProgressItem[]> {
  if (sql) {
    const rows = userId
      ? await sql`
          SELECT user_id, provider, media_type, media_id, season, episode, title, poster,
            progress_seconds, duration_seconds, completed, updated_at
          FROM watch_progress
          WHERE user_id = ${userId}
          ORDER BY updated_at DESC
          LIMIT ${limit}
        `
      : await sql`
          SELECT user_id, provider, media_type, media_id, season, episode, title, poster,
            progress_seconds, duration_seconds, completed, updated_at
          FROM watch_progress
          ORDER BY updated_at DESC
          LIMIT ${limit}
        `;

    return rows.map((row) => ({
      userId: String(row.user_id),
      provider: String(row.provider),
      type: row.media_type as MediaActivityInput["type"],
      id: String(row.media_id),
      season: String(row.season),
      episode: String(row.episode),
      title: row.title ? String(row.title) : undefined,
      poster: row.poster ? String(row.poster) : undefined,
      progressSeconds: Number(row.progress_seconds || 0),
      durationSeconds: Number(row.duration_seconds || 0),
      completed: Boolean(row.completed),
      updatedAt: new Date(row.updated_at as string).toISOString(),
    }));
  }

  const store = await readStore();
  return store.watchProgress
    .filter((item) => !userId || item.userId === userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}

export async function isFavorite(userId: string, media: MediaActivityInput): Promise<boolean> {
  if (sql) {
    const rows = await sql`
      SELECT 1
      FROM favorites
      WHERE user_id = ${userId}
        AND provider = ${providerId(media.provider)}
        AND media_type = ${media.type}
        AND media_id = ${media.id}
      LIMIT 1
    `;
    return Boolean(rows.length);
  }

  const store = await readStore();
  return store.favorites.some(
    (favorite) =>
      favorite.userId === userId &&
      providerId(favorite.provider) === providerId(media.provider) &&
      favorite.type === media.type &&
      favorite.id === media.id,
  );
}

export async function setFavorite(userId: string, media: MediaActivityInput, favorite: boolean): Promise<void> {
  if (sql) {
    if (favorite) {
      await sql`
        INSERT INTO favorites (user_id, provider, media_type, media_id, title, poster)
        VALUES (${userId}, ${providerId(media.provider)}, ${media.type}, ${media.id}, ${media.title || null}, ${media.poster || null})
        ON CONFLICT (user_id, provider, media_type, media_id)
        DO UPDATE SET title = EXCLUDED.title, poster = EXCLUDED.poster
      `;
      return;
    }

    await sql`
      DELETE FROM favorites
      WHERE user_id = ${userId}
        AND provider = ${providerId(media.provider)}
        AND media_type = ${media.type}
        AND media_id = ${media.id}
    `;
    return;
  }

  await withWrite(async () => {
    const store = await readStore();
    store.favorites = store.favorites.filter(
      (item) =>
        !(
          item.userId === userId &&
          providerId(item.provider) === providerId(media.provider) &&
          item.type === media.type &&
          item.id === media.id
        ),
    );

    if (favorite) {
      store.favorites.push({
        userId,
        provider: providerId(media.provider),
        type: media.type,
        id: media.id,
        title: media.title,
        poster: media.poster,
        createdAt: new Date().toISOString(),
      });
    }

    await writeStore(store);
  });
}

export async function listFavorites(userId?: string, limit = 50): Promise<FavoriteItem[]> {
  if (sql) {
    const rows = userId
      ? await sql`
          SELECT user_id, provider, media_type, media_id, title, poster, created_at
          FROM favorites
          WHERE user_id = ${userId}
          ORDER BY created_at DESC
          LIMIT ${limit}
        `
      : await sql`
          SELECT user_id, provider, media_type, media_id, title, poster, created_at
          FROM favorites
          ORDER BY created_at DESC
          LIMIT ${limit}
        `;

    return rows.map((row) => ({
      userId: String(row.user_id),
      provider: String(row.provider),
      type: row.media_type as MediaActivityInput["type"],
      id: String(row.media_id),
      title: row.title ? String(row.title) : undefined,
      poster: row.poster ? String(row.poster) : undefined,
      createdAt: new Date(row.created_at as string).toISOString(),
    }));
  }

  const store = await readStore();
  return store.favorites
    .filter((item) => !userId || item.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function recordPageView(input: { userId?: string; path: string; userAgent?: string }): Promise<void> {
  if (sql) {
    await sql`
      INSERT INTO page_views (id, user_id, path, user_agent)
      VALUES (${randomUUID()}, ${input.userId || null}, ${input.path}, ${input.userAgent || null})
    `;
    return;
  }

  await withWrite(async () => {
    const store = await readStore();
    store.pageViews.push({ id: randomUUID(), userId: input.userId, path: input.path, userAgent: input.userAgent, createdAt: new Date().toISOString() });
    await writeStore(store);
  });
}

export async function getTrafficSummary(): Promise<TrafficSummary> {
  if (sql) {
    const rows = await sql`
      SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE created_at >= date_trunc('day', now()))::int AS today,
        count(*) FILTER (WHERE created_at >= date_trunc('month', now()))::int AS this_month
      FROM page_views
    `;
    return {
      total: Number(rows[0]?.total || 0),
      today: Number(rows[0]?.today || 0),
      thisMonth: Number(rows[0]?.this_month || 0),
    };
  }

  const store = await readStore();
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  return {
    total: store.pageViews.length,
    today: store.pageViews.filter((view) => new Date(view.createdAt).getTime() >= dayStart).length,
    thisMonth: store.pageViews.filter((view) => new Date(view.createdAt).getTime() >= monthStart).length,
  };
}

export async function getDailyTraffic(days = 30): Promise<DailyTraffic[]> {
  if (sql) {
    const rows = await sql`
      SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, count(*)::int AS views
      FROM page_views
      WHERE created_at >= now() - (${days}::text || ' days')::interval
      GROUP BY date_trunc('day', created_at)
      ORDER BY day DESC
    `;
    return rows.map((row) => ({ day: String(row.day), views: Number(row.views || 0) }));
  }

  const store = await readStore();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const counts = new Map<string, number>();
  for (const view of store.pageViews) {
    const time = new Date(view.createdAt).getTime();
    if (time < cutoff) continue;
    const day = view.createdAt.slice(0, 10);
    counts.set(day, (counts.get(day) || 0) + 1);
  }

  return [...counts.entries()]
    .map(([day, views]) => ({ day, views }))
    .sort((a, b) => b.day.localeCompare(a.day));
}
