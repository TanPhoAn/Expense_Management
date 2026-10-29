"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginInput } from "@/lib/validations/auth.schema";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/features/auth/components/PasswordInput";
import { Loader2, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error?.message || "Đăng nhập thất bại.");
        setIsLoading(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setErrorMsg("Lỗi kết nối máy chủ. Vui lòng thử lại sau.");
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-xl border-border/80 bg-card/80 backdrop-blur-md rounded-2xl">
      <CardHeader className="space-y-1.5 pb-4">
        <CardTitle className="text-xl font-bold tracking-tight">Đăng nhập tài khoản</CardTitle>
        <CardDescription className="text-xs">
          Nhập thông tin xác thực để truy cập bảng điều khiển PocketFlow
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {errorMsg && (
            <div className="p-3 text-xs font-medium rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 animate-in fade-in-0 duration-200">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="tenban@example.com"
              autoComplete="email"
              inputMode="email"
              className="text-base sm:text-xs"
              {...register("email")}
            />
            {errors.email && <p className="text-xs text-rose-600 dark:text-rose-400">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-semibold">Mật khẩu</Label>
              <Link
                href="/forgot-password"
                className="text-[11px] text-primary hover:underline font-medium"
              >
                Quên mật khẩu?
              </Link>
            </div>
            <PasswordInput
              id="password"
              placeholder="••••••••"
              autoComplete="current-password"
              {...register("password")}
            />
            {errors.password && <p className="text-xs text-rose-600 dark:text-rose-400">{errors.password.message}</p>}
          </div>

          <Button type="submit" className="w-full mt-2 font-semibold shadow-xs gap-1.5" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <span>Đăng nhập</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center border-t border-border/50 pt-4 pb-4">
        <p className="text-xs text-muted-foreground">
          Chưa có tài khoản?{" "}
          <Link href="/register" className="text-primary hover:underline font-semibold">
            Đăng ký ngay
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
