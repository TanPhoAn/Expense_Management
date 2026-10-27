import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "PocketFlow — Quản lý chi tiêu cá nhân thông minh",
  description: "Theo dõi thu chi, phân bổ ngân sách và báo cáo tài chính cá nhân chuẩn xác theo giờ Việt Nam.",
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
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
