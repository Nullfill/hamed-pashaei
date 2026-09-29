import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { NavigationFeedback } from "@/components/layout/NavigationFeedback";
import { PwaRegister } from "@/components/layout/PwaRegister";
import { PageViewTracker } from "@/components/activity/PageViewTracker";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "فیلمچی",
  description: "وب اپلیکیشن فارسی پخش فیلم و سریال",
  applicationName: "فیلمچی",
  appleWebApp: {
    capable: true,
    title: "فیلمچی",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#08080d",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get("x-pathname") || "";
  const isAdmin = pathname.startsWith("/admin");

  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <PwaRegister />
        {isAdmin ? (
          children
        ) : (
          <>
            <Header />
            <NavigationFeedback />
            <main className="app-main">{children}</main>
            <Footer />
            <BottomNavigation />
            <Suspense fallback={null}><PageViewTracker /></Suspense>
          </>
        )}
      </body>
    </html>
  );
}
