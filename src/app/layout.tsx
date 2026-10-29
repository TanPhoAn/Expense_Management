import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";
import { InstallPwaBanner } from "@/components/pwa/InstallPwaBanner";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "PocketFlow — Quản lý chi tiêu cá nhân thông minh",
  description: "Theo dõi thu chi, phân bổ ngân sách và báo cáo tài chính cá nhân chuẩn xác theo giờ Việt Nam.",
  applicationName: "PocketFlow",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PocketFlow",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="font-sans min-h-screen antialiased bg-slate-50 dark:bg-slate-950">
        {children}
        <InstallPwaBanner />
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
