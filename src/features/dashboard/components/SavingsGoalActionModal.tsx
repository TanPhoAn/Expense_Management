"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatNumberVN, sanitizeCurrencyInput, formatVND } from "@/lib/utils/currency";
import { SavingsGoalIcon } from "@/features/savings-goals/components/SavingsGoalIcon";
import { SavingsGoal } from "@/types";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight, Loader2 } from "lucide-react";

interface SavingsGoalActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: SavingsGoal | null;
  defaultType?: "DEPOSIT" | "WITHDRAW";
  onActionCompleted: () => void;
}

const DEPOSIT_PRESETS = [
  { label: "100k", value: "100000" },
  { label: "200k", value: "200000" },
  { label: "500k", value: "500000" },
  { label: "1 triệu", value: "1000000" },
  { label: "2 triệu", value: "2000000" },
];

export function SavingsGoalActionModal({
  isOpen,
  onClose,
  goal,
  defaultType = "DEPOSIT",
  onActionCompleted,
}: SavingsGoalActionModalProps) {
  const [actionType, setActionType] = useState<"DEPOSIT" | "WITHDRAW">(defaultType);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActionType(defaultType);
      setAmount("");
      setNote("");
    }
  }, [isOpen, defaultType]);

  if (!goal) return null;

  const currentBal = Number(goal.currentAmount) || 0;
  const targetBal = Number(goal.targetAmount) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanAmount = Number(sanitizeCurrencyInput(amount));
    if (!cleanAmount || cleanAmount <= 0) {
      toast.error("Vui lòng nhập số tiền hợp lệ (> 0 ₫).");
      return;
    }

    if (actionType === "WITHDRAW" && cleanAmount > currentBal) {
      toast.error(`Số tiền rút không được vượt quá số dư trong hũ (${formatVND(currentBal)})!`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/v1/savings-goals/${goal.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: cleanAmount,
          type: actionType,
          note: note.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message || "Không thể thực hiện giao dịch.");
        return;
      }

      const updated = json.data;
      if (updated?.isCompleted && !goal.isCompleted) {
        toast.success(`🎉 Chúc mừng! Bạn đã hoàn thành mục tiêu "${goal.name}"!`);
      } else {
        toast.success(
          actionType === "DEPOSIT"
            ? `Đã bỏ thêm ${formatVND(cleanAmount)} vào hũ! 🐷`
            : `Đã rút ${formatVND(cleanAmount)} từ hũ.`
        );
      }

      onActionCompleted();
      onClose();
    } catch (err) {
      console.error("Action goal error:", err);
      toast.error("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px] p-4 sm:p-6 overflow-hidden flex flex-col">
        <DialogHeader className="space-y-1.5 text-left">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
              style={{ backgroundColor: `${goal.color}20`, color: goal.color }}
            >
              <SavingsGoalIcon iconName={goal.icon} className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-bold truncate">
                {goal.name}
              </DialogTitle>
              <p className="text-xs text-muted-foreground font-mono">
                Số dư hiện tại: <span className="font-bold text-foreground">{formatVND(currentBal)}</span>
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Segmented Type Switch */}
          <div className="grid grid-cols-2 p-1 bg-muted rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setActionType("DEPOSIT")}
              className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                actionType === "DEPOSIT"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              Bỏ ống heo (+ Nạp)
            </button>
            <button
              type="button"
              onClick={() => setActionType("WITHDRAW")}
              className={`flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                actionType === "WITHDRAW"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Rút tiền (- Rút)
            </button>
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              {actionType === "DEPOSIT" ? "Số tiền nạp (VND) *" : "Số tiền rút (VND) *"}
            </Label>
            <Input
              value={formatNumberVN(amount)}
              onChange={(e) => setAmount(sanitizeCurrencyInput(e.target.value))}
              placeholder="0"
              className="font-mono tabular-nums text-base sm:text-sm font-bold h-11"
            />
          </div>

          {/* Quick Amount Chips */}
          <div className="space-y-1">
            <span className="text-[11px] text-muted-foreground font-medium">Chọn nhanh:</span>
            <div className="flex flex-wrap gap-1.5">
              {DEPOSIT_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setAmount(preset.value)}
                  className="px-2.5 py-1 text-xs rounded-full border border-border/80 bg-muted/40 hover:bg-muted font-medium transition-colors cursor-pointer active:scale-95"
                >
                  {preset.label}
                </button>
              ))}
              {actionType === "WITHDRAW" && currentBal > 0 && (
                <button
                  type="button"
                  onClick={() => setAmount(String(currentBal))}
                  className="px-2.5 py-1 text-xs rounded-full border border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 font-bold transition-colors cursor-pointer active:scale-95"
                >
                  Rút tất cả
                </button>
              )}
            </div>
          </div>

          {/* Note Input */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Ghi chú (tùy chọn)</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Trích từ tiền thưởng, chuyển khoản lương..."
              className="text-xs h-10"
              maxLength={255}
            />
          </div>

          <DialogFooter className="flex-row items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className={`text-xs gap-1.5 shadow font-semibold ${
                actionType === "DEPOSIT"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-rose-600 hover:bg-rose-700 text-white"
              }`}
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {actionType === "DEPOSIT" ? "Xác nhận nạp" : "Xác nhận rút"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
