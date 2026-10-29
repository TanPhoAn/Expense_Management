import React from "react";
import Link from "next/link";
import { Wallet, Sparkles } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-background to-background text-foreground relative overflow-hidden">
      {/* Subtle Ambient Decorative Circles */}
      <div className="absolute top-1/4 -left-32 w-80 h-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="mb-6 flex flex-col items-center gap-2 text-center relative z-10">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-primary via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
            <Wallet className="w-6 h-6" />
          </div>
          <span className="text-2xl font-black tracking-tight text-foreground">
            PocketFlow
          </span>
        </Link>
        <p className="text-xs text-muted-foreground font-medium">
          Quản lý tài chính cá nhân thông minh & Trực quan
        </p>
      </div>

      {/* Card Form Container */}
      <div className="w-full max-w-md relative z-10">{children}</div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-muted-foreground relative z-10">
        &copy; {new Date().getFullYear()} PocketFlow. Bảo mật & Tiện lợi.
      </div>
    </div>
  );
}
