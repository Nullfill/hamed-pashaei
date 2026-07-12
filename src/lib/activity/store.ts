import "server-only";

import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { neon } from "@neondatabase/serverless";
import type {
  ActivityCounts,
  MediaActivityInput,
  DailyTraffic,
  FavoriteItem,
  TopPage,
  TrafficSummary,
  WatchProgressItem,
} from "@/lib/activity/types";

type ActivityData = {
  watchProgress: WatchProgressItem[];
  favorites: FavoriteItem[];
  pageViews: Array<{
    id: string;
    userId?: string;
    visitorId?: string;
    path: string;
    userAgent?: string;
    createdAt: string;
  }>;
};

const sql = process.env.DATABASE_URL
  ? neon(process.env.DATABASE_URL)
  : undefined;
const storePath =
  process.env.ACTIVITY_STORE_PATH ||
  path.join(process.cwd(), "data", "activity.json");
const trafficTimeZone = process.env.APP_TIME_ZONE || "Asia/Tehran";
const emptyStore: ActivityData = {
  watchProgress: [],
  favorites: [],
  pageViews: [],
};
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
  return [
    userId,
    providerId(media.provider),
    media.type,
    media.id,
    seasonId(media.season),
    episodeId(media.episode),
  ].join(":");
}

function visitorKey(view: ActivityData["pageViews"][number]): string {
  if (view.visitorId) return `visitor:${view.visitorId}`;
  if (view.userId) return `user:${view.userId}`;
  return `view:${view.id}`;
}

function dateKey(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: trafficTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function isPublicView(view: ActivityData["pageViews"][number]): boolean {
  return (
    !/^\/(?:admin|api|_next)(?:\/|$)/.test(view.path) &&
    !/bot|crawler|spider|preview/i.test(view.userAgent || "")
  );
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
      watchProgress: Array.isArray(parsed.watchProgress)
        ? parsed.watchProgress
        : [],
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
  media: MediaActivityInput & {
    progressSeconds: number;
    durationSeconds?: number;
  },
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
    completed: Boolean(
      media.durationSeconds &&
      media.progressSeconds > media.durationSeconds - 8,
    ),
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
    store.watchProgress = store.watchProgress.filter(
      (progress) => mediaKey(userId, progress) !== key,
    );
    store.watchProgress.push(item);
    await writeStore(store);
    return item;
  });
}

export async function getWatchProgress(
  userId: string,
  media: MediaActivityInput,
): Promise<WatchProgressItem | undefined> {
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
  return store.watchProgress.find(
    (progress) => mediaKey(userId, progress) === key,
  );
}

