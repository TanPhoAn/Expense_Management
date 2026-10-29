"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema, ResetPasswordInput } from "@/lib/validations/auth.schema";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/features/auth/components/PasswordInput";
import { PasswordStrengthMeter } from "@/features/auth/components/PasswordStrengthMeter";
import { Loader2, ArrowLeft, CheckCircle2, KeyRound } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: initialEmail,
      code: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const watchedNewPassword = watch("newPassword");

  const onSubmit = async (data: ResetPasswordInput) => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error?.message || "Đặt lại mật khẩu thất bại.");
        setIsLoading(false);
        return;
      }

      setSuccessMsg(json.data?.message || "Đặt lại mật khẩu thành công!");
      setIsLoading(false);

      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch {
      setErrorMsg("Lỗi kết nối máy chủ. Vui lòng thử lại sau.");
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-xl border-border/80 bg-card/80 backdrop-blur-md rounded-2xl">
      <CardHeader className="space-y-1.5 pb-4">
        <CardTitle className="text-xl font-bold tracking-tight">Đặt lại mật khẩu mới</CardTitle>
        <CardDescription className="text-xs">
          Nhập mã OTP 6 số đã được gửi qua email và thiết lập mật khẩu mới
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {errorMsg && (
            <div className="p-3 text-xs font-medium rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 animate-in fade-in-0 duration-200">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 text-xs font-medium rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 flex items-center gap-2 animate-in fade-in-0 duration-200">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{successMsg} Đang chuyển đến Đăng nhập...</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold">Email tài khoản</Label>
            <Input
              id="email"
              type="email"
              placeholder="tenban@example.com"
              disabled={isLoading || !!successMsg}
              className="text-base sm:text-xs"
              {...register("email")}
            />
            {errors.email && <p className="text-xs text-rose-600 dark:text-rose-400">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="code" className="text-xs font-semibold">Mã xác thực (OTP 6 số)</Label>
            <Input
              id="code"
              placeholder="123456"
              maxLength={6}
              inputMode="numeric"
              pattern="[0-9]*"
              className="tracking-widest font-mono text-center text-lg sm:text-base font-bold"
              disabled={isLoading || !!successMsg}
              {...register("code")}
            />
            {errors.code && <p className="text-xs text-rose-600 dark:text-rose-400">{errors.code.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="newPassword" className="text-xs font-semibold">
              Mật khẩu mới (tối thiểu 6 ký tự)
            </Label>
            <PasswordInput
              id="newPassword"
              placeholder="••••••••"
              disabled={isLoading || !!successMsg}
              {...register("newPassword")}
            />
            {errors.newPassword && (
              <p className="text-xs text-rose-600 dark:text-rose-400">{errors.newPassword.message}</p>
            )}

            {/* Real-time Password Strength Meter */}
            <PasswordStrengthMeter password={watchedNewPassword} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-xs font-semibold">Xác nhận mật khẩu mới</Label>
            <PasswordInput
              id="confirmPassword"
              placeholder="••••••••"
              disabled={isLoading || !!successMsg}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-rose-600 dark:text-rose-400">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full mt-2 font-semibold shadow-xs gap-1.5"
            disabled={isLoading || !!successMsg}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <span>Xác nhận đổi mật khẩu</span>
                <KeyRound className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center border-t border-border/50 pt-4 pb-4">
        <Link
          href="/login"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại trang Đăng nhập</span>
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <Card className="p-8 text-center text-sm text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
          Đang tải trang đặt lại mật khẩu...
        </Card>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
