import { NextResponse } from "next/server";
import { createUserSession } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { countUsers, createUser } from "@/lib/auth/store";
import { registerSchema, safeNextPath } from "@/lib/auth/validation";

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
  const parsed = registerSchema.safeParse({
    name: formData.get("name") || undefined,
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });
  const nextPath = safeNextPath(typeof formData.get("next") === "string" ? String(formData.get("next")) : undefined);

  if (!parsed.success) {
    return redirectWithError(`/register?next=${encodeURIComponent(nextPath)}`, "اطلاعات ثبت نام معتبر نیست. رمز باید حداقل ۸ کاراکتر باشد.");
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
    return redirectTo(existingUsers === 0 ? "/admin" : safeNextPath(parsed.data.next));
  } catch (error) {
    if (error instanceof Error && error.message === "USER_EXISTS") {
      return redirectWithError(`/register?next=${encodeURIComponent(safeNextPath(parsed.data.next))}`, "این ایمیل قبلا ثبت شده است.");
    }

    return redirectWithError(`/register?next=${encodeURIComponent(safeNextPath(parsed.data.next))}`, "ثبت نام انجام نشد.");
  }
}
