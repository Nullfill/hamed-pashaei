import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { isFavorite, setFavorite } from "@/lib/activity/store";
import { mediaTypeSchema } from "@/lib/providers/types";

const favoriteSchema = z.object({
  provider: z.string().optional(),
  type: mediaTypeSchema,
  id: z.string().min(1),
  title: z.string().optional(),
  poster: z.string().optional(),
  favorite: z.boolean().optional(),
});

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ favorite: false }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = favoriteSchema
    .pick({ provider: true, type: true, id: true })
    .safeParse({
      provider: searchParams.get("provider") || searchParams.get("src") || undefined,
      type: searchParams.get("type"),
      id: searchParams.get("id"),
    });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid favorite request." }, { status: 400 });
  }

  return NextResponse.json({ favorite: await isFavorite(user.id, parsed.data) });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication is required." }, { status: 401 });
  }

  const parsed = favoriteSchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid favorite payload." }, { status: 400 });
  }

  const favorite = Boolean(parsed.data.favorite);
  await setFavorite(user.id, parsed.data, favorite);
  return NextResponse.json({ favorite });
}
