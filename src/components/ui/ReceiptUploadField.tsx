"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { compressImageClient } from "@/lib/utils/image";
import { Camera, Image as ImageIcon, Trash2, Loader2, Eye } from "lucide-react";
import { SquareCameraModal, CameraCaptureConfirmData } from "@/components/ui/SquareCameraModal";
import { toast } from "sonner";

interface ReceiptUploadFieldProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  onPreview?: (url: string) => void;
  disabled?: boolean;
  type?: "INCOME" | "EXPENSE";
  onQuickFill?: (data: { amount?: number; description?: string; date?: string }) => void;
  initialAmount?: number;
  initialDescription?: string;
}

export function ReceiptUploadField({
  value,
  onChange,
  onPreview,
  disabled = false,
  type = "EXPENSE",
  onQuickFill,
  initialAmount,
  initialDescription,
}: ReceiptUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  // Separate refs for regular file picker vs native fallback camera capture
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Detect mobile platform (user-agent + touch capability)
  useEffect(() => {
    const detectMobile = () => {
      if (typeof window === "undefined") return;
      const ua = window.navigator.userAgent;
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      setIsMobileDevice(isMobileUA || (hasTouch && window.innerWidth < 768));
    };

    detectMobile();
    window.addEventListener("resize", detectMobile);
    return () => window.removeEventListener("resize", detectMobile);
  }, []);

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    try {
      // 1. Client-side compression to JPEG under ~300KB
      const compressedFile = await compressImageClient(file, 1280, 0.82);

      // 2. Upload to Cloudinary route handler
      const formData = new FormData();
      formData.append("file", compressedFile);

      const res = await fetch("/api/v1/upload/receipt", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message || "Không thể tải ảnh lên máy chủ.");
        return;
      }

      const uploadedUrl = json.data?.url;
      if (uploadedUrl) {
        onChange(uploadedUrl);
        toast.success("Đã đính kèm ảnh hóa đơn thành công!");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Lỗi khi tải ảnh lên. Vui lòng thử lại.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so selecting the same file again triggers onChange
    e.target.value = "";

    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn tệp hình ảnh (JPG, PNG, WebP).");
      return;
    }

    await uploadFile(file);
  };

  const handleOpenCapture = () => {
    if (disabled || isUploading) return;
    const hasCameraApi =
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function";

    if (hasCameraApi) {
      setIsCameraModalOpen(true);
    } else {
      cameraInputRef.current?.click();
    }
  };

  const handleCameraConfirm = async (data: CameraCaptureConfirmData) => {
    // 1. Pre-fill transaction fields in parent form
    if (onQuickFill) {
      onQuickFill({
        amount: data.amount,
        description: data.description,
        date: data.date,
      });
    }

    // 2. Upload receipt to Cloudinary
    await uploadFile(data.file);
  };

  const handleRemove = () => {
    onChange(null);
    toast.info("Đã gỡ ảnh hóa đơn.");
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground flex items-center justify-between">
        <span>Hóa đơn / Ảnh chứng từ (Tùy chọn)</span>
        <span className="text-[10px] text-muted-foreground">Tự động nén JPG</span>
      </Label>

      {/* Hidden input for regular file / gallery picking */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {/* Hidden input fallback for direct mobile camera capture */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {value ? (
        /* Attached Receipt Preview Box */
        <div className="flex items-center justify-between p-2 rounded-lg border bg-muted/40 gap-3">
          <div className="flex items-center gap-2.5 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Receipt preview"
              className="w-10 h-10 rounded-md object-cover border shrink-0 bg-background"
            />
            <div className="truncate text-xs">
              <p className="font-medium text-foreground truncate">Hóa đơn đã đính kèm</p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                Đã lưu trên Cloudinary
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {onPreview && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onPreview(value)}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                title="Xem phóng to ảnh"
              >
                <Eye className="w-4 h-4" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={disabled || isUploading}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
              title="Xóa hóa đơn"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : isUploading ? (
        /* Uploading state with spinner */
        <div className="flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 text-xs text-primary font-medium">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Đang nén & tải ảnh lên Cloudinary...</span>
        </div>
      ) : (
        <>
          {/* MOBILE VIEW (shown on mobile devices or screens < sm): 2 distinct touch-friendly action buttons */}
          <div className={isMobileDevice ? "grid grid-cols-2 gap-2" : "grid grid-cols-2 gap-2 sm:hidden"}>
            {/* Button 1: Chụp ảnh trực tiếp với camera vuông tùy chỉnh */}
            <Button
              type="button"
              variant="outline"
              disabled={disabled || isUploading}
              onClick={handleOpenCapture}
              className="h-11 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 font-semibold text-xs transition-all active:scale-95"
            >
              <Camera className="w-4 h-4 text-primary shrink-0" />
              <span>Chụp ảnh</span>
            </Button>

            {/* Button 2: Chọn từ bộ sưu tập ảnh máy */}
            <Button
              type="button"
              variant="outline"
              disabled={disabled || isUploading}
              onClick={() => galleryInputRef.current?.click()}
              className="h-11 flex items-center justify-center gap-2 rounded-lg border border-border bg-background hover:bg-muted/50 text-foreground text-xs font-medium transition-all active:scale-95"
            >
              <ImageIcon className="w-4 h-4 text-muted-foreground shrink-0" />
              <span>Thư viện ảnh</span>
            </Button>
          </div>

          {/* DESKTOP VIEW: Standard file picker upload dropzone (No camera option) */}
          <div
            onClick={() => !disabled && !isUploading && galleryInputRef.current?.click()}
            className={
              isMobileDevice
                ? "hidden"
                : "hidden sm:flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer text-xs text-muted-foreground"
            }
          >
            <ImageIcon className="w-4 h-4 text-primary" />
            <span>Nhấn để chọn ảnh chứng từ / hóa đơn từ máy</span>
          </div>
        </>
      )}

      {/* Custom In-App Square Camera Viewfinder Modal with Post-Capture Review */}
      <SquareCameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onConfirm={handleCameraConfirm}
        type={type}
        initialAmount={initialAmount}
        initialDescription={initialDescription}
      />
    </div>
  );
}
