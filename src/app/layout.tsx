import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

export const metadata: Metadata = {
  title: "شب نمایش",
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
          </>
        )}
      </body>
    </html>
  );
}
