"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { setProviderProxyEnabled } from "@/lib/http/providerProxy";

export async function updateProviderProxyAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/login?next=/admin/providers");
  await setProviderProxyEnabled(formData.get("enabled") === "1");
  revalidatePath("/admin/providers");
}
