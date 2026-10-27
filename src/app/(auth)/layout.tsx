import React from "react";
import Link from "next/link";
import { Wallet } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="mb-6 flex items-center gap-2">
        <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-md">
          <Wallet className="w-6 h-6" />
        </div>
        <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          PocketFlow
        </span>
      </div>
      <div className="w-full max-w-md">{children}</div>
      <div className="mt-8 text-center text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} PocketFlow. Quản lý chi tiêu cá nhân thông minh.
      </div>
    </div>
  );
}
