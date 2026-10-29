"use client";

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Calendar as CalendarIcon,
  PlusCircle,
  X,
  Receipt,
  ZoomIn,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatVND } from "@/lib/utils/currency";
import { formatVNDate, getVietnamTodayString } from "@/lib/utils/date";
import { getReceiptThumbnailUrl } from "@/lib/utils/image";
import { Transaction } from "@/types";
import { LightboxData } from "@/components/ui/ReceiptLightboxModal";
import { CategoryIcon } from "@/features/categories/components/CategoryIcon";
import { cn } from "@/lib/utils";

interface CalendarCell {
  dateStr: string;
  dayNum: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

interface DashboardCalendarProps {
  selectedMonth: string; // "YYYY-MM"
  onMonthChange: (month: string) => void;
  transactions: Transaction[];
  onSelectDayForAdd: (dateStr: string) => void;
  onPreviewReceipt?: (data: LightboxData) => void;
}

const WEEKDAYS = [
  { short: "Su", vi: "CN" },
  { short: "Mo", vi: "T2" },
  { short: "Tu", vi: "T3" },
  { short: "We", vi: "T4" },
  { short: "Th", vi: "T5" },
  { short: "Fr", vi: "T6" },
  { short: "Sa", vi: "T7" },
];

export function DashboardCalendar({
  selectedMonth,
  onMonthChange,
  transactions,
  onSelectDayForAdd,
  onPreviewReceipt,
}: DashboardCalendarProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);
  const [isDayDetailOpen, setIsDayDetailOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Parse current year & month from selectedMonth (YYYY-MM)
  const { year, month } = useMemo(() => {
    const [yStr, mStr] = selectedMonth.split("-");
    return {
      year: parseInt(yStr, 10),
      month: parseInt(mStr, 10), // 1-12
    };
  }, [selectedMonth]);

  // Today string in Vietnam timezone
  const todayStr = useMemo(() => getVietnamTodayString(), []);

  // Group transactions by date string YYYY-MM-DD
  const transactionsByDate = useMemo(() => {
    const map: Record<string, Transaction[]> = {};
    for (const tx of transactions) {
      if (!map[tx.transactionDate]) {
        map[tx.transactionDate] = [];
      }
      map[tx.transactionDate].push(tx);
    }
    return map;
  }, [transactions]);

  // Compute 35 or 42 grid cells
  const calendarCells = useMemo<CalendarCell[]>(() => {
    const monthIndex = month - 1; // 0-11
    const firstDay = new Date(year, monthIndex, 1);
    const startDayOfWeek = firstDay.getDay(); // 0 (Sun) to 6 (Sat)
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, monthIndex, 0).getDate();

    const cells: CalendarCell[] = [];

    // 1. Padding days from previous month
    const prevDate = new Date(year, monthIndex - 1, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonth = prevDate.getMonth() + 1;
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const dateStr = `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
      cells.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    // 2. Days of current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      });
    }

    // 3. Padding days for next month to complete standard 35 or 42 grid
    const totalSoFar = cells.length;
    const totalTarget = totalSoFar <= 35 ? 35 : 42;
    const remainingCount = totalTarget - totalSoFar;
    const nextDate = new Date(year, monthIndex + 1, 1);
    const nextYear = nextDate.getFullYear();
    const nextMonth = nextDate.getMonth() + 1;
    for (let d = 1; d <= remainingCount; d++) {
      const dateStr = `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
    }

    return cells;
  }, [year, month, todayStr]);

  // Navigate to previous month
  const handlePrevMonth = () => {
    const d = new Date(year, month - 2, 1);
    const prevMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    onMonthChange(prevMonthStr);
  };

  // Navigate to next month
  const handleNextMonth = () => {
    const d = new Date(year, month, 1);
    const nextMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    onMonthChange(nextMonthStr);
  };

