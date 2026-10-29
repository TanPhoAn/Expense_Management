"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  X,
  Camera,
  SwitchCamera,
  RotateCcw,
  Check,
  Loader2,
  Sparkles,
  AlertCircle,
  Image as ImageIcon,
  Calendar as CalendarIcon,
} from "lucide-react";
import { CategoryIcon } from "@/features/categories/components/CategoryIcon";
import { formatNumberVN, sanitizeCurrencyInput } from "@/lib/utils/currency";
import { getVietnamTodayString, formatVNDate } from "@/lib/utils/date";
import { compressImageClient } from "@/lib/utils/image";
import { Category } from "@/types";
import { toast } from "sonner";

const FINANCIAL_QUOTES = [
  "Quét hóa đơn liền tay, quản lý chi tiêu chuẩn chỉnh ✨",
  "Biết mình tiêu gì là bước đầu của tự do tài chính 💸",
  "Hóa đơn rõ ràng, ví tiền an khang 💵",
  "Ghi chép hôm nay, thảnh thơi ngày mai 🎯",
  "Tích tiểu thành đại, đừng để tiền rơi vô định 🍃",
];

interface InstantReceiptCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onTransactionCreated: () => void;
}

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
    const blob = new Blob([bytes], { type: mime });
    return Object.assign(blob, {
      name: filename,
      lastModified: Date.now(),
    }) as File;
  }
}

