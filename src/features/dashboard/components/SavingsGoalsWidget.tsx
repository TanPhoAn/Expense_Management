"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SavingsGoal } from "@/types";
import { SavingsGoalIcon } from "@/features/savings-goals/components/SavingsGoalIcon";
import { SavingsGoalCreateModal } from "./SavingsGoalCreateModal";
import { SavingsGoalActionModal } from "./SavingsGoalActionModal";
import { formatVND } from "@/lib/utils/currency";
import { formatVNDate } from "@/lib/utils/date";
import {
  PiggyBank,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Trash2,
  Trophy,
  Calendar,
  Clock,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

interface SavingsGoalsWidgetProps {
  isPrivacyMode?: boolean;
}

export function SavingsGoalsWidget({ isPrivacyMode = false }: SavingsGoalsWidgetProps) {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [actionGoal, setActionGoal] = useState<SavingsGoal | null>(null);
  const [actionType, setActionType] = useState<"DEPOSIT" | "WITHDRAW">("DEPOSIT");

  const fetchGoals = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/savings-goals");
      if (res.ok) {
        const json = await res.json();
        setGoals(json.data || []);
      }
    } catch (err) {
      console.warn("Fetch savings goals error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const handleDeleteGoal = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa hũ tiết kiệm "${name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/savings-goals/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Đã xóa mục tiêu tiết kiệm.");
        fetchGoals();
      } else {
        toast.error("Không thể xóa mục tiêu.");
      }
    } catch {
      toast.error("Lỗi kết nối khi xóa mục tiêu.");
    }
  };

  const totalSaved = goals.reduce((sum, g) => sum + (Number(g.currentAmount) || 0), 0);
  const totalTarget = goals.reduce((sum, g) => sum + (Number(g.targetAmount) || 0), 0);
  const completedCount = goals.filter((g) => g.isCompleted).length;

  return (
    <Card className="rounded-2xl border bg-card/60 backdrop-blur-xs shadow-xs overflow-hidden">
      <CardHeader className="p-4 sm:p-5 border-b flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <PiggyBank className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-sm sm:text-base font-bold truncate">
              Mục tiêu tiết kiệm & Hũ tài chính
            </CardTitle>
            <p className="text-[11px] text-muted-foreground truncate">
              {goals.length > 0
                ? `Tổng tích lũy: ${isPrivacyMode ? "•••••••• ₫" : formatVND(totalSaved)} (${completedCount}/${goals.length} hũ hoàn thành)`
                : "Chưa có hũ tiết kiệm nào"}
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => setIsCreateOpen(true)}
          className="gap-1.5 text-xs h-8 px-3 font-semibold shadow-xs bg-primary hover:bg-primary/90 cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Tạo mục tiêu</span>
          <span className="sm:hidden">Thêm</span>
        </Button>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        {isLoading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span>Đang tải các hũ tiết kiệm...</span>
          </div>
        ) : goals.length === 0 ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <PiggyBank className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground">Bắt đầu tích lũy cho ước mơ của bạn</p>
              <p className="text-[11px] text-muted-foreground max-w-[320px] mx-auto">
                Tạo các hũ tiết kiệm riêng (mua xe, du lịch, quỹ khẩn cấp) để bỏ ống heo đều đặn mỗi tháng!
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="text-xs h-8 gap-1.5 shadow-xs font-semibold bg-primary hover:bg-primary/90"
            >
              <Plus className="w-3.5 h-3.5" />
              Tạo hũ đầu tiên
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {goals.map((goal) => {
              const current = Number(goal.currentAmount) || 0;
              const target = Number(goal.targetAmount) || 0;
              const percentage = Math.min(100, goal.percentage || 0);
              const isCompleted = goal.isCompleted;

              return (
                <div
                  key={goal.id}
                  className={`p-4 rounded-2xl border transition-all hover:-translate-y-0.5 shadow-xs flex flex-col justify-between space-y-3 relative overflow-hidden ${
                    isCompleted
                      ? "bg-gradient-to-br from-amber-500/10 via-card/50 to-background border-amber-500/30"
                      : "bg-card/40 hover:bg-card/70 border-border/60"
                  }`}
                  style={{
                    borderTopColor: goal.color,
                    borderTopWidth: "3px",
                  }}
                >
                  {/* Top Bar: Icon, Name & Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
                        style={{ backgroundColor: `${goal.color}20`, color: goal.color }}
                      >
                        <SavingsGoalIcon iconName={goal.icon} className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs sm:text-sm text-foreground truncate">
                          {goal.name}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                          {isCompleted ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                              <Trophy className="w-3 h-3" />
                              Đã đạt mục tiêu! 🎉
                            </span>
                          ) : goal.daysLeft !== null && goal.daysLeft !== undefined ? (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Còn {goal.daysLeft} ngày
                            </span>
                          ) : (
                            <span>Đang tích lũy</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteGoal(goal.id, goal.name)}
                      className="w-7 h-7 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                      title="Xóa mục tiêu"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Amounts & Percentage */}
                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-mono font-bold text-foreground">
                        {isPrivacyMode ? "•••••••• ₫" : formatVND(current)}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        / {isPrivacyMode ? "•••••••• ₫" : formatVND(target)}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden relative">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCompleted
                            ? "bg-gradient-to-r from-amber-400 to-yellow-500"
                            : "bg-gradient-to-r from-emerald-500 to-teal-500"
                        }`}
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: !isCompleted ? goal.color : undefined,
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                      <span>{isCompleted ? "100% hoàn thành" : `Còn thiếu ${isPrivacyMode ? "••••" : formatVND(goal.remainingAmount)}`}</span>
                      <span className="font-mono font-bold text-foreground">{percentage}%</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                    <Button
                      size="sm"
                      onClick={() => {
                        setActionGoal(goal);
                        setActionType("DEPOSIT");
                      }}
                      className="flex-1 text-xs h-7.5 gap-1 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                    >
                      <ArrowDownLeft className="w-3.5 h-3.5" />
                      Bỏ ống heo
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setActionGoal(goal);
                        setActionType("WITHDRAW");
                      }}
                      disabled={current <= 0}
                      className="text-xs h-7.5 px-2.5 gap-1 font-medium border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      Rút
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Create Goal Modal */}
      <SavingsGoalCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onGoalCreated={fetchGoals}
      />

      {/* Deposit / Withdraw Action Modal */}
      <SavingsGoalActionModal
        isOpen={!!actionGoal}
        onClose={() => setActionGoal(null)}
        goal={actionGoal}
        defaultType={actionType}
        onActionCompleted={fetchGoals}
      />
    </Card>
  );
}
