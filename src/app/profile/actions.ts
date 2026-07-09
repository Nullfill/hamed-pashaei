"use server";

import { redirect } from "next/navigation";
import { clearUserSession, getCurrentUser } from "@/lib/auth/session";
import { findUserById, updateUserPassword } from "@/lib/auth/store";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

export async function changePasswordAction(formData: FormData) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login?next=/profile");
  }

  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (newPassword.length < 8) {
    redirect("/profile?passwordError=رمز جدید باید حداقل ۸ کاراکتر باشد.");
  }

  if (newPassword !== confirmPassword) {
    redirect("/profile?passwordError=تکرار رمز عبور با رمز جدید یکسان نیست.");
  }

  const user = await findUserById(currentUser.id);
  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
    redirect("/profile?passwordError=رمز فعلی اشتباه است.");
  }

  await updateUserPassword({
    userId: currentUser.id,
    passwordHash: await hashPassword(newPassword),
  });
  await clearUserSession();
  redirect("/login?next=/profile&message=password_changed");
}
