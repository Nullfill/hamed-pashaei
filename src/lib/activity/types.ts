import type { MediaType } from "@/lib/providers/types";

export interface MediaActivityInput {
  provider?: string;
  type: MediaType;
  id: string;
  season?: string;
  episode?: string;
  title?: string;
  poster?: string;
}

export interface WatchProgressItem extends MediaActivityInput {
  userId: string;
  progressSeconds: number;
  durationSeconds: number;
  completed: boolean;
  updatedAt: string;
}

export interface FavoriteItem extends MediaActivityInput {
  userId: string;
  createdAt: string;
}

export interface TrafficSummary {
  today: number;
  thisMonth: number;
  total: number;
  uniqueToday: number;
  uniqueThisMonth: number;
}

export interface DailyTraffic {
  day: string;
  views: number;
  visitors: number;
}

export interface ActivityCounts {
  watch: number;
  favorites: number;
}

export interface TopPage {
  path: string;
  views: number;
  visitors: number;
}
