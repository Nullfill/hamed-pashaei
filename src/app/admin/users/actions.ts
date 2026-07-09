"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { updateUserAccess } from "@/lib/auth/store";
import type { UserRole, UserStatus } from "@/lib/auth/types";

function parseRole(value: FormDataEntryValue | null): UserRole {
  return value === "ADMIN" ? "ADMIN" : "USER";
}

function parseStatus(value: FormDataEntryValue | null): UserStatus {
  return value === "DISABLED" ? "DISABLED" : "ACTIVE";
}

export async function updateUserAccessAction(formData: FormData) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    redirect("/login?next=/admin/users");
  }

  const userId = String(formData.get("userId") || "");
  const role = parseRole(formData.get("role"));
  const status = parseStatus(formData.get("status"));

  if (!userId) {
    return;
  }

  if (userId === currentUser.id && (role !== "ADMIN" || status !== "ACTIVE")) {
    return;
  }

  await updateUserAccess({ userId, role, status });
  revalidatePath("/admin/users");
  revalidatePath("/admin");
}
