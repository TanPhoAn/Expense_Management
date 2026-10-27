"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePasswordSchema, ChangePasswordInput } from "@/lib/validations/auth.schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound, CheckCircle2 } from "lucide-react";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const handleClose = () => {
    reset();
    setErrorMsg(null);
    setSuccessMsg(null);
    onClose();
  };

  const onSubmit = async (data: ChangePasswordInput) => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/v1/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error?.message || "Đổi mật khẩu thất bại.");
        setIsLoading(false);
        return;
      }

      setSuccessMsg(json.data?.message || "Đổi mật khẩu thành công!");
      setIsLoading(false);
      reset();

      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch {
      setErrorMsg("Lỗi kết nối máy chủ. Vui lòng thử lại sau.");
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <DialogTitle>Đổi mật khẩu</DialogTitle>
          </div>
          <DialogDescription>
            Cập nhật mật khẩu mới cho tài khoản PocketFlow của bạn.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {errorMsg && (
            <div className="p-3 text-xs font-medium rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
            <Input
              id="currentPassword"
              type="password"
              placeholder="••••••••"
              disabled={isLoading || !!successMsg}
              {...register("currentPassword")}
            />
            {errors.currentPassword && (
              <p className="text-xs text-rose-600">{errors.currentPassword.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="modalNewPassword">Mật khẩu mới</Label>
            <Input
              id="modalNewPassword"
              type="password"
              placeholder="Ít nhất 6 ký tự"
              disabled={isLoading || !!successMsg}
              {...register("newPassword")}
            />
            {errors.newPassword && (
              <p className="text-xs text-rose-600">{errors.newPassword.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="modalConfirmPassword">Xác nhận mật khẩu mới</Label>
            <Input
              id="modalConfirmPassword"
              type="password"
              placeholder="Nhập lại mật khẩu mới"
              disabled={isLoading || !!successMsg}
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-xs text-rose-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Hủy
            </Button>
            <Button type="submit" disabled={isLoading || !!successMsg}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                "Cập nhật mật khẩu"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
