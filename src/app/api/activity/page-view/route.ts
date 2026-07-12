import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { recordPageView } from "@/lib/activity/store";
import { randomUUID } from "crypto";

const pageViewSchema = z.object({
  path: z.string().min(1).max(300).startsWith("/"),
});

export async function POST(request: NextRequest) {
  const parsed = pageViewSchema.safeParse(
    await request.json().catch(() => undefined),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid page view payload." },
      { status: 400 },
    );
  }

  const path = parsed.data.path.split("?", 1)[0].replace(/\/{2,}/g, "/");
  const user = await getCurrentUser();
  const userAgent = request.headers.get("user-agent") || undefined;
  if (
    /^\/(?:admin|api|_next)(?:\/|$)/.test(path) ||
    /bot|crawler|spider|preview/i.test(userAgent || "")
  ) {
    return NextResponse.json({ ok: true, ignored: true });
  }
  const cookie = request.cookies.get("visitor_id")?.value;
  const visitorId = z.string().uuid().safeParse(cookie).success
    ? cookie!
    : randomUUID();
  await recordPageView({
    userId: user?.id,
    visitorId,
    path,
    userAgent,
  });
  const response = NextResponse.json({ ok: true });
  if (cookie !== visitorId)
    response.cookies.set("visitor_id", visitorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  return response;
}