export async function listWatchProgress(
  userId?: string,
  limit = 50,
): Promise<WatchProgressItem[]> {
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

export async function isFavorite(
  userId: string,
  media: MediaActivityInput,
): Promise<boolean> {
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

export async function setFavorite(
  userId: string,
  media: MediaActivityInput,
  favorite: boolean,
): Promise<void> {
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

export async function listFavorites(
  userId?: string,
  limit = 50,
): Promise<FavoriteItem[]> {
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

export async function recordPageView(input: {
  userId?: string;
  visitorId: string;
  path: string;
  userAgent?: string;
}): Promise<void> {
  if (sql) {
    await sql`
      INSERT INTO page_views (id, user_id, visitor_id, path, user_agent)
      SELECT ${randomUUID()}, ${input.userId || null}, ${input.visitorId}, ${input.path}, ${input.userAgent || null}
      WHERE NOT EXISTS (
        SELECT 1 FROM page_views
        WHERE visitor_id = ${input.visitorId} AND path = ${input.path}
          AND created_at >= now() - interval '10 seconds'
      )
    `;
    return;
  }

  await withWrite(async () => {
    const store = await readStore();
    const duplicate = store.pageViews.some(
      (view) =>
        view.visitorId === input.visitorId &&
        view.path === input.path &&
        Date.now() - new Date(view.createdAt).getTime() < 10_000,
    );
    if (duplicate) return;
    store.pageViews.push({
      id: randomUUID(),
      userId: input.userId,
      visitorId: input.visitorId,
      path: input.path,
      userAgent: input.userAgent,
      createdAt: new Date().toISOString(),
    });
    await writeStore(store);
  });
}

export async function getTrafficSummary(): Promise<TrafficSummary> {
  if (sql) {
    const rows = await sql`
      SELECT
        count(*)::int AS total,
        count(*) FILTER (WHERE timezone(${trafficTimeZone}, created_at) >= date_trunc('day', timezone(${trafficTimeZone}, now())))::int AS today,
        count(*) FILTER (WHERE timezone(${trafficTimeZone}, created_at) >= date_trunc('month', timezone(${trafficTimeZone}, now())))::int AS this_month,
        count(DISTINCT coalesce('visitor:' || visitor_id, 'user:' || user_id, 'view:' || id))
          FILTER (WHERE timezone(${trafficTimeZone}, created_at) >= date_trunc('day', timezone(${trafficTimeZone}, now())))::int AS unique_today,
        count(DISTINCT coalesce('visitor:' || visitor_id, 'user:' || user_id, 'view:' || id))
          FILTER (WHERE timezone(${trafficTimeZone}, created_at) >= date_trunc('month', timezone(${trafficTimeZone}, now())))::int AS unique_this_month
      FROM page_views
      WHERE path !~ '^/(admin|api|_next)(/|$)'
        AND (user_agent IS NULL OR user_agent !~* '(bot|crawler|spider|preview)')
    `;
    return {
      total: Number(rows[0]?.total || 0),
      today: Number(rows[0]?.today || 0),
      thisMonth: Number(rows[0]?.this_month || 0),
      uniqueToday: Number(rows[0]?.unique_today || 0),
      uniqueThisMonth: Number(rows[0]?.unique_this_month || 0),
    };
  }

  const store = await readStore();
  const views = store.pageViews.filter(isPublicView);
  const todayKey = dateKey(new Date());
  const monthKey = todayKey.slice(0, 7);
  const todayViews = views.filter(
    (view) => dateKey(new Date(view.createdAt)) === todayKey,
  );
  const monthViews = views.filter((view) =>
    dateKey(new Date(view.createdAt)).startsWith(monthKey),
  );
  return {
    total: views.length,
    today: todayViews.length,
    thisMonth: monthViews.length,
    uniqueToday: new Set(todayViews.map(visitorKey)).size,
    uniqueThisMonth: new Set(monthViews.map(visitorKey)).size,
  };
}

export async function getDailyTraffic(days = 30): Promise<DailyTraffic[]> {
  const safeDays = Math.max(1, Math.min(366, Math.floor(days)));
  if (sql) {
    const rows = await sql`
      WITH localized_views AS (
        SELECT timezone(${trafficTimeZone}, created_at) AS local_created_at, visitor_id, user_id, id
        FROM page_views
        WHERE path !~ '^/(admin|api|_next)(/|$)'
          AND (user_agent IS NULL OR user_agent !~* '(bot|crawler|spider|preview)')
      ), daily_views AS (
        SELECT date_trunc('day', local_created_at) AS local_day, visitor_id, user_id, id
        FROM localized_views
        WHERE local_created_at >= date_trunc('day', timezone(${trafficTimeZone}, now())) - (${safeDays - 1}::text || ' days')::interval
      )
      SELECT to_char(local_day, 'YYYY-MM-DD') AS day, count(*)::int AS views,
        count(DISTINCT coalesce('visitor:' || visitor_id, 'user:' || user_id, 'view:' || id))::int AS visitors
      FROM daily_views
      GROUP BY local_day
      ORDER BY day DESC
    `;
    return rows.map((row) => ({
      day: String(row.day),
      views: Number(row.views || 0),
      visitors: Number(row.visitors || 0),
    }));
  }

  const store = await readStore();
  const allowedDays = new Set(
    Array.from({ length: safeDays }, (_, index) =>
      dateKey(new Date(Date.now() - index * 86_400_000)),
    ),
  );
  const counts = new Map<string, number>();
  const visitors = new Map<string, Set<string>>();
  for (const view of store.pageViews.filter(isPublicView)) {
    const day = dateKey(new Date(view.createdAt));
    if (!allowedDays.has(day)) continue;
    counts.set(day, (counts.get(day) || 0) + 1);
    const dayVisitors = visitors.get(day) || new Set<string>();
    dayVisitors.add(visitorKey(view));
    visitors.set(day, dayVisitors);
  }

  return [...counts.entries()]
    .map(([day, views]) => ({
      day,
      views,
      visitors: visitors.get(day)?.size || 0,
    }))
    .sort((a, b) => b.day.localeCompare(a.day));
}

export async function getTopPages(days = 30, limit = 6): Promise<TopPage[]> {
  const safeDays = Math.max(1, Math.min(366, Math.floor(days)));
  const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)));
  if (sql) {
    const rows = await sql`
      SELECT path, count(*)::int AS views,
        count(DISTINCT coalesce('visitor:' || visitor_id, 'user:' || user_id, 'view:' || id))::int AS visitors
      FROM page_views
      WHERE created_at >= now() - (${safeDays}::text || ' days')::interval
        AND path !~ '^/(admin|api|_next)(/|$)'
        AND (user_agent IS NULL OR user_agent !~* '(bot|crawler|spider|preview)')
      GROUP BY path
      ORDER BY views DESC, path ASC
      LIMIT ${safeLimit}
    `;
    return rows.map((row) => ({
      path: String(row.path),
      views: Number(row.views || 0),
      visitors: Number(row.visitors || 0),
    }));
  }

  const store = await readStore();
  const cutoff = Date.now() - safeDays * 86_400_000;
  const pages = new Map<string, { views: number; visitors: Set<string> }>();
  for (const view of store.pageViews.filter(isPublicView)) {
    if (new Date(view.createdAt).getTime() < cutoff) continue;
    const page = pages.get(view.path) || {
      views: 0,
      visitors: new Set<string>(),
    };
    page.views += 1;
    page.visitors.add(visitorKey(view));
    pages.set(view.path, page);
  }
  return [...pages.entries()]
    .map(([pagePath, value]) => ({
      path: pagePath,
      views: value.views,
      visitors: value.visitors.size,
    }))
    .sort((a, b) => b.views - a.views || a.path.localeCompare(b.path))
    .slice(0, safeLimit);
}

export async function getActivityCounts(
  userId?: string,
): Promise<ActivityCounts> {
  if (sql) {
    const watchRows = userId
      ? await sql`SELECT count(*)::int AS count FROM watch_progress WHERE user_id = ${userId}`
      : await sql`SELECT count(*)::int AS count FROM watch_progress`;
    const favoriteRows = userId
      ? await sql`SELECT count(*)::int AS count FROM favorites WHERE user_id = ${userId}`
      : await sql`SELECT count(*)::int AS count FROM favorites`;
    return {
      watch: Number(watchRows[0]?.count || 0),
      favorites: Number(favoriteRows[0]?.count || 0),
    };
  }
  const store = await readStore();
  return {
    watch: store.watchProgress.filter(
      (item) => !userId || item.userId === userId,
    ).length,
    favorites: store.favorites.filter(
      (item) => !userId || item.userId === userId,
    ).length,
  };
}

export async function getActivityCountsByUser(): Promise<
  Map<string, ActivityCounts>
> {
  if (sql) {
    const rows = await sql`
      SELECT u.id AS user_id, coalesce(w.watch, 0)::int AS watch, coalesce(f.favorites, 0)::int AS favorites
      FROM users u
      LEFT JOIN (SELECT user_id, count(*)::int AS watch FROM watch_progress GROUP BY user_id) w ON w.user_id = u.id
      LEFT JOIN (SELECT user_id, count(*)::int AS favorites FROM favorites GROUP BY user_id) f ON f.user_id = u.id
    `;
    return new Map(
      rows.map((row) => [
        String(row.user_id),
        {
          watch: Number(row.watch || 0),
          favorites: Number(row.favorites || 0),
        },
      ]),
    );
  }
  const store = await readStore();
  const result = new Map<string, ActivityCounts>();
  for (const item of store.watchProgress)
    result.set(item.userId, {
      watch: (result.get(item.userId)?.watch || 0) + 1,
      favorites: result.get(item.userId)?.favorites || 0,
    });
  for (const item of store.favorites)
    result.set(item.userId, {
      watch: result.get(item.userId)?.watch || 0,
      favorites: (result.get(item.userId)?.favorites || 0) + 1,
    });
  return result;
}
