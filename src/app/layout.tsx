import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { PageViewTracker } from "@/components/activity/PageViewTracker";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "فیلیمچی",
  description: "وب اپلیکیشن فارسی پخش فیلم و سریال",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get("x-pathname") || "";
  const isAdmin = pathname.startsWith("/admin");

  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {isAdmin ? (
          children
        ) : (
          <>
            <Header />
            <main>{children}</main>
            <Footer />
            <Suspense fallback={null}><PageViewTracker /></Suspense>
          </>
        )}
      </body>
    </html>
  );
}
