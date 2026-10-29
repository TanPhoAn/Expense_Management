"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Category, Budget } from "@/types";
import { CategoryIcon } from "@/features/categories/components/CategoryIcon";
import { formatVND } from "@/lib/utils/currency";
import { formatVNDate } from "@/lib/utils/date";
import { BudgetSetModal } from "./BudgetSetModal";
import {
  Target,
  Plus,
  AlertTriangle,
  Clock,
  Edit2,
  Trash2,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface MonthlyBudgetOverviewProps {
  month: string;
  categories: Category[];
  isPrivacyMode?: boolean;
}

export function MonthlyBudgetOverview({
  month,
  categories,
  isPrivacyMode = false,
}: MonthlyBudgetOverviewProps) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  const fetchBudgets = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/budgets?month=${month}`);
      if (res.ok) {
        const json = await res.json();
        setBudgets(json.data || []);
      }
    } catch (err) {
      console.warn("Fetch budgets error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [month]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  // Listen to transaction created events to refresh spending
  useEffect(() => {
    const handleTransactionCreated = () => {
      fetchBudgets();
    };
    window.addEventListener("pocketflow:transaction-created", handleTransactionCreated);
    return () => {
      window.removeEventListener("pocketflow:transaction-created", handleTransactionCreated);
    };
  }, [fetchBudgets]);

  const handleDeleteBudget = async (id: string, categoryName: string) => {
    if (!confirm(`Bạn có chắc muốn xóa ngân sách cho danh mục "${categoryName}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/budgets/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Đã xóa ngân sách.");
        fetchBudgets();
      } else {
        toast.error("Không thể xóa ngân sách.");
      }
    } catch {
      toast.error("Lỗi kết nối khi xóa ngân sách.");
    }
  };

  // Calculate totals
  const totalBudget = budgets.reduce((sum, b) => sum + (Number(b.budgetAmount) || 0), 0);
  const totalSpent = budgets.reduce((sum, b) => sum + (Number(b.spentAmount) || 0), 0);
  const overallPercentage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  return (
    <Card className="rounded-2xl border bg-card/60 backdrop-blur-xs shadow-xs overflow-hidden">
      <CardHeader className="p-4 sm:p-5 border-b flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Target className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-sm sm:text-base font-bold truncate">
              Ngân sách tháng
            </CardTitle>
            <p className="text-[11px] text-muted-foreground truncate">
              {budgets.length > 0
                ? `${budgets.length} danh mục đã đặt hạn mức`
                : "Chưa thiết lập ngân sách"}
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setEditingBudget(null);
            setIsModalOpen(true);
          }}
          className="gap-1 text-xs h-8 px-2.5 font-semibold border-primary/30 text-primary hover:bg-primary/10 cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Đặt ngân sách</span>
          <span className="sm:hidden">Thêm</span>
        </Button>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        {isLoading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span>Đang tải ngân sách...</span>
          </div>
        ) : budgets.length === 0 ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
              <Target className="w-6 h-6 opacity-60" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground">Chưa có ngân sách tháng này</p>
              <p className="text-[11px] text-muted-foreground max-w-[280px] mx-auto">
                Đặt hạn mức chi tiêu cho từng danh mục để nhận cảnh báo khi sắp chạm trần!
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingBudget(null);
                setIsModalOpen(true);
              }}
              className="text-xs h-8 gap-1.5 shadow-xs font-semibold bg-primary hover:bg-primary/90"
            >
              <Plus className="w-3.5 h-3.5" />
              Thiết lập ngay
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Overall budget progress strip */}
            <div className="p-3 bg-muted/30 rounded-xl border border-border/50 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-muted-foreground">Tổng ngân sách đã chi:</span>
                <span className="font-mono tabular-nums font-bold">
                  {isPrivacyMode ? "•••••••• ₫" : `${formatVND(totalSpent)} / ${formatVND(totalBudget)}`}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    overallPercentage >= 100
                      ? "bg-rose-500"
                      : overallPercentage >= 70
                      ? "bg-amber-500"
                      : "bg-primary"
                  }`}
                  style={{ width: `${Math.min(100, overallPercentage)}%` }}
                />
              </div>
            </div>

            {/* List of individual category budgets */}
            <div className="space-y-3">
              {budgets.map((b) => {
                const spent = Number(b.spentAmount) || 0;
                const limit = Number(b.budgetAmount) || Number(b.amount) || 0;
                const percentage = b.percentage || 0;
                const isOverspent = b.status === "EXCEEDED";
                const isWarning = b.status === "WARNING";
                const category = b.category;

                return (
                  <div
                    key={b.id}
                    className="p-3 rounded-xl border border-border/60 bg-card/40 hover:bg-muted/20 transition-colors space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {category && (
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-xs"
                            style={{ backgroundColor: `${category.color}20`, color: category.color }}
                          >
                            <CategoryIcon
                              iconName={category.icon}
                              categoryName={category.name}
                              className="w-4 h-4"
                            />
                          </div>
                        )}
                        <span className="text-xs font-bold text-foreground truncate">
                          {category?.name || "Danh mục"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs font-mono tabular-nums font-bold">
                          {isPrivacyMode ? "•••••••• ₫" : `${formatVND(spent)} / ${formatVND(limit)}`}
                        </span>

                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingBudget(b);
                              setIsModalOpen(true);
                            }}
                            className="w-7 h-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                            title="Sửa hạn mức"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBudget(b.id, category?.name || "")}
                            className="w-7 h-7 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                            title="Xóa ngân sách"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden relative">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOverspent
                            ? "bg-gradient-to-r from-rose-500 to-red-600 animate-pulse"
                            : isWarning
                            ? "bg-gradient-to-r from-amber-500 to-orange-500"
                            : "bg-gradient-to-r from-emerald-500 to-teal-500"
                        }`}
                        style={{ width: `${Math.min(100, percentage)}%` }}
                      />
                    </div>

                    {/* Bottom Status & Predictive Badge */}
                    <div className="flex items-center justify-between text-[11px] gap-2 pt-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isOverspent ? (
                          <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold truncate">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            Vượt {isPrivacyMode ? "••••" : formatVND(spent - limit)}
                          </span>
                        ) : b.projectedOverspent?.isProjectedToOverspend && b.projectedOverspent.projectedDate ? (
                          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium truncate">
                            <Clock className="w-3 h-3 shrink-0" />
                            Dự kiến hết ngày {formatVNDate(b.projectedOverspent.projectedDate, "short").substring(0, 5)}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium truncate">
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            Còn {isPrivacyMode ? "••••" : formatVND(Math.max(0, limit - spent))}
                          </span>
                        )}
                      </div>

                      <span
                        className={`font-mono font-bold shrink-0 ${
                          isOverspent
                            ? "text-rose-600 dark:text-rose-400"
                            : isWarning
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        {percentage}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>

      {/* Set / Edit Budget Modal */}
      <BudgetSetModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingBudget(null);
        }}
        categories={categories}
        month={month}
        existingBudget={editingBudget}
        onBudgetSaved={fetchBudgets}
      />
    </Card>
  );
}
