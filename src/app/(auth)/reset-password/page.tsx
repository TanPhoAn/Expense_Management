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
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";

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
    <Card className="shadow-lg border-slate-200 dark:border-slate-800">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-bold">Đặt lại mật khẩu mới</CardTitle>
        <CardDescription>
          Nhập mã OTP 6 số đã được gửi qua email và thiết lập mật khẩu mới
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {errorMsg && (
            <div className="p-3 text-xs font-medium rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg} Đang chuyển đến Đăng nhập...</span>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="tenban@example.com"
              disabled={isLoading || !!successMsg}
              {...register("email")}
            />
            {errors.email && <p className="text-xs text-rose-600">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="code">Mã xác thực OTP (6 chữ số)</Label>
            <Input
              id="code"
              type="text"
              maxLength={6}
              placeholder="123456"
              className="tracking-widest font-mono text-center text-lg"
              disabled={isLoading || !!successMsg}
              {...register("code")}
            />
            {errors.code && <p className="text-xs text-rose-600">{errors.code.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="newPassword">Mật khẩu mới</Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="Ít nhất 6 ký tự"
              disabled={isLoading || !!successMsg}
              {...register("newPassword")}
            />
            {errors.newPassword && <p className="text-xs text-rose-600">{errors.newPassword.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Nhập lại mật khẩu mới"
              disabled={isLoading || !!successMsg}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-rose-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full mt-2" disabled={isLoading || !!successMsg}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              "Xác nhận đặt lại mật khẩu"
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between border-t py-4 text-xs text-muted-foreground">
        <Link href="/forgot-password" className="text-muted-foreground hover:underline">
          Gửi lại mã OTP?
        </Link>
        <Link href="/login" className="flex items-center gap-1 font-semibold text-primary hover:underline">
          <ArrowLeft className="w-3.5 h-3.5" />
          Đăng nhập
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-sm text-muted-foreground">
          Đang tải trang đặt lại mật khẩu...
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
