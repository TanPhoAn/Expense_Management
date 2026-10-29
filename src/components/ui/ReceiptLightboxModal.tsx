"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Receipt, Calendar, Tag, Maximize2, Minimize2 } from "lucide-react";
import { formatVND } from "@/lib/utils/currency";
import { formatVNDate } from "@/lib/utils/date";

export interface LightboxData {
  imageUrl: string;
  description: string;
  amount: string;
  type?: "INCOME" | "EXPENSE";
  categoryName?: string;
  transactionDate?: string;
}

interface ReceiptLightboxModalProps {
  data: LightboxData | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ReceiptLightboxModal({
  data,
  isOpen,
  onClose,
}: ReceiptLightboxModalProps) {
  const [scaleMode, setScaleMode] = useState<"contain" | "cover">("contain");

  if (!data) return null;

  const toggleScaleMode = () => {
    setScaleMode((prev) => (prev === "contain" ? "cover" : "contain"));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        overlayClassName="z-[99998]"
        className="z-[99999] sm:max-w-[460px] p-4 sm:p-5 overflow-hidden flex flex-col shadow-2xl"
      >
        <DialogHeader className="space-y-1 text-left">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Receipt className="w-4 h-4" />
            </div>
            <DialogTitle className="text-base font-bold truncate">
              {data.description}
            </DialogTitle>
          </div>
          <DialogDescription className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-muted-foreground">
            <span
              className={`font-semibold text-sm ${
                data.type === "INCOME" ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {data.type === "INCOME" ? "+" : "-"}
              {formatVND(data.amount)}
            </span>
            {data.categoryName && (
              <span className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded text-[11px] font-medium text-foreground">
                <Tag className="w-3 h-3 text-muted-foreground" />
                {data.categoryName}
              </span>
            )}
            {data.transactionDate && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Calendar className="w-3 h-3" />
                {formatVNDate(data.transactionDate, "short")}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* 1:1 Aspect Ratio Square Image Container */}
        <div className="relative w-full aspect-square max-w-[380px] sm:max-w-[410px] mx-auto my-3 bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-800 shadow-inner group select-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.imageUrl}
            alt={data.description}
            onDoubleClick={toggleScaleMode}
            className={`w-full h-full transition-all duration-300 cursor-pointer ${
              scaleMode === "contain"
                ? "object-contain p-2"
                : "object-cover"
            }`}
            title="Nhấp đúp chuột để chuyển đổi chế độ xem vừa vặn / phóng to"
          />

          {/* Quick Toggle Scale Mode (Contain vs Cover) Overlay Button */}
          <button
            type="button"
            onClick={toggleScaleMode}
            className="absolute bottom-2.5 right-2.5 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/85 hover:bg-slate-900 text-slate-200 text-[11px] font-medium backdrop-blur-md border border-slate-700/60 transition-all shadow-md active:scale-95"
            title={scaleMode === "contain" ? "Phóng to vừa khít ô vuông" : "Xem toàn bộ hóa đơn vừa vặn"}
          >
            {scaleMode === "contain" ? (
              <>
                <Maximize2 className="w-3 h-3 text-primary" />
                <span>Vừa khít</span>
              </>
            ) : (
              <>
                <Minimize2 className="w-3 h-3 text-primary" />
                <span>Toàn bộ</span>
              </>
            )}
          </button>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t text-xs">
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            Khung xem vuông 1:1 • Nhấp đúp để phóng to
          </span>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.open(data.imageUrl, "_blank", "noopener,noreferrer")}
              className="gap-1.5 text-xs h-8"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Mở ảnh gốc
            </Button>
            <Button type="button" size="sm" onClick={onClose} className="text-xs h-8">
              Đóng
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
