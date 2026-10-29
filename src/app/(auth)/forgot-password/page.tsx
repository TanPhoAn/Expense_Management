"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, ForgotPasswordInput } from "@/lib/validations/auth.schema";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft, MailCheck, Send } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error?.message || "Không thể gửi yêu cầu đặt lại mật khẩu.");
        setIsLoading(false);
        return;
      }

      setSuccessMsg(json.data?.message || "Đã gửi mã xác nhận thành công!");
      setIsLoading(false);

      // Navigate to reset password page with email prefilled
      setTimeout(() => {
        router.push(`/reset-password?email=${encodeURIComponent(data.email)}`);
      }, 1500);
    } catch {
      setErrorMsg("Lỗi kết nối máy chủ. Vui lòng thử lại sau.");
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-xl border-border/80 bg-card/80 backdrop-blur-md rounded-2xl">
      <CardHeader className="space-y-1.5 pb-4">
        <CardTitle className="text-xl font-bold tracking-tight">Quên mật khẩu</CardTitle>
        <CardDescription className="text-xs">
          Nhập địa chỉ email đã đăng ký để nhận mã OTP khôi phục quyền truy cập
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
              <MailCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{successMsg} Đang chuyển trang...</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold">Email tài khoản</Label>
            <Input
              id="email"
              type="email"
              placeholder="tenban@example.com"
              autoComplete="email"
              inputMode="email"
              disabled={isLoading || !!successMsg}
              className="text-base sm:text-xs"
              {...register("email")}
            />
            {errors.email && <p className="text-xs text-rose-600 dark:text-rose-400">{errors.email.message}</p>}
          </div>

          <Button
            type="submit"
            className="w-full mt-2 font-semibold shadow-xs gap-1.5"
            disabled={isLoading || !!successMsg}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang gửi mã OTP...</span>
              </>
            ) : (
              <>
                <span>Gửi mã xác nhận</span>
                <Send className="w-3.5 h-3.5" />
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
