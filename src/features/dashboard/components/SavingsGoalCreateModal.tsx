"use client";

import React, { useState } from "react";
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
import { formatNumberVN, sanitizeCurrencyInput } from "@/lib/utils/currency";
import { formatVNDate } from "@/lib/utils/date";
import { SavingsGoalIcon, AVAILABLE_SAVINGS_ICONS } from "@/features/savings-goals/components/SavingsGoalIcon";
import { toast } from "sonner";
import { PiggyBank, Calendar as CalendarIcon, Loader2 } from "lucide-react";

interface SavingsGoalCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoalCreated: () => void;
}

const COLOR_PALETTE = [
  "#10b981", // Emerald
  "#0ea5e9", // Sky
  "#6366f1", // Indigo
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#f43f5e", // Rose
  "#f59e0b", // Amber
  "#14b8a6", // Teal
];

const PRESET_SUGGESTIONS = [
  { name: "Quỹ khẩn cấp 3 tháng", amount: "30000000", icon: "Shield", color: "#10b981" },
  { name: "Mua iPhone mới", amount: "25000000", icon: "Smartphone", color: "#6366f1" },
  { name: "Du lịch nghỉ dưỡng", amount: "8000000", icon: "Plane", color: "#0ea5e9" },
  { name: "Đổi laptop làm việc", amount: "20000000", icon: "Laptop", color: "#8b5cf6" },
];

export function SavingsGoalCreateModal({
  isOpen,
  onClose,
  onGoalCreated,
}: SavingsGoalCreateModalProps) {
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [initialAmount, setInitialAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0]);
  const [selectedIcon, setSelectedIcon] = useState("PiggyBank");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const applyPreset = (preset: typeof PRESET_SUGGESTIONS[0]) => {
    setName(preset.name);
    setTargetAmount(preset.amount);
    setSelectedIcon(preset.icon);
    setSelectedColor(preset.color);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Vui lòng nhập tên mục tiêu.");
      return;
    }

    const cleanTarget = Number(sanitizeCurrencyInput(targetAmount));
    if (!cleanTarget || cleanTarget <= 0) {
      toast.error("Vui lòng nhập số tiền mục tiêu hợp lệ (> 0 ₫).");
      return;
    }

    const cleanInitial = initialAmount ? Number(sanitizeCurrencyInput(initialAmount)) : 0;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/savings-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          targetAmount: cleanTarget,
          initialAmount: cleanInitial,
          targetDate: targetDate || undefined,
          color: selectedColor,
          icon: selectedIcon,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message || "Không thể tạo mục tiêu.");
        return;
      }

      toast.success("Đã tạo hũ tiết kiệm mới thành công! 🎯");
      onGoalCreated();
      handleClose();
    } catch (err) {
      console.error("Create goal error:", err);
      toast.error("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName("");
    setTargetAmount("");
    setInitialAmount("");
    setTargetDate("");
    setSelectedColor(COLOR_PALETTE[0]);
    setSelectedIcon("PiggyBank");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[460px] p-4 sm:p-6 overflow-hidden flex flex-col max-h-[92vh]">
        <DialogHeader className="space-y-1 text-left">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
              style={{ backgroundColor: `${selectedColor}20`, color: selectedColor }}
            >
              <SavingsGoalIcon iconName={selectedIcon} className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Tạo mục tiêu / Hũ tiết kiệm mới
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Đặt mục tiêu và tích lũy từng ngày
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 overflow-y-auto pr-1">
          {/* Quick Preset Chips */}
          <div className="space-y-1">
            <span className="text-[11px] text-muted-foreground font-medium">Gợi ý phổ biến:</span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_SUGGESTIONS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="px-2.5 py-1 text-xs rounded-full border border-border/80 bg-muted/40 hover:bg-muted font-medium transition-colors cursor-pointer active:scale-95"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Goal Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Tên mục tiêu *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Mua xe máy, Quỹ du lịch, Học phí..."
              className="text-sm h-10"
              maxLength={150}
            />
          </div>

          {/* Target Amount & Initial Amount */}
          <div className="grid grid-cols-2 gap-3 min-w-0">
            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs font-semibold">Mục tiêu (VND) *</Label>
              <Input
                value={formatNumberVN(targetAmount)}
                onChange={(e) => setTargetAmount(sanitizeCurrencyInput(e.target.value))}
                placeholder="0"
                className="font-mono tabular-nums text-sm font-bold h-10 w-full min-w-0"
              />
            </div>

            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs font-semibold">Đã có sẵn (tùy chọn)</Label>
              <Input
                value={formatNumberVN(initialAmount)}
                onChange={(e) => setInitialAmount(sanitizeCurrencyInput(e.target.value))}
                placeholder="0"
                className="font-mono tabular-nums text-sm font-bold h-10 w-full min-w-0"
              />
            </div>
          </div>

          {/* Target Date */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Hạn hoàn thành (tùy chọn)</Label>
            <div className="relative h-10 w-full rounded-md border border-input bg-background/50 px-3 flex items-center justify-between shadow-xs hover:bg-accent/30 transition-colors cursor-pointer overflow-hidden">
              <span className="text-xs truncate font-medium text-foreground">
                {targetDate ? formatVNDate(targetDate, "short") : "Chọn ngày dự kiến hoàn thành"}
              </span>
              <CalendarIcon className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
            </div>
          </div>

          {/* Icon Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Biểu tượng</Label>
            <div className="grid grid-cols-6 gap-2">
              {AVAILABLE_SAVINGS_ICONS.map((item) => {
                const isSelected = selectedIcon === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setSelectedIcon(item.name)}
                    className={`h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary scale-105 shadow-xs"
                        : "border-border/60 hover:bg-muted text-muted-foreground"
                    }`}
                    title={item.label}
                  >
                    <SavingsGoalIcon iconName={item.name} className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Màu sắc chủ đạo</Label>
            <div className="flex items-center gap-2.5">
              {COLOR_PALETTE.map((color) => {
                const isSelected = selectedColor === color;
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={`w-7 h-7 rounded-full transition-transform cursor-pointer border-2 ${
                      isSelected ? "scale-125 border-foreground shadow-sm" : "border-transparent hover:scale-110"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                );
              })}
            </div>
          </div>

          <DialogFooter className="flex-row items-center justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-xs"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="text-xs gap-1.5 shadow font-semibold bg-primary hover:bg-primary/90"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Tạo mục tiêu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
