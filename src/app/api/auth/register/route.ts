import { NextResponse } from "next/server";
import { createUserSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { countUsers, createUser } from "@/lib/auth/store";
import { registerSchema, safeNextPath } from "@/lib/auth/validation";

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
  const parsed = registerSchema.safeParse({
    name: formData.get("name") || undefined,
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });
  const nextPath = safeNextPath(typeof formData.get("next") === "string" ? String(formData.get("next")) : undefined);

  if (!parsed.success) {
    return redirectWithError(request, `/register?next=${encodeURIComponent(nextPath)}`, "اطلاعات ثبت نام معتبر نیست. رمز باید حداقل ۸ کاراکتر باشد.");
  }

  const existingUsers = await countUsers();

  try {
    const user = await createUser({
      name: parsed.data.name || undefined,
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
      role: existingUsers === 0 ? "ADMIN" : "USER",
    });

    await createUserSession(user.id);
    return redirectTo(request, existingUsers === 0 ? "/admin" : safeNextPath(parsed.data.next));
  } catch (error) {
    if (error instanceof Error && error.message === "USER_EXISTS") {
      return redirectWithError(request, `/register?next=${encodeURIComponent(safeNextPath(parsed.data.next))}`, "این ایمیل قبلا ثبت شده است.");
    }

    return redirectWithError(request, `/register?next=${encodeURIComponent(safeNextPath(parsed.data.next))}`, "ثبت نام انجام نشد.");
  }
}
