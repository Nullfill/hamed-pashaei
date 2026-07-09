import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { recordPageView } from "@/lib/activity/store";

const pageViewSchema = z.object({
  path: z.string().min(1).max(300),
});

export async function POST(request: Request) {
  const parsed = pageViewSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid page view payload." }, { status: 400 });
  }

  const user = await getCurrentUser();
  await recordPageView({
    userId: user?.id,
    path: parsed.data.path,
    userAgent: request.headers.get("user-agent") || undefined,
  });

  return NextResponse.json({ ok: true });
}