  // Cell click interaction:
  // - If day has 0 transactions -> Immediately trigger QuickAddModal with dateStr
  // - If day has >= 1 transactions -> Open Day Detail Sheet/Popover
  const handleCellClick = (cell: CalendarCell) => {
    const dayTxs = transactionsByDate[cell.dateStr] || [];
    if (dayTxs.length === 0) {
      onSelectDayForAdd(cell.dateStr);
    } else {
      setSelectedDayDate(cell.dateStr);
      setIsDayDetailOpen(true);
    }
  };

  // Month title formatted as "October 2026" and Vietnamese "Tháng MM / YYYY"
  const monthTitleEn = useMemo(() => {
    const d = new Date(year, month - 1, 1);
    return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(d);
  }, [year, month]);

  const monthTitleVi = useMemo(() => {
    return `Tháng ${month}/${year}`;
  }, [year, month]);

  // Transactions for selected day
  const selectedDayTransactions = useMemo(() => {
    if (!selectedDayDate) return [];
    return transactionsByDate[selectedDayDate] || [];
  }, [selectedDayDate, transactionsByDate]);

  // Totals for selected day in DayDetailSheet
  const daySummary = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of selectedDayTransactions) {
      const val = parseFloat(tx.amount || "0");
      if (tx.type === "INCOME") income += val;
      if (tx.type === "EXPENSE") expense += val;
    }
    return { income, expense };
  }, [selectedDayTransactions]);

  return (
    <Card className="shadow-sm border overflow-hidden">
      {/* Calendar Header Bar matching uploaded design */}
      <CardHeader className="p-4 sm:p-5 pb-2 border-b bg-card/50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <span>{monthTitleEn}</span>
              <span className="text-xs font-normal text-muted-foreground hidden sm:inline">
                ({monthTitleVi})
              </span>
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Nhấn vào ngày để ghi chép hoặc xem lại chi tiêu
            </p>
          </div>

          {/* Navigation Controls: Triangle / Chevron Up & Down */}
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handlePrevMonth}
              className="h-8 w-8 rounded-lg cursor-pointer"
              title="Tháng trước"
            >
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleNextMonth}
              className="h-8 w-8 rounded-lg cursor-pointer"
              title="Tháng sau"
            >
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-5 pt-3">
        {/* Days of week header (Su, Mo, Tu, We, Th, Fr, Sa) */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center select-none">
          {WEEKDAYS.map((w, idx) => (
            <div
              key={w.short}
              className={cn(
                "py-1.5 text-xs sm:text-sm font-semibold tracking-wide",
                idx === 0
                  ? "text-rose-500 font-bold"
                  : idx === 6
                  ? "text-blue-500 font-bold"
                  : "text-muted-foreground"
              )}
            >
              <span>{w.short}</span>
            </div>
          ))}
        </div>

        {/* 7-column Calendar Days Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 select-none">
          {calendarCells.map((cell) => {
            const dayTxs = transactionsByDate[cell.dateStr] || [];
            const hasTransactions = dayTxs.length > 0;
            const hasIncome = dayTxs.some((t) => t.type === "INCOME");
            const hasExpense = dayTxs.some((t) => t.type === "EXPENSE");

            // Display up to 2 mini avatars in stack
            const visibleAvatars = dayTxs.slice(0, 2);
            const remainingCount = dayTxs.length - 2;

            return (
              <button
                key={cell.dateStr}
                type="button"
                onClick={() => handleCellClick(cell)}
                className={cn(
                  "group relative h-[62px] sm:h-[70px] p-1 rounded-xl flex flex-col items-center justify-between transition-all border border-transparent cursor-pointer outline-none overflow-hidden",
                  cell.isCurrentMonth
                    ? "text-foreground hover:bg-muted/60"
                    : "text-muted-foreground/35 hover:bg-muted/30",
                  cell.isToday &&
                    "bg-blue-50/50 dark:bg-blue-950/20",
                  selectedDayDate === cell.dateStr &&
                    isDayDetailOpen &&
                    "ring-2 ring-primary bg-primary/5"
                )}
                title={
                  hasTransactions
                    ? `${formatVNDate(cell.dateStr, "short")}: ${dayTxs.length} giao dịch (Nhấn để xem)`
                    : `${formatVNDate(cell.dateStr, "short")}: Nhấn để thêm giao dịch`
                }
              >
                {/* Day number with circle highlight if today */}
                <div className="w-full flex justify-center items-center mt-0.5 shrink-0">
                  {cell.isToday ? (
                    <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs sm:text-sm shadow-sm transition-transform group-active:scale-95">
                      {cell.dayNum}
                    </span>
                  ) : (
                    <span
                      className={cn(
                        "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-colors",
                        cell.isCurrentMonth
                          ? "group-hover:text-primary"
                          : "text-muted-foreground/40"
                      )}
                    >
                      {cell.dayNum}
                    </span>
                  )}
                </div>

                {/* Mobile View Indicators (< 640px) */}
                <div className="sm:hidden flex items-center justify-center gap-1 w-full min-h-[18px]">
                  {hasTransactions ? (
                    <div className="flex items-center gap-1">
                      {hasIncome && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-xs" />}
                      {hasExpense && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-xs" />}
                      {dayTxs.length > 2 && (
                        <span className="text-[8px] font-bold text-muted-foreground">
                          {dayTxs.length}
                        </span>
                      )}
                    </div>
                  ) : null}
                </div>

                {/* Desktop View Content (>= 640px): Avatar Stack & Micro status indicators */}
                <div className="hidden sm:flex w-full flex-col items-center justify-center min-h-[22px] pb-0.5 overflow-hidden">
                  {hasTransactions ? (
                    <div className="flex flex-col items-center gap-0.5 w-full overflow-hidden">
                      {/* Avatar Stack with strictly constrained dimensions */}
                      <div className="flex -space-x-1.5 items-center justify-center max-w-full overflow-hidden">
                        {visibleAvatars.map((tx) => (
                          <div
                            key={tx.id}
                            className="relative w-[18px] h-[18px] min-w-[18px] min-h-[18px] max-w-[18px] max-h-[18px] rounded-full overflow-hidden ring-1 ring-background shadow-xs shrink-0 flex items-center justify-center bg-muted"
                          >
                            {tx.receiptUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={getReceiptThumbnailUrl(tx.receiptUrl) || tx.receiptUrl}
                                alt={tx.description}
                                className="w-[18px] h-[18px] min-w-[18px] min-h-[18px] object-cover rounded-full block shrink-0"
                              />
                            ) : (
                              <div
                                className="w-full h-full rounded-full flex items-center justify-center text-[9px] font-bold text-white uppercase shrink-0"
                                style={{ backgroundColor: tx.category?.color || "#64748b" }}
                              >
                                {tx.category?.name ? tx.category.name.charAt(0) : "T"}
                              </div>
                            )}
                          </div>
                        ))}

                        {/* +N Badge if > 2 transactions */}
                        {remainingCount > 0 && (
                          <div className="w-[18px] h-[18px] min-w-[18px] min-h-[18px] max-w-[18px] max-h-[18px] rounded-full bg-muted border border-border text-[8px] font-bold text-muted-foreground ring-1 ring-background shadow-xs shrink-0 flex items-center justify-center">
                            +{remainingCount}
                          </div>
                        )}
                      </div>

                      {/* Micro Status Dot */}
                      <div className="flex items-center gap-0.5">
                        {hasIncome && (
                          <span className="w-1 h-1 rounded-full bg-emerald-500" />
                        )}
                        {hasExpense && (
                          <span className="w-1 h-1 rounded-full bg-rose-500" />
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Subtle plus sign on hover when day is empty */
                    <span className="opacity-0 group-hover:opacity-60 text-muted-foreground text-[10px] transition-opacity">
                      +
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>

      {/* Day Detail Bottom Sheet / Dialog Portal */}
      {mounted &&
        isDayDetailOpen &&
        selectedDayDate &&
        createPortal(
          <div className="fixed inset-0 z-[9990] flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
              onClick={() => setIsDayDetailOpen(false)}
            />

            {/* Sheet / Dialog Modal Box */}
            <div className="relative w-full sm:max-w-md bg-background border rounded-t-3xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 z-10 animate-in slide-in-from-bottom duration-200 max-h-[85vh] flex flex-col overflow-hidden">
              {/* Mobile Drawer Pull Indicator */}
              <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-2 sm:hidden shrink-0" />

              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <CalendarIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      {formatVNDate(selectedDayDate, "full")}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedDayTransactions.length} giao dịch được ghi nhận
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsDayDetailOpen(false)}
                  className="rounded-full w-8 h-8 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Day Summary Badges */}
              <div className="grid grid-cols-2 gap-2 my-3 shrink-0">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40">
                  <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
                    <TrendingDown className="w-3.5 h-3.5" />
                    <span>Chi tiêu</span>
                  </div>
                  <span className="text-xs font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
                    -{formatVND(daySummary.expense)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Thu nhập</span>
                  </div>
                  <span className="text-xs font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                    +{formatVND(daySummary.income)}
                  </span>
                </div>
              </div>

              {/* Transactions List */}
              <div className="flex-1 overflow-y-auto divide-y divide-border pr-1 my-1">
                {selectedDayTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-2.5 hover:bg-muted/30 px-1 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      {/* Avatar / Receipt Thumbnail */}
                      {tx.receiptUrl ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (onPreviewReceipt) {
                              onPreviewReceipt({
                                imageUrl: tx.receiptUrl!,
                                description: tx.description,
                                amount: tx.amount,
                                type: tx.type,
                                categoryName: tx.category?.name,
                                transactionDate: tx.transactionDate,
                              });
                            }
                          }}
                          className="group relative w-9 h-9 rounded-full overflow-hidden shadow-xs shrink-0 border cursor-pointer"
                          title="Nhấn xem hóa đơn"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getReceiptThumbnailUrl(tx.receiptUrl) || tx.receiptUrl}
                            alt={tx.description}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <ZoomIn className="w-3 h-3 text-white" />
                          </div>
                        </button>
                      ) : (
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center shadow-xs shrink-0 text-white"
                          style={{ backgroundColor: tx.category?.color || "#64748b" }}
                        >
                          <CategoryIcon
                            categoryName={tx.category?.name}
                            iconName={tx.category?.icon}
                            className="w-4 h-4 text-white"
                          />
                        </div>
                      )}

                      <div className="truncate">
                        <p className="font-semibold text-xs sm:text-sm text-foreground truncate">
                          {tx.description}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {tx.category?.name || "Chưa phân loại"}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-2">
                      <p
                        className={cn(
                          "font-bold font-mono tabular-nums text-xs sm:text-sm",
                          tx.type === "INCOME"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        )}
                      >
                        {tx.type === "INCOME" ? "+" : "-"}
                        {formatVND(tx.amount)}
                      </p>
                      <Badge
                        variant={tx.type === "INCOME" ? "income" : "expense"}
                        className="text-[9px] px-1.5 py-0 mt-0.5"
                      >
                        {tx.type === "INCOME" ? "Thu nhập" : "Chi tiêu"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Button: Add more transactions for this day */}
              <div className="pt-3 border-t shrink-0">
                <Button
                  type="button"
                  onClick={() => {
                    setIsDayDetailOpen(false);
                    onSelectDayForAdd(selectedDayDate);
                  }}
                  className="w-full gap-2 bg-primary hover:bg-primary/90 text-white font-semibold text-xs sm:text-sm py-2 rounded-xl shadow-md cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>
                    Thêm giao dịch ngày này ({formatVNDate(selectedDayDate, "short")})
                  </span>
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </Card>
  );
}
