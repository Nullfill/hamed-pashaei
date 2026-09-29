import { NextResponse } from "next/server";
import { createUserSession } from "@/lib/auth/session";
import { findUserByEmail } from "@/lib/auth/store";
import { verifyPassword } from "@/lib/auth/password";
import { loginSchema, safeNextPath } from "@/lib/auth/validation";

function redirectTo(path: string) {
  return new NextResponse(null, {
    status: 303,
    headers: { Location: path },
  });
}

function redirectWithError(path: string, message: string) {
  const separator = path.includes("?") ? "&" : "?";
  return redirectTo(`${path}${separator}error=${encodeURIComponent(message)}`);
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
    return redirectWithError(`/login?next=${encodeURIComponent(nextPath)}`, "ایمیل یا رمز عبور معتبر نیست.");
  }

  const user = await findUserByEmail(parsed.data.email);
  const validPassword = user ? await verifyPassword(parsed.data.password, user.passwordHash) : false;

  if (!user || !validPassword || user.status !== "ACTIVE") {
    return redirectWithError(`/login?next=${encodeURIComponent(safeNextPath(parsed.data.next))}`, "ایمیل یا رمز عبور اشتباه است.");
  }

  await createUserSession(user.id);
  return redirectTo(safeNextPath(parsed.data.next) || "/");
}
