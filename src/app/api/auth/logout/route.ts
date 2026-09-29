import { NextResponse } from "next/server";
import { clearUserSession } from "@/lib/auth/session";

export async function POST() {
  await clearUserSession();
  return new NextResponse(null, {
    status: 303,
    headers: { Location: "/" },
  });
}
