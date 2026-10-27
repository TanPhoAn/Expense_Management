"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, RegisterInput } from "@/lib/validations/auth.schema";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error?.message || "Đăng ký thất bại.");
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
    <Card className="shadow-lg border-slate-200 dark:border-slate-800">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-bold">Đăng ký tài khoản</CardTitle>
        <CardDescription>Bắt đầu quản lý tài chính cá nhân một cách có hệ thống</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {errorMsg && (
            <div className="p-3 text-xs font-medium rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
              {errorMsg}
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="name">Họ và tên</Label>
            <Input id="name" placeholder="Nguyễn Văn A" {...register("name")} />
            {errors.name && <p className="text-xs text-rose-600">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="tenban@example.com"
              autoComplete="email"
              {...register("email")}
            />
            {errors.email && <p className="text-xs text-rose-600">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="password">Mật khẩu (ít nhất 6 ký tự)</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              {...register("password")}
            />
            {errors.password && <p className="text-xs text-rose-600">{errors.password.message}</p>}
          </div>

          <Button type="submit" className="w-full mt-2" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang tạo tài khoản...
              </>
            ) : (
              "Tạo tài khoản"
            )}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center border-t py-4 text-xs text-muted-foreground">
        Đã có tài khoản?{" "}
        <Link href="/login" className="ml-1 font-semibold text-primary hover:underline">
          Đăng nhập
        </Link>
      </CardFooter>
    </Card>
  );
}
