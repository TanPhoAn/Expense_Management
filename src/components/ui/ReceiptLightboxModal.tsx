"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Receipt, Calendar, Tag } from "lucide-react";
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
  if (!data) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-4 sm:p-6 overflow-hidden">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <DialogTitle className="text-lg font-bold truncate">
              {data.description}
            </DialogTitle>
          </div>
          <DialogDescription className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
            <span
              className={`font-semibold text-sm ${
                data.type === "INCOME" ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {data.type === "INCOME" ? "+" : "-"}
              {formatVND(data.amount)}
            </span>
            {data.categoryName && (
              <span className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded text-[11px]">
                <Tag className="w-3 h-3" />
                {data.categoryName}
              </span>
            )}
            {data.transactionDate && (
              <span className="flex items-center gap-1 text-[11px]">
                <Calendar className="w-3 h-3" />
                {formatVNDate(data.transactionDate, "short")}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Image Preview Box */}
        <div className="relative flex-1 min-h-[250px] max-h-[55vh] my-3 bg-slate-900/5 dark:bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.imageUrl}
            alt={data.description}
            className="max-h-[55vh] w-auto max-w-full object-contain rounded-lg shadow-sm"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t text-xs">
          <span className="text-muted-foreground hidden sm:inline">
            Hóa đơn đính kèm (Cloudinary CDN)
          </span>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.open(data.imageUrl, "_blank", "noopener,noreferrer")}
              className="gap-1.5 text-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Mở ảnh gốc
            </Button>
            <Button type="button" size="sm" onClick={onClose} className="text-xs">
              Đóng
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
