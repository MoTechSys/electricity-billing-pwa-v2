import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

const BP = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
  title: "نظام فواتير الكهرباء",
  description: "نظام إدارة فواتير استهلاك الكهرباء - تطبيق ويب تقدمي PWA",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "فواتير الكهرباء",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#1e40af",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="icon" href={`${BP}/icons/icon-192.png`} />
        <link rel="apple-touch-icon" href={`${BP}/icons/icon-192.png`} />
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased overflow-x-hidden">
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
