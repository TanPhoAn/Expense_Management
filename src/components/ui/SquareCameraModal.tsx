"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, SwitchCamera, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const EXPENSE_QUOTES = [
  "ròi nghèo lun ròi 💸",
  "ví lại thủng một lỗ to ròi 🥲",
  "lại tiêu tiền vào những thứ vô tri hả 😭",
  "tháng này ăn mì tôm trừ bữa 🍜",
  "tiền đi như một cơn gió 🍃",
  "nhìn cái bill mà nhói trong tim 💔",
];

const INCOME_QUOTES = [
  "ting ting lúa về lúa về! 🤑",
  "đại gia hôm nay bao cả xóm 🎉",
  "giàu sang phú quý ập đến rồi ✨",
  "ví dày cộm cộm thích ghê 💵",
  "chăm chỉ cày cuốc có ngày nở hoa 🌸",
];

interface SquareCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  type?: "INCOME" | "EXPENSE";
}

export function SquareCameraModal({
  isOpen,
  onClose,
  onCapture,
  type = "EXPENSE",
}: SquareCameraModalProps) {
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [isLoadingCamera, setIsLoadingCamera] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [quote, setQuote] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Pick random quote on open
  useEffect(() => {
    if (isOpen) {
      const list = type === "INCOME" ? INCOME_QUOTES : EXPENSE_QUOTES;
      const randomQuote = list[Math.floor(Math.random() * list.length)];
      setQuote(randomQuote);
    }
  }, [isOpen, type]);

  // Clean up media stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Start media stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setIsLoadingCamera(true);
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
        throw new Error("Trình duyệt không hỗ trợ truy cập máy ảnh trực tiếp.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1920 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(console.error);
          setIsLoadingCamera(false);
        };
      }
    } catch (err: unknown) {
      console.error("Camera access error:", err);
      const msg =
        err instanceof Error && err.name === "NotAllowedError"
          ? "Bạn đã từ chối quyền truy cập máy ảnh. Vui lòng cấp quyền trong cài đặt trình duyệt."
          : "Không thể kết nối đến máy ảnh thiết bị.";
      setCameraError(msg);
      setIsLoadingCamera(false);
      toast.error(msg);
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Handle Switch Camera
  const handleToggleCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Capture square frame
  const handleCapture = () => {
    if (!videoRef.current || isLoadingCamera) return;

    const video = videoRef.current;
    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;

    // Trigger shutter flash effect
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 160);

    // Compute center square
    const size = Math.min(videoWidth, videoHeight);
    const sx = (videoWidth - size) / 2;
    const sy = (videoHeight - size) / 2;

    const canvas = document.createElement("canvas");
    const targetSize = 1080;
    canvas.width = targetSize;
    canvas.height = targetSize;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // If front camera, flip horizontally for mirror preview match
    if (facingMode === "user") {
      ctx.translate(targetSize, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, sx, sy, size, size, 0, 0, targetSize, targetSize);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error("Lỗi khi xử lý ảnh.");
          return;
        }

        const file = new File([blob], `receipt_${Date.now()}.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });

        stopCamera();
        onCapture(file);
        onClose();
      },
      "image/jpeg",
      0.85
    );
  };

  if (!isOpen) return null;

  const isIncome = type === "INCOME";

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 sm:p-6 select-none animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between z-10 pt-safe">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white/80 hover:text-white hover:bg-white/10 rounded-full w-10 h-10"
        >
          <X className="w-6 h-6" />
        </Button>

        <span className="text-xs font-semibold uppercase tracking-wider text-white/70">
          Chụp ảnh hóa đơn
        </span>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleToggleCamera}
          disabled={isLoadingCamera || !!cameraError}
          className="text-white/80 hover:text-white hover:bg-white/10 rounded-full w-10 h-10"
          title="Đổi camera trước/sau"
        >
          <SwitchCamera className="w-5 h-5" />
        </Button>
      </div>

      {/* Central 1:1 Square Viewfinder */}
      <div className="relative w-full max-w-[340px] sm:max-w-[380px] aspect-square mx-auto rounded-3xl overflow-hidden border border-white/20 shadow-2xl bg-slate-900 flex items-center justify-center">
        {/* Live video feed */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            facingMode === "user" ? "scale-x-[-1]" : ""
          } ${isLoadingCamera ? "opacity-0" : "opacity-100"}`}
        />

        {/* Loading Indicator */}
        {isLoadingCamera && !cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/70">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="text-xs font-medium">Đang khởi động camera...</span>
          </div>
        )}

        {/* Error Fallback Notice */}
        {cameraError && (
          <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center gap-3 bg-slate-950 text-white">
            <AlertCircle className="w-10 h-10 text-rose-500" />
            <p className="text-xs text-slate-300 leading-relaxed">{cameraError}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={startCamera}
              className="text-xs text-white border-white/20 hover:bg-white/10"
            >
              Thử lại
            </Button>
          </div>
        )}

        {/* 4 Luminous Framing Corner Guides */}
        {!isLoadingCamera && !cameraError && (
          <div className="absolute inset-3 pointer-events-none">
            {/* Top-Left Corner */}
            <div
              className={`absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 rounded-tl-xl ${
                isIncome ? "border-emerald-400" : "border-rose-400"
              }`}
            />
            {/* Top-Right Corner */}
            <div
              className={`absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 rounded-tr-xl ${
                isIncome ? "border-emerald-400" : "border-rose-400"
              }`}
            />
            {/* Bottom-Left Corner */}
            <div
              className={`absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 rounded-bl-xl ${
                isIncome ? "border-emerald-400" : "border-rose-400"
              }`}
            />
            {/* Bottom-Right Corner */}
            <div
              className={`absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 rounded-br-xl ${
                isIncome ? "border-emerald-400" : "border-rose-400"
              }`}
            />
          </div>
        )}

        {/* White Shutter Flash overlay */}
        {isFlashing && (
          <div className="absolute inset-0 bg-white opacity-90 transition-opacity duration-150 pointer-events-none" />
        )}
      </div>

      {/* Dynamic Humorous Quote Bar (Directly below square viewfinder) */}
      <div className="w-full max-w-sm mx-auto text-center px-4 my-2">
        <div
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold backdrop-blur-md border shadow-lg transition-all ${
            isIncome
              ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
              : "bg-rose-950/80 border-rose-500/40 text-rose-300"
          }`}
        >
          <span>{quote}</span>
        </div>
      </div>

      {/* Bottom Shutter Controls */}
      <div className="w-full max-w-md mx-auto flex items-center justify-center pb-safe pt-2">
        <button
          type="button"
          onClick={handleCapture}
          disabled={isLoadingCamera || !!cameraError}
          className={`group relative w-20 h-20 rounded-full border-4 flex items-center justify-center p-1.5 transition-transform active:scale-90 disabled:opacity-50 disabled:pointer-events-none ${
            isIncome
              ? "border-emerald-500 bg-emerald-500/20"
              : "border-rose-500 bg-rose-500/20"
          }`}
          title="Bấm để chụp ảnh vuông"
        >
          <div className="w-full h-full bg-white rounded-full shadow-inner transition-transform group-hover:scale-95" />
        </button>
      </div>
    </div>
  );
}
