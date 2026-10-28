"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { createTransactionSchema, CreateTransactionInput } from "@/lib/validations/transaction.schema";
import { getVietnamTodayString } from "@/lib/utils/date";
import { formatNumberVN, sanitizeCurrencyInput, formatVND } from "@/lib/utils/currency";
import { Category } from "@/types";
import { Sparkles, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { ReceiptUploadField } from "@/components/ui/ReceiptUploadField";

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  defaultType?: "INCOME" | "EXPENSE";
  onTransactionCreated: () => void;
}

export function QuickAddModal({
  isOpen,
  onClose,
  categories,
  defaultType = "EXPENSE",
  onTransactionCreated,
}: QuickAddModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [suggestedCategory, setSuggestedCategory] = useState<Category | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateTransactionInput>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      description: "",
      amount: "",
      type: defaultType,
      categoryId: "",
      transactionDate: getVietnamTodayString(),
      note: "",
      receiptUrl: null,
    },
  });

  const selectedType = watch("type");
  const descriptionValue = watch("description");
  const rawAmount = watch("amount");
  const receiptUrlValue = watch("receiptUrl");

  // Reset form when modal opens with defaultType
  useEffect(() => {
    if (isOpen) {
      setValue("type", defaultType);
      setValue("transactionDate", getVietnamTodayString());
      setErrorMsg(null);
      setSuggestedCategory(null);
    }
  }, [isOpen, defaultType, setValue]);

  // Filter categories matching current transaction type (INCOME or EXPENSE)
  const filteredCategories = categories.filter((c) => c.type === selectedType);

  // Set default category when type changes if current category is invalid
  useEffect(() => {
    if (filteredCategories.length > 0) {
      const currentCatId = watch("categoryId");
      const isValid = filteredCategories.some((c) => c.id === currentCatId);
      if (!isValid) {
        setValue("categoryId", filteredCategories[0].id);
      }
    }
  }, [selectedType, filteredCategories, setValue, watch]);

  // Keyword-based Category Suggestion on description input
  useEffect(() => {
    if (!descriptionValue || descriptionValue.trim().length < 2) {
      setSuggestedCategory(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/categories/suggest?q=${encodeURIComponent(descriptionValue)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data?.suggestion?.category) {
            const cat = json.data.suggestion.category as Category;
            setSuggestedCategory(cat);
            // Hint suggested category if user hasn't explicitly customized yet
            setValue("type", cat.type);
            setValue("categoryId", cat.id);
          } else {
            setSuggestedCategory(null);
          }
        }
      } catch {
        // silent fail on network suggestion
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [descriptionValue, setValue]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = sanitizeCurrencyInput(e.target.value);
    setValue("amount", raw, { shouldValidate: true });
  };

  const onSubmit = async (data: CreateTransactionInput) => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/v1/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error?.message || "Không thể tạo giao dịch.");
        setIsSubmitting(false);
        return;
      }

      reset({
        description: "",
        amount: "",
        type: "EXPENSE",
        categoryId: filteredCategories[0]?.id || "",
        transactionDate: getVietnamTodayString(),
        note: "",
        receiptUrl: null,
      });
      setSuggestedCategory(null);
      toast.success(
        `Đã lưu giao dịch ${data.type === "INCOME" ? "thu nhập" : "chi tiêu"}: ${formatVND(data.amount)}`
      );
      onTransactionCreated();
      onClose();
    } catch {
      setErrorMsg("Lỗi kết nối máy chủ. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Thêm giao dịch mới</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {errorMsg && (
            <div className="p-3 text-xs font-medium rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
              {errorMsg}
            </div>
          )}

          {/* Type Toggle: EXPENSE / INCOME */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
            <button
              type="button"
              onClick={() => setValue("type", "EXPENSE")}
              className={`py-2 text-sm font-semibold rounded-md transition-all ${
                selectedType === "EXPENSE"
                  ? "bg-rose-600 text-white shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Chi tiêu (Expense)
            </button>
            <button
              type="button"
              onClick={() => setValue("type", "INCOME")}
              className={`py-2 text-sm font-semibold rounded-md transition-all ${
                selectedType === "INCOME"
                  ? "bg-emerald-600 text-white shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Thu nhập (Income)
            </button>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <Label htmlFor="description">Mô tả giao dịch</Label>
              {suggestedCategory && (
                <button
                  type="button"
                  onClick={() => {
                    setValue("type", suggestedCategory.type);
                    setValue("categoryId", suggestedCategory.id);
                  }}
                  className="flex items-center gap-1 text-xs text-primary font-medium bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-full transition-colors cursor-pointer"
                  title="Nhấn để áp dụng danh mục gợi ý này"
                >
                  <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
                  <span>Gợi ý: {suggestedCategory.name}</span>
                  {watch("categoryId") === suggestedCategory.id && (
                    <Check className="w-3 h-3 text-emerald-600" />
                  )}
                </button>
              )}
            </div>
            <Input
              id="description"
              placeholder="VD: Đi ăn trưa, Lương tháng 10, Đổ xăng..."
              autoFocus
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-rose-600">{errors.description.message}</p>
            )}
          </div>

          {/* Amount */}
          <div className="space-y-1">
            <Label htmlFor="amount">Số tiền (VND)</Label>
            <div className="relative">
              <Input
                id="amount"
                type="text"
                placeholder="0"
                value={formatNumberVN(rawAmount)}
                onChange={handleAmountChange}
                className="pr-12 text-lg font-semibold tracking-wide"
              />
              <span className="absolute right-3 top-2 text-sm font-medium text-muted-foreground">
                ₫
              </span>
            </div>
            {errors.amount && (
              <p className="text-xs text-rose-600">{errors.amount.message}</p>
            )}
          </div>

          {/* Category & Date in 2 columns */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="category">Danh mục</Label>
              <Select
                value={watch("categoryId")}
                onValueChange={(val) => setValue("categoryId", val, { shouldValidate: true })}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Chọn danh mục" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ backgroundColor: c.color }}
                        />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoryId && (
                <p className="text-xs text-rose-600">{errors.categoryId.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="transactionDate">Ngày giao dịch</Label>
              <Input
                id="transactionDate"
                type="date"
                {...register("transactionDate")}
              />
              {errors.transactionDate && (
                <p className="text-xs text-rose-600">{errors.transactionDate.message}</p>
              )}
            </div>
          </div>

          {/* Optional Note */}
          <div className="space-y-1">
            <Label htmlFor="note">Ghi chú (Tùy chọn)</Label>
            <Input
              id="note"
              placeholder="VD: Ăn cùng đồng nghiệp phòng ban..."
              {...register("note")}
            />
          </div>

          {/* Receipt Upload (Cloudinary) */}
          <ReceiptUploadField
            value={receiptUrlValue}
            onChange={(url) => setValue("receiptUrl", url, { shouldValidate: true })}
            disabled={isSubmitting}
            type={selectedType}
            onQuickFill={(data) => {
              if (data.amount !== undefined && data.amount > 0) {
                setValue("amount", String(data.amount), { shouldValidate: true });
              }
              if (data.description) {
                setValue("description", data.description, { shouldValidate: true });
              }
              if (data.date) {
                setValue("transactionDate", data.date, { shouldValidate: true });
              }
            }}
            initialAmount={rawAmount ? parseInt(rawAmount, 10) : undefined}
            initialDescription={descriptionValue}
          />

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className={selectedType === "INCOME" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-rose-600 hover:bg-rose-700 text-white"}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                "Lưu giao dịch"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
