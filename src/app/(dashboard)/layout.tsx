"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Wallet,
  LayoutDashboard,
  ReceiptText,
  Tags,
  PlusCircle,
  LogOut,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuickAddModal } from "@/features/transactions/components/QuickAddModal";
import { ChangePasswordModal } from "@/features/auth/components/ChangePasswordModal";
import { FloatingAIChatbot } from "@/features/ai/components/FloatingAIChatbot";
import { Category, User } from "@/types";
import { formatVNDate, getVietnamTodayString } from "@/lib/utils/date";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/categories");
      if (res.ok) {
        const json = await res.json();
        setCategories(json.data || []);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/auth/me");
      if (res.ok) {
        const json = await res.json();
        setCurrentUser(json.data?.user || null);
      } else if (res.status === 401) {
        router.push("/login");
      }
    } catch {
      // ignore
    }
  }, [router]);

  useEffect(() => {
    fetchUser();
    fetchCategories();
  }, [fetchUser, fetchCategories]);

  const handleLogout = async () => {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  const navItems = [
    { label: "Tổng quan", href: "/", icon: LayoutDashboard },
    { label: "Giao dịch", href: "/transactions", icon: ReceiptText },
    { label: "Danh mục", href: "/categories", icon: Tags },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-safe">
        <div className="container max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          {/* Logo & Navigation */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg">
              <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shadow">
                <Wallet className="w-5 h-5" />
              </div>
              <span className="tracking-tight hidden sm:inline-block">PocketFlow</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Quick Add Button, Vietnam Date Display & User Profile */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center text-xs font-medium text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full">
              Hôm nay: {formatVNDate(getVietnamTodayString(), "short")} (Asia/Ho_Chi_Minh)
            </div>

            <Button
              onClick={() => setIsQuickAddOpen(true)}
              size="sm"
              className="gap-1.5 shadow font-semibold bg-primary hover:bg-primary/90"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Ghi chép mới</span>
              <span className="sm:hidden">Thêm</span>
            </Button>

            {currentUser && (
              <div className="flex items-center gap-2 pl-2 border-l border-border">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-semibold">{currentUser.name || "Người dùng"}</span>
                  <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                    {currentUser.email}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsChangePasswordOpen(true)}
                  title="Đổi mật khẩu"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <KeyRound className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  title="Đăng xuất"
                  className="text-muted-foreground hover:text-rose-600"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content View */}
      <main className="flex-1 container max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur border-t flex justify-around items-center h-[calc(4rem+env(safe-area-inset-bottom,0px))] pb-safe px-2 shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-[11px] font-medium transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Global Quick Add Transaction Modal */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        categories={categories}
        onTransactionCreated={() => {
          router.refresh();
          // Dispatch custom event so active pages refresh seamlessly
          window.dispatchEvent(new Event("pocketflow:transaction-created"));
        }}
      />

      {/* Global Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />

      {/* Floating AI Chatbot Assistant */}
      <FloatingAIChatbot />
    </div>
  );
}
