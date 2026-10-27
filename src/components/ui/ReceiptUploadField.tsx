"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { compressImageClient } from "@/lib/utils/image";
import { Camera, Image as ImageIcon, Trash2, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";

interface ReceiptUploadFieldProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  onPreview?: (url: string) => void;
  disabled?: boolean;
}

export function ReceiptUploadField({
  value,
  onChange,
  onPreview,
  disabled = false,
}: ReceiptUploadFieldProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so re-selecting same file triggers change
    e.target.value = "";

    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn tệp hình ảnh (JPG, PNG, WebP).");
      return;
    }

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

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {value ? (
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
      ) : (
        <div
          onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
          className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer text-xs text-muted-foreground ${
            isUploading ? "opacity-60 cursor-not-allowed" : ""
          }`}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span>Đang nén & tải ảnh lên Cloudinary...</span>
            </>
          ) : (
            <>
              <Camera className="w-4 h-4 text-primary" />
              <span>Nhấn để chọn ảnh chụp hóa đơn / biên lai</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
