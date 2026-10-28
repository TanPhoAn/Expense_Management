"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { X, SwitchCamera, Loader2, AlertCircle, Check, Calendar } from "lucide-react";
import { formatNumberVN, sanitizeCurrencyInput } from "@/lib/utils/currency";
import { getVietnamTodayString, formatVNDate } from "@/lib/utils/date";
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

export interface CameraCaptureConfirmData {
  file: File;
  amount?: number;
  description?: string;
  date: string;
}

interface SquareCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: CameraCaptureConfirmData) => Promise<void> | void;
  type?: "INCOME" | "EXPENSE";
  initialAmount?: number;
  initialDescription?: string;
}

/**
 * Convert a base64 data URL to a File object.
 * Uses synchronous atob + Uint8Array with fallback for iOS Safari.
 */
function dataURLtoFile(dataURL: string, filename: string): File {
  const [header, base64Data] = dataURL.split(",");
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  try {
    return new File([bytes], filename, { type: mime, lastModified: Date.now() });
  } catch {
    // Fallback for Safari iOS where File constructor may throw
    const blob = new Blob([bytes], { type: mime });
    return Object.assign(blob, {
      name: filename,
      lastModified: Date.now(),
    }) as File;
  }
}

export function SquareCameraModal({
  isOpen,
  onClose,
  onConfirm,
  type = "EXPENSE",
  initialAmount,
  initialDescription,
}: SquareCameraModalProps) {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<"CAMERA" | "REVIEW">("CAMERA");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [isLoadingCamera, setIsLoadingCamera] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [quote, setQuote] = useState("");

  // Review state
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState<string>("");
  const [descriptionInput, setDescriptionInput] = useState<string>("");
  const [transactionDate] = useState<string>(getVietnamTodayString());
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // SSR-safe mounting check for React Portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Mark camera ready helper
  const markCameraReady = useCallback(() => {
    setIsLoadingCamera(false);
  }, []);

  // Clean up media stream
  const stopCamera = useCallback(() => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {
            // Silently ignore errors stopping individual tracks
          }
        });
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    } catch {
      // Guard against any unexpected errors during cleanup
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
          markCameraReady();
        };
        videoRef.current.oncanplay = markCameraReady;
        videoRef.current.onplaying = markCameraReady;
        videoRef.current.play().catch(console.error);

        // Safety fallback timer: ensure camera ready state is never stuck
        setTimeout(() => {
          if (streamRef.current?.active) {
            markCameraReady();
          }
        }, 500);
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
  }, [facingMode, stopCamera, markCameraReady]);

  // Handle modal open/close lifecycle
  useEffect(() => {
    if (isOpen) {
      setMode("CAMERA");
      setCapturedFile(null);
      setCapturedPreviewUrl(null);
      setAmountInput(initialAmount ? String(initialAmount) : "");
      setDescriptionInput(initialDescription || "");
      setIsSubmitting(false);

      const list = type === "INCOME" ? INCOME_QUOTES : EXPENSE_QUOTES;
      setQuote(list[Math.floor(Math.random() * list.length)]);

      startCamera();
    } else {
      stopCamera();
      setCapturedFile(null);
      setCapturedPreviewUrl(null);
    }

    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Restart camera when switching front/back facingMode (only in CAMERA mode)
  useEffect(() => {
    if (isOpen && mode === "CAMERA") {
      startCamera();
    }
  }, [facingMode, isOpen, mode, startCamera]);

  // Handle Switch Camera
  const handleToggleCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Close modal safely
  const handleClose = () => {
    stopCamera();
    onClose();
  };

  // Capture square frame and transition to REVIEW mode
  const handleCapture = () => {
    if (isLoadingCamera) {
      toast.info("Đang khởi động camera, xin chờ giây lát...");
      return;
    }

    if (!videoRef.current) {
      toast.error("Không tìm thấy hình ảnh từ camera.");
      return;
    }

    const video = videoRef.current;
    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;

    // Trigger shutter flash effect
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 160);

    try {
      // Compute center square crop
      const size = Math.min(videoWidth, videoHeight);
      const sx = (videoWidth - size) / 2;
      const sy = (videoHeight - size) / 2;

      const canvas = document.createElement("canvas");
      const targetSize = 1080;
      canvas.width = targetSize;
      canvas.height = targetSize;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        toast.error("Trình duyệt không hỗ trợ xử lý ảnh Canvas.");
        return;
      }

      // If front camera, flip horizontally for mirror preview match
      if (facingMode === "user") {
        ctx.translate(targetSize, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, sx, sy, size, size, 0, 0, targetSize, targetSize);

      // Use toDataURL (synchronous, reliable on iOS Safari)
      const dataURL = canvas.toDataURL("image/jpeg", 0.85);

      if (!dataURL || dataURL === "data:,") {
        toast.error("Không thể chụp ảnh. Vui lòng thử lại.");
        return;
      }

      const file = dataURLtoFile(dataURL, `receipt_${Date.now()}.jpg`);
      const previewUrl = dataURL;

      setCapturedFile(file);
      setCapturedPreviewUrl(previewUrl);

      // Pause video to freeze feed without unbinding stream tracks prematurely
      video.pause();

      // Switch to REVIEW mode
      setMode("REVIEW");
    } catch (err) {
      console.error("Capture error:", err);
      toast.error("Lỗi khi chụp ảnh. Vui lòng thử lại.");
    }
  };

  // Retake photo: discard preview and resume live camera
  const handleRetake = () => {
    setCapturedFile(null);
    setCapturedPreviewUrl(null);
    setMode("CAMERA");
    if (videoRef.current) {
      videoRef.current.play().catch(console.error);
    }
  };

  // Confirm photo and quick-fill inputs
  const handleConfirm = async () => {
    if (!capturedFile) return;

    setIsSubmitting(true);
    try {
      const parsedAmount = amountInput ? parseInt(amountInput, 10) : undefined;
      await onConfirm({
        file: capturedFile,
        amount: parsedAmount && !isNaN(parsedAmount) ? parsedAmount : undefined,
        description: descriptionInput.trim() || undefined,
        date: transactionDate,
      });

      stopCamera();
      onClose();
    } catch (err) {
      console.error("Confirm error:", err);
      toast.error("Có lỗi xảy ra khi xác nhận hóa đơn.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Only render via portal when mounted on client
  if (!mounted || !isOpen) return null;

  const isIncome = type === "INCOME";

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] bg-black text-white w-screen h-[100dvh] min-h-[100dvh] flex flex-col justify-between overflow-y-auto overflow-x-hidden p-4 sm:p-6 select-none animate-in fade-in duration-200"
      style={{
        paddingTop: "max(1rem, env(safe-area-inset-top))",
        paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
      }}
    >
      {/* Top Header Bar */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between z-10 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleClose}
          disabled={isSubmitting}
          className="text-white/80 hover:text-white hover:bg-white/10 rounded-full w-10 h-10"
        >
          <X className="w-6 h-6" />
        </Button>

        <span className="text-xs font-bold uppercase tracking-wider text-white/80">
          {mode === "CAMERA" ? "Chụp ảnh hóa đơn" : "Xem trước & Xác nhận"}
        </span>

        {mode === "CAMERA" ? (
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
        ) : (
          <div className="w-10 h-10" />
        )}
      </div>

      {/* Main Body Area */}
      {mode === "CAMERA" ? (
        /* ================= MODE A: LIVE CAMERA VIEWFINDER ================= */
        <div className="flex-1 flex flex-col justify-center items-center my-auto py-2">
          {/* Central 1:1 Square Viewfinder */}
          <div className="relative w-full max-w-[320px] sm:max-w-[360px] aspect-square mx-auto rounded-3xl overflow-hidden border border-white/20 shadow-2xl bg-neutral-900 flex items-center justify-center">
            {/* Live video feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={markCameraReady}
              onCanPlay={markCameraReady}
              onPlaying={markCameraReady}
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
              <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center gap-3 bg-neutral-950 text-white">
                <AlertCircle className="w-10 h-10 text-rose-500" />
                <p className="text-xs text-neutral-300 leading-relaxed">{cameraError}</p>
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
                <div
                  className={`absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 rounded-tl-xl ${
                    isIncome ? "border-emerald-400" : "border-rose-400"
                  }`}
                />
                <div
                  className={`absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 rounded-tr-xl ${
                    isIncome ? "border-emerald-400" : "border-rose-400"
                  }`}
                />
                <div
                  className={`absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 rounded-bl-xl ${
                    isIncome ? "border-emerald-400" : "border-rose-400"
                  }`}
                />
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

          {/* Dynamic Humorous Quote Bar */}
          <div className="w-full max-w-sm mx-auto text-center px-4 mt-3">
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
        </div>
      ) : (
        /* ================= MODE B: POST-CAPTURE REVIEW & QUICK FILL ================= */
        <div className="flex-1 flex flex-col justify-center items-center my-auto py-2 w-full max-w-sm mx-auto space-y-3">
          {/* Captured 1:1 Square Image Preview */}
          <div className="relative w-full max-w-[240px] sm:max-w-[270px] aspect-square rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-neutral-950">
            {capturedPreviewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={capturedPreviewUrl}
                alt="Captured receipt preview"
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] font-medium text-white/80 border border-white/10">
              1:1 Vuông
            </div>
          </div>

          {/* Fintech-Grade Quick-Fill Form Card */}
          <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-md space-y-3 shadow-xl">
            {/* System Date Badge */}
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-white/60 font-medium">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>Hôm nay ({formatVNDate(transactionDate, "short")})</span>
            </div>

            {/* Amount Input with Fintech Typography */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-white/70 uppercase tracking-wider block text-center">
                Số tiền {isIncome ? "thu nhập" : "chi tiêu"}
              </label>
              <div className="relative flex items-center justify-center">
                <input
                  type="text"
                  inputMode="numeric"
                  value={amountInput ? formatNumberVN(amountInput) : ""}
                  onChange={(e) => {
                    const clean = sanitizeCurrencyInput(e.target.value);
                    setAmountInput(clean);
                  }}
                  placeholder="0"
                  className={`w-full text-center text-3xl font-extrabold tracking-tight bg-transparent border-b-2 py-1 outline-none transition-colors placeholder:text-white/20 ${
                    isIncome
                      ? "text-emerald-400 border-emerald-500/40 focus:border-emerald-400"
                      : "text-rose-400 border-rose-500/40 focus:border-rose-400"
                  }`}
                />
                <span className="absolute right-2 text-lg font-bold text-white/50 pointer-events-none">
                  ₫
                </span>
              </div>
            </div>

            {/* Description Input */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-white/70 uppercase tracking-wider block">
                Mô tả giao dịch
              </label>
              <input
                type="text"
                value={descriptionInput}
                onChange={(e) => setDescriptionInput(e.target.value)}
                placeholder="Nhập mô tả (vd: Ăn trưa Highland, Đổ xăng...)"
                className="w-full bg-white/10 border border-white/15 focus:border-primary rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/40 outline-none transition-all"
              />
            </div>
          </div>
        </div>
      )}

      {/* Bottom Controls Bar */}
      <div className="w-full max-w-sm mx-auto shrink-0 pt-2 pb-1">
        {mode === "CAMERA" ? (
          /* Shutter Button */
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={handleCapture}
              disabled={!!cameraError}
              className={`group relative w-20 h-20 rounded-full border-4 flex items-center justify-center p-1.5 transition-transform active:scale-90 cursor-pointer ${
                isIncome
                  ? "border-emerald-500 bg-emerald-500/20"
                  : "border-rose-500 bg-rose-500/20"
              }`}
              title="Bấm để chụp ảnh vuông"
            >
              <div className="w-full h-full bg-white rounded-full shadow-inner pointer-events-none transition-transform group-hover:scale-95" />
            </button>
          </div>
        ) : (
          /* Review Action Buttons: Red X (Retake) vs Green Check (Accept) */
          <div className="flex items-center justify-between gap-3">
            {/* Red "X" Button (Chụp lại) */}
            <button
              type="button"
              onClick={handleRetake}
              disabled={isSubmitting}
              className="flex-1 h-12 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-400 hover:bg-rose-500 hover:text-white flex items-center justify-center gap-2 font-semibold text-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Hủy bỏ và chụp lại"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
              <span>Chụp lại</span>
            </button>

            {/* Green "Check" Button (Đồng ý & Sử dụng) */}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="flex-1 h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center gap-2 font-semibold text-xs shadow-lg shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Xác nhận sử dụng ảnh và thông tin"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang tải...</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 stroke-[2.5]" />
                  <span>Đồng ý</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
