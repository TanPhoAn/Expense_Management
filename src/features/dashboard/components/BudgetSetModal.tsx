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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Category, Budget } from "@/types";
import { CategoryIcon } from "@/features/categories/components/CategoryIcon";
import { formatNumberVN, sanitizeCurrencyInput } from "@/lib/utils/currency";
import { toast } from "sonner";
import { Target, Loader2 } from "lucide-react";

interface BudgetSetModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  month: string;
  existingBudget?: Budget | null;
  onBudgetSaved: () => void;
}

const PRESET_AMOUNTS = [
  { label: "500k", value: "500000" },
  { label: "1 triệu", value: "1000000" },
  { label: "2 triệu", value: "2000000" },
  { label: "5 triệu", value: "5000000" },
  { label: "10 triệu", value: "10000000" },
];

export function BudgetSetModal({
  isOpen,
  onClose,
  categories,
  month,
  existingBudget,
  onBudgetSaved,
}: BudgetSetModalProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter only EXPENSE categories
  const expenseCategories = categories.filter((c) => c.type === "EXPENSE");

  useEffect(() => {
    if (isOpen) {
      if (existingBudget) {
        setSelectedCategoryId(existingBudget.categoryId);
        setAmountInput(existingBudget.amount || "");
      } else {
        setSelectedCategoryId(expenseCategories[0]?.id || "");
        setAmountInput("");
      }
    }
  }, [isOpen, existingBudget, expenseCategories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCategoryId) {
      toast.error("Vui lòng chọn danh mục chi tiêu.");
      return;
    }

    const cleanAmount = Number(sanitizeCurrencyInput(amountInput));
    if (!cleanAmount || cleanAmount <= 0) {
      toast.error("Vui lòng nhập hạn mức ngân sách hợp lệ (> 0 ₫).");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: selectedCategoryId,
          month,
          amount: cleanAmount,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message || "Không thể lưu ngân sách.");
        return;
      }

      toast.success(existingBudget ? "Đã cập nhật ngân sách thành công!" : "Đã thiết lập ngân sách mới! 🎯");
      onBudgetSaved();
      onClose();
    } catch (err) {
      console.error("Save budget error:", err);
      toast.error("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px] p-4 sm:p-6 overflow-hidden flex flex-col">
        <DialogHeader className="space-y-1.5 text-left">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                {existingBudget ? "Chỉnh sửa ngân sách" : "Thiết lập ngân sách tháng"}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">Tháng {month}</p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Category Select */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Danh mục chi tiêu *</Label>
            <Select
              value={selectedCategoryId}
              onValueChange={setSelectedCategoryId}
              disabled={!!existingBudget}
            >
              <SelectTrigger className="w-full text-xs h-10">
                <SelectValue placeholder="Chọn danh mục..." />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <CategoryIcon iconName={cat.icon} categoryName={cat.name} className="w-3.5 h-3.5" />
                      <span className="truncate">{cat.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Hạn mức ngân sách (VND) *</Label>
            <Input
              value={formatNumberVN(amountInput)}
              onChange={(e) => setAmountInput(sanitizeCurrencyInput(e.target.value))}
              placeholder="0"
              className="font-mono tabular-nums text-base sm:text-sm font-bold h-11"
            />
          </div>

          {/* Quick preset chips */}
          <div className="space-y-1">
            <span className="text-[11px] text-muted-foreground font-medium">Gợi ý nhanh:</span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_AMOUNTS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setAmountInput(preset.value)}
                  className="px-2.5 py-1 text-xs rounded-full border border-border/80 bg-muted/40 hover:bg-muted font-medium transition-colors cursor-pointer active:scale-95"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter className="flex-row items-center justify-end gap-2 pt-3">
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
              className="text-xs gap-1.5 shadow font-semibold bg-primary hover:bg-primary/90"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {existingBudget ? "Cập nhật" : "Lưu ngân sách"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
