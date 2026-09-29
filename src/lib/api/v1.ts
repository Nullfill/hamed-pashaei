import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

export type ApiMeta = {
  requestId: string;
  [key: string]: unknown;
};

function requestId(request?: Request): string {
  return request?.headers.get("x-request-id")?.trim() || randomUUID();
}

export function apiSuccess<T>(
  request: Request | undefined,
  data: T,
  meta: Record<string, unknown> = {},
  init?: ResponseInit,
) {
  const id = requestId(request);
  const headers = new Headers(init?.headers);
  headers.set("x-request-id", id);
  headers.set("Cache-Control", "no-store");

  return NextResponse.json(
    {
      data,
      meta: { requestId: id, ...meta },
      error: null,
    },
    { ...init, headers },
  );
}

export function apiError(
  request: Request | undefined,
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  const id = requestId(request);
  const headers = new Headers({
    "Cache-Control": "no-store",
    "x-request-id": id,
  });

  return NextResponse.json(
    {
      data: null,
      meta: { requestId: id },
      error: {
        code,
        message,
        ...(details === undefined ? {} : { details }),
      },
    },
    { status, headers },
  );
}

export function parsePage(value: string | null, fallback = 1): number {
  const page = Number(value);
  return Number.isFinite(page) ? Math.max(1, Math.min(10000, Math.floor(page))) : fallback;
}

export function parseLimit(value: string | null, fallback = 20, max = 50): number {
  const limit = Number(value);
  return Number.isFinite(limit) ? Math.max(1, Math.min(max, Math.floor(limit))) : fallback;
}

export function parseBoolean(value: string | null): boolean | undefined {
  if (value === null || value === "") return undefined;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

