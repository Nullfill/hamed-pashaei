"use client";

import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { PageViewTracker } from "@/components/activity/PageViewTracker";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