export function InstantReceiptCaptureModal({
  isOpen,
  onClose,
  categories,
  onTransactionCreated,
}: InstantReceiptCaptureModalProps) {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<"CAMERA" | "REVIEW">("CAMERA");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [isLoadingCamera, setIsLoadingCamera] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [quote, setQuote] = useState("");

  // Review & Form state
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState<string>("");
  const [descriptionInput, setDescriptionInput] = useState<string>("");
  const [selectedType, setSelectedType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [transactionDate, setTransactionDate] = useState<string>(getVietnamTodayString());
  const [noteInput, setNoteInput] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Background AI scan state
  const [isScanningAi, setIsScanningAi] = useState(false);
  const [aiDetectedSuccess, setAiDetectedSuccess] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === selectedType),
    [categories, selectedType]
  );

  // Set default category when type changes
  useEffect(() => {
    if (filteredCategories.length > 0) {
      const isValid = filteredCategories.some((c) => c.id === selectedCategoryId);
      if (!isValid) {
        setSelectedCategoryId(filteredCategories[0].id);
      }
    }
  }, [filteredCategories, selectedCategoryId]);

  const stopCamera = useCallback(() => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {
            // ignore
          }
        });
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    } catch {
      // ignore
    }
  }, []);

  const markCameraReady = useCallback(() => {
    setIsLoadingCamera(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setIsLoadingCamera(true);
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
        throw new Error("Trình duyệt không hỗ trợ camera trực tiếp. Bạn có thể chọn ảnh từ thư viện.");
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

        setTimeout(() => {
          if (streamRef.current?.active) {
            markCameraReady();
          }
        }, 600);
      }
    } catch (err: unknown) {
      console.error("Camera access error:", err);
      const msg =
        err instanceof Error && err.name === "NotAllowedError"
          ? "Bạn đã từ chối quyền truy cập máy ảnh. Vui lòng cấp quyền trong cài đặt hoặc chọn ảnh từ thư viện."
          : "Không thể kết nối máy ảnh thiết bị. Vui lòng chọn ảnh từ thư viện.";
      setCameraError(msg);
      setIsLoadingCamera(false);
    }
  }, [facingMode, stopCamera, markCameraReady]);

  // Handle open/close lifecycle
  useEffect(() => {
    if (isOpen) {
      setMode("CAMERA");
      setCapturedFile(null);
      setCapturedPreviewUrl(null);
      setAmountInput("");
      setDescriptionInput("");
      setSelectedType("EXPENSE");
      setTransactionDate(getVietnamTodayString());
      setNoteInput("");
      setIsSaving(false);
      setIsScanningAi(false);
      setAiDetectedSuccess(false);

      setQuote(FINANCIAL_QUOTES[Math.floor(Math.random() * FINANCIAL_QUOTES.length)]);
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Restart camera when switching facingMode (front/back)
  useEffect(() => {
    if (isOpen && mode === "CAMERA") {
      startCamera();
    }
  }, [facingMode, isOpen, mode, startCamera]);

  const handleToggleCamera = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  // Trigger AI OCR Scan
  const triggerAiOcrScan = (dataUrl: string) => {
    setIsScanningAi(true);
    setAiDetectedSuccess(false);

    fetch("/api/v1/ai/receipt-scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          const { amount, description, merchant, date, categoryName } = json.data;
          let detectedAny = false;

          if (amount && amount > 0) {
            setAmountInput(String(amount));
            detectedAny = true;
          }

          const finalDesc = description || merchant || "";
          if (finalDesc) {
            setDescriptionInput(finalDesc);
            detectedAny = true;
          }

          // 1. Match category: Prioritize categoryName returned by Gemini Vision
          let matchedCat: Category | undefined = undefined;
          if (categoryName) {
            const normCatName = categoryName.trim().toLowerCase();
            matchedCat = categories.find(
              (c) =>
                c.name.trim().toLowerCase() === normCatName ||
                c.name.trim().toLowerCase().includes(normCatName) ||
                normCatName.includes(c.name.trim().toLowerCase())
            );
          }

          // 2. Fallback to keyword matching based on description & merchant
          if (!matchedCat && finalDesc) {
            const descLower = finalDesc.toLowerCase();
            matchedCat = categories.find((c) => {
              const catName = c.name.toLowerCase();
              return (
                descLower.includes(catName) ||
                (catName.includes("ăn") &&
                  (descLower.includes("cơm") ||
                    descLower.includes("phở") ||
                    descLower.includes("cafe") ||
                    descLower.includes("cà phê") ||
                    descLower.includes("bún") ||
                    descLower.includes("bánh") ||
                    descLower.includes("trà") ||
                    descLower.includes("uống") ||
                    descLower.includes("thịt") ||
                    descLower.includes("món"))) ||
                ((catName.includes("chuyển") || catName.includes("đi lại")) &&
                  (descLower.includes("xăng") ||
                    descLower.includes("xe") ||
                    descLower.includes("grab") ||
                    descLower.includes("be") ||
                    descLower.includes("dầu") ||
                    descLower.includes("gửi xe") ||
                    descLower.includes("petrolimex"))) ||
                (catName.includes("sắm") &&
                  (descLower.includes("áo") ||
                    descLower.includes("quần") ||
                    descLower.includes("giày") ||
                    descLower.includes("dép") ||
                    descLower.includes("shopee") ||
                    descLower.includes("tiki") ||
                    descLower.includes("lazada") ||
                    descLower.includes("siêu thị") ||
                    descLower.includes("coop") ||
                    descLower.includes("winmart") ||
                    descLower.includes("bách hóa"))) ||
                ((catName.includes("hóa đơn") || catName.includes("tiện ích")) &&
                  (descLower.includes("điện") ||
                    descLower.includes("nước") ||
                    descLower.includes("wifi") ||
                    descLower.includes("internet"))) ||
                (catName.includes("giải trí") &&
                  (descLower.includes("phim") ||
                    descLower.includes("rạp") ||
                    descLower.includes("karaoke") ||
                    descLower.includes("du lịch"))) ||
                (catName.includes("sức khỏe") &&
                  (descLower.includes("thuốc") ||
                    descLower.includes("khám") ||
                    descLower.includes("nha khoa") ||
                    descLower.includes("gym")))
              );
            });
          }

          if (matchedCat) {
            setSelectedType(matchedCat.type);
            setSelectedCategoryId(matchedCat.id);
            detectedAny = true;
          }

          if (date) {
            setTransactionDate(date);
            detectedAny = true;
          }

          if (detectedAny) {
            setAiDetectedSuccess(true);
            if (matchedCat) {
              toast.success(`✨ Gemini đã nhận diện danh mục: ${matchedCat.name}!`);
            } else {
              toast.success("✨ Gemini đã tự động trích xuất thông tin chi tiêu!");
            }
          }
        }
      })
      .catch((err) => console.warn("AI OCR error:", err))
      .finally(() => setIsScanningAi(false));
  };

  // Capture frame from canvas
  const handleCapture = () => {
    if (isLoadingCamera) {
      toast.info("Đang khởi động camera, xin chờ...");
      return;
    }

    if (!videoRef.current) {
      toast.error("Không tìm thấy hình ảnh từ camera.");
      return;
    }

    const video = videoRef.current;
    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;

    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 160);

    try {
      const size = Math.min(videoWidth, videoHeight);
      const sx = (videoWidth - size) / 2;
      const sy = (videoHeight - size) / 2;

      const canvas = document.createElement("canvas");
      const targetSize = 1080;
      canvas.width = targetSize;
      canvas.height = targetSize;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        toast.error("Trình duyệt không hỗ trợ xử lý ảnh.");
        return;
      }

      if (facingMode === "user") {
        ctx.translate(targetSize, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, sx, sy, size, size, 0, 0, targetSize, targetSize);
      const dataURL = canvas.toDataURL("image/jpeg", 0.85);

      if (!dataURL || dataURL === "data:,") {
        toast.error("Không thể chụp ảnh. Vui lòng thử lại.");
        return;
      }

      const file = dataURLtoFile(dataURL, `receipt_${Date.now()}.jpg`);
      setCapturedFile(file);
      setCapturedPreviewUrl(dataURL);

      video.pause();
      stopCamera();

      // Trigger AI scan and switch to REVIEW mode
      triggerAiOcrScan(dataURL);
      setMode("REVIEW");
    } catch (err) {
      console.error("Capture error:", err);
      toast.error("Lỗi khi chụp ảnh. Vui lòng thử lại.");
    }
  };

  // Handle fallback file upload from gallery
  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn tệp hình ảnh.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataURL = event.target?.result as string;
      if (dataURL) {
        setCapturedFile(file);
        setCapturedPreviewUrl(dataURL);
        stopCamera();
        triggerAiOcrScan(dataURL);
        setMode("REVIEW");
      }
    };
    reader.readAsDataURL(file);
  };

  // Option 1: "Chụp lại" (Retake)
  const handleRetake = () => {
    setCapturedFile(null);
    setCapturedPreviewUrl(null);
    setIsScanningAi(false);
    setAiDetectedSuccess(false);
    setMode("CAMERA");
    startCamera();
  };

  // Option 2: "Lưu giao dịch" (Save Transaction)
  const handleSaveTransaction = async () => {
    if (!amountInput || Number(amountInput) <= 0) {
      toast.error("Vui lòng nhập số tiền hợp lệ.");
      return;
    }

    if (!descriptionInput.trim()) {
      toast.error("Vui lòng nhập mô tả giao dịch.");
      return;
    }

    if (!selectedCategoryId) {
      toast.error("Vui lòng chọn danh mục.");
      return;
    }

    setIsSaving(true);
    try {
      let uploadedReceiptUrl: string | null = null;

      // 1. Upload captured receipt image
      if (capturedFile) {
        const compressedFile = await compressImageClient(capturedFile, 1280, 0.82);
        const formData = new FormData();
        formData.append("file", compressedFile);

        const uploadRes = await fetch("/api/v1/upload/receipt", {
          method: "POST",
          body: formData,
        });

        const uploadJson = await uploadRes.json();
        if (uploadRes.ok && uploadJson.data?.url) {
          uploadedReceiptUrl = uploadJson.data.url;
        } else {
          console.warn("Image upload warning:", uploadJson.error?.message);
        }
      }

      // 2. Create Transaction via API
      const createRes = await fetch("/api/v1/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: descriptionInput.trim(),
          amount: amountInput,
          type: selectedType,
          categoryId: selectedCategoryId,
          transactionDate: transactionDate || getVietnamTodayString(),
          note: noteInput.trim() || undefined,
          receiptUrl: uploadedReceiptUrl,
        }),
      });

      const createJson = await createRes.json();
      if (!createRes.ok) {
        toast.error(createJson.error?.message || "Không thể lưu giao dịch.");
        setIsSaving(false);
        return;
      }

      toast.success("Đã ghi chép giao dịch kèm hóa đơn thành công! 🎉");
      onTransactionCreated();
      handleClose();
    } catch (err) {
      console.error("Save transaction error:", err);
      toast.error("Lỗi khi lưu giao dịch. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9995] flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      {/* Hidden file picker input for fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFilePicked}
        className="hidden"
      />

      <div className="relative w-full h-full sm:h-auto sm:max-w-md bg-background border sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[100dvh] sm:max-h-[90vh]">
        {/* ============================================================
            MODE 1: CAMERA LIVE VIEW
        ============================================================ */}
        {mode === "CAMERA" && (
          <div className="flex flex-col h-full bg-black text-white relative">
            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
              <span className="text-xs font-medium text-white/90 truncate max-w-[260px] italic">
                {quote}
              </span>
              <button
                type="button"
                onClick={handleClose}
                className="w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/75 cursor-pointer transition-colors"
                title="Đóng camera"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Viewfinder */}
            <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black">
              {isLoadingCamera && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 text-white/70">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="text-xs font-medium">Đang khởi động camera...</span>
                </div>
              )}

              {cameraError ? (
                <div className="p-6 text-center text-xs text-rose-300 space-y-3 z-10">
                  <AlertCircle className="w-10 h-10 mx-auto text-rose-400" />
                  <p>{cameraError}</p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-2 text-xs"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Chọn ảnh từ thư viện
                  </Button>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className="w-full h-full object-cover"
                />
              )}

              {/* Shutter flash overlay */}
              {isFlashing && (
                <div className="absolute inset-0 bg-white z-30 pointer-events-none animate-out fade-out duration-150" />
              )}

              {/* Square framing guide overlay with pitch-black cutout mask */}
              {!cameraError && !isLoadingCamera && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden z-10">
                  <div className="w-[86vw] sm:w-[350px] max-w-[350px] aspect-square border-2 border-white/70 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.94)]">
                    {/* 4 Corner Accents */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary -mt-1 -ml-1 rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary -mt-1 -mr-1 rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary -mb-1 -ml-1 rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary -mb-1 -mr-1 rounded-br-lg" />
                    
                    {/* Helper Hint */}
                    <span className="absolute bottom-3 inset-x-0 text-center text-xs font-semibold text-white/90 drop-shadow-md">
                      Đặt hóa đơn vào trong khung
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Controls Bar */}
            <div className="p-6 bg-gradient-to-t from-black/95 via-black/80 to-transparent flex items-center justify-around z-20">
              {/* Gallery upload fallback */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer"
                title="Tải ảnh từ thư viện"
              >
                <ImageIcon className="w-5 h-5" />
              </button>

              {/* Big Shutter button */}
              <button
                type="button"
                onClick={handleCapture}
                disabled={isLoadingCamera || !!cameraError}
                className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1 cursor-pointer disabled:opacity-40 transition-transform active:scale-95 shadow-xl hover:border-primary"
                title="Chụp ảnh hóa đơn"
              >
                <div className="w-full h-full rounded-full bg-white hover:bg-primary transition-colors flex items-center justify-center">
                  <Camera className="w-7 h-7 text-black" />
                </div>
              </button>

              {/* Flip camera */}
              <button
                type="button"
                onClick={handleToggleCamera}
                disabled={isLoadingCamera || !!cameraError}
                className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer disabled:opacity-40"
                title="Đổi camera trước/sau"
              >
                <SwitchCamera className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================
            MODE 2: REVIEW & FILL TRANSACTION INFO
        ============================================================ */}
        {mode === "REVIEW" && (
          <div className="flex flex-col h-full bg-background text-foreground overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between shrink-0 bg-card/60 backdrop-blur-xs">
              <div>
                <h3 className="font-bold text-base leading-tight">Ghi chép giao dịch</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Xác nhận thông tin hóa đơn vừa chụp
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="w-8 h-8 rounded-full"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Photo Preview & AI Status Banner */}
              <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-2xl border border-border/60">
                {capturedPreviewUrl && (
                  <div className="w-16 h-16 rounded-xl overflow-hidden border shadow-xs shrink-0 relative bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={capturedPreviewUrl}
                      alt="Captured receipt"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  {isScanningAi ? (
                    <div className="flex items-center gap-2 text-xs text-primary font-semibold animate-pulse">
                      <Sparkles className="w-4 h-4 shrink-0 animate-spin" />
                      <span>AI đang nhận diện hình ảnh & danh mục...</span>
                    </div>
                  ) : aiDetectedSuccess ? (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                      <Check className="w-4 h-4 shrink-0" />
                      <span>Gemini đã nhận diện thông tin tự động!</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Ảnh chi tiêu đã sẵn sàng lưu trữ
                    </span>
                  )}
                  <p className="text-[11px] text-muted-foreground/80 mt-0.5 truncate">
                    Bạn có thể kiểm tra và chỉnh sửa lại các trường bên dưới
                  </p>
                </div>
              </div>

              {/* Type Switcher (Chi tiêu vs Thu nhập) */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl border">
                <button
                  type="button"
                  onClick={() => setSelectedType("EXPENSE")}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    selectedType === "EXPENSE"
                      ? "bg-rose-600 text-white shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Khoản Chi tiêu
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedType("INCOME")}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    selectedType === "INCOME"
                      ? "bg-emerald-600 text-white shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Khoản Thu nhập
                </button>
              </div>

              {/* Amount Input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Số tiền (VND) *</label>
                <Input
                  value={formatNumberVN(amountInput)}
                  onChange={(e) => setAmountInput(sanitizeCurrencyInput(e.target.value))}
                  placeholder="0"
                  className="font-mono tabular-nums text-lg sm:text-base font-bold text-foreground h-11"
                />
              </div>

              {/* Description Input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Mô tả giao dịch *</label>
                <Input
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  placeholder="VD: Cơm trưa, Đổ xăng, Mua đồ siêu thị..."
                  className="text-base sm:text-xs"
                />
              </div>

              {/* Category & Date in 2 columns */}
              <div className="grid grid-cols-2 gap-3 min-w-0">
                <div className="space-y-1 min-w-0">
                  <label className="text-xs font-semibold text-foreground">Danh mục *</label>
                  <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                    <SelectTrigger className="text-xs h-10 w-full min-w-0">
                      <SelectValue placeholder="Chọn danh mục" />
                    </SelectTrigger>
                    <SelectContent className="z-[99999] max-h-60">
                      {filteredCategories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: c.color }}
                            />
                            <CategoryIcon iconName={c.icon} categoryName={c.name} className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{c.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 min-w-0">
                  <label className="text-xs font-semibold text-foreground">Ngày giao dịch</label>
                  <div className="relative h-10 w-full rounded-md border border-input bg-background/50 px-3 flex items-center justify-between shadow-xs hover:bg-accent/30 transition-colors cursor-pointer overflow-hidden">
                    <span className="text-xs truncate font-medium text-foreground">
                      {transactionDate ? formatVNDate(transactionDate, "short") : "Chọn ngày"}
                    </span>
                    <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <input
                      type="date"
                      value={transactionDate}
                      onChange={(e) => setTransactionDate(e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                  </div>
                </div>
              </div>

              {/* Note (Optional) */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Ghi chú (tùy chọn)</label>
                <Input
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Ghi chú thêm..."
                  className="text-base sm:text-xs"
                />
              </div>
            </div>

            {/* Bottom Actions Bar (Option 1: Chụp lại, Option 2: Lưu) */}
            <div className="p-4 border-t bg-card/60 backdrop-blur-xs flex items-center gap-3 shrink-0">
              {/* OPTION 1: "Chụp lại" (Retake) */}
              <Button
                type="button"
                variant="outline"
                onClick={handleRetake}
                disabled={isSaving}
                className="flex-1 gap-1.5 font-semibold text-xs h-11 rounded-xl cursor-pointer"
                title="Bỏ ảnh này và chụp lại"
              >
                <RotateCcw className="w-4 h-4 text-muted-foreground" />
                <span>Chụp lại</span>
              </Button>

              {/* OPTION 2: "Lưu giao dịch" (Save Transaction) */}
              <Button
                type="button"
                onClick={handleSaveTransaction}
                disabled={isSaving || !amountInput || !descriptionInput.trim()}
                className="flex-1 gap-1.5 font-bold text-xs h-11 rounded-xl shadow-md bg-primary hover:bg-primary/90 text-white cursor-pointer"
                title="Lưu thông tin giao dịch"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Lưu giao dịch</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
