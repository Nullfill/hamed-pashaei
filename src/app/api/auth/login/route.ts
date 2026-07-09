import { NextResponse } from "next/server";
import { createUserSession } from "@/lib/auth/session";
import { findUserByEmail } from "@/lib/auth/store";
import { verifyPassword } from "@/lib/auth/password";
import { loginSchema, safeNextPath } from "@/lib/auth/validation";

function redirectTo(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

function redirectWithError(request: Request, path: string, message: string) {
  const url = new URL(path, request.url);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });
  const nextPath = safeNextPath(typeof formData.get("next") === "string" ? String(formData.get("next")) : undefined);

  if (!parsed.success) {
    return redirectWithError(request, `/login?next=${encodeURIComponent(nextPath)}`, "ایمیل یا رمز عبور معتبر نیست.");
  }

  const user = await findUserByEmail(parsed.data.email);
  const validPassword = user ? await verifyPassword(parsed.data.password, user.passwordHash) : false;

  if (!user || !validPassword || user.status !== "ACTIVE") {
    return redirectWithError(request, `/login?next=${encodeURIComponent(safeNextPath(parsed.data.next))}`, "ایمیل یا رمز عبور اشتباه است.");
  }

  await createUserSession(user.id);
  return redirectTo(request, safeNextPath(parsed.data.next) || "/");
}
