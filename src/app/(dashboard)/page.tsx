"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Wallet,
  TrendingDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowDownRight,
  ArrowUpRight,
  Receipt,
  ZoomIn,
  PlusCircle,
  Eye,
  EyeOff,
  RotateCcw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardCharts } from "@/features/dashboard/components/DashboardCharts";
import { DashboardCalendar } from "@/features/dashboard/components/DashboardCalendar";
import { MarketPricesWidget } from "@/features/dashboard/components/MarketPricesWidget";
import { CategoryIcon } from "@/features/categories/components/CategoryIcon";
import { formatVND } from "@/lib/utils/currency";
import {
  getVietnamCurrentMonthString,
  getMonthDateRange,
  formatVNDate,
} from "@/lib/utils/date";
import {
  getAdjacentMonthString,
  formatVNMonthYear,
  isCurrentVietnamMonth,
  maskCurrency,
  calculateBurnRate,
  calculateDailyAverage,
} from "@/features/dashboard/services/dashboardUiHelpers";
import { getReceiptThumbnailUrl } from "@/lib/utils/image";
import { ReceiptLightboxModal, LightboxData } from "@/components/ui/ReceiptLightboxModal";
import {
  DashboardSummary,
  CategoryBreakdownItem,
  MonthlyTrendItem,
  DailyExpenseTrendItem,
  Transaction,
  Category,
} from "@/types";
import { QuickAddModal } from "@/features/transactions/components/QuickAddModal";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>(getVietnamCurrentMonthString());
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [breakdown, setBreakdown] = useState<CategoryBreakdownItem[]>([]);
  const [trends, setTrends] = useState<MonthlyTrendItem[]>([]);
  const [dailyTrends, setDailyTrends] = useState<DailyExpenseTrendItem[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [monthTransactions, setMonthTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [quickAddModalOpen, setQuickAddModalOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [quickAddDate, setQuickAddDate] = useState<string | undefined>(undefined);
  const [lightboxData, setLightboxData] = useState<LightboxData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);

  // Sync privacy mode from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("pocketflow_privacy_mode");
      if (stored === "true") setIsPrivacyMode(true);
    } catch {
      // LocalStorage not accessible
    }
  }, []);

  const togglePrivacyMode = () => {
    setIsPrivacyMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("pocketflow_privacy_mode", String(next));
      } catch {
        // Continue
      }
      return next;
    });
  };

  const loadDashboardData = async (month: string) => {
    setIsLoading(true);
    try {
      const { startDate, endDate } = getMonthDateRange(month);
      const [sumRes, breakRes, trendRes, dailyRes, txRes, catRes, monthTxRes] = await Promise.all([
        fetch(`/api/v1/dashboard/summary?month=${month}`),
        fetch(`/api/v1/dashboard/expense-breakdown?month=${month}`),
        fetch(`/api/v1/dashboard/trends?months=6`),
        fetch(`/api/v1/dashboard/trends?month=${month}`),
        fetch(`/api/v1/transactions?pageSize=5`),
        fetch(`/api/v1/categories`),
        fetch(`/api/v1/transactions?startDate=${startDate}&endDate=${endDate}&pageSize=500`),
      ]);

      if (sumRes.ok) {
        const d = await sumRes.json();
        setSummary(d.data);
      }
      if (breakRes.ok) {
        const d = await breakRes.json();
        setBreakdown(d.data || []);
      }
      if (trendRes.ok) {
        const d = await trendRes.json();
        setTrends(d.data || []);
      }
      if (dailyRes.ok) {
        const d = await dailyRes.json();
        setDailyTrends(d.data || []);
      }
      if (txRes.ok) {
        const d = await txRes.json();
        setRecentTransactions(d.data || []);
      }
      if (catRes.ok) {
        const d = await catRes.json();
        setCategories(d.data || []);
      }
      if (monthTxRes.ok) {
        const d = await monthTxRes.json();
        setMonthTransactions(d.data || []);
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData(selectedMonth);

    const onTxCreated = () => {
      loadDashboardData(selectedMonth);
    };
    window.addEventListener("pocketflow:transaction-created", onTxCreated);
    return () => window.removeEventListener("pocketflow:transaction-created", onTxCreated);
  }, [selectedMonth]);

  const remainingBalanceNum = parseFloat(summary?.remainingBalance || "0");
  const isBalanceNegative = remainingBalanceNum < 0;

  // Days in selected month for daily average calculation
  const { endDate } = getMonthDateRange(selectedMonth);
  const daysInMonth = parseInt(endDate.split("-")[2], 10) || 30;
  const dailyAverageExpense = calculateDailyAverage(summary?.monthlyExpense || 0, daysInMonth);
  const burnRate = calculateBurnRate(summary?.monthlyExpense || 0, summary?.monthlyIncome || 0);

  const incomeTxCount = monthTransactions.filter((t) => t.type === "INCOME").length;
  const expenseTxCount = monthTransactions.filter((t) => t.type === "EXPENSE").length;

  return (
    <div className="space-y-6 pb-16 sm:pb-0">
      {/* Dashboard Top Header & Intelligent Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Bảng điều khiển tài chính
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Dòng tiền thực tế & thị trường trực tiếp theo giờ Việt Nam
          </p>
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          {/* Quick Month Stepper Navigation Pill */}
          <div className="flex items-center gap-1 bg-card border border-border/80 rounded-xl p-1 shadow-xs">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setSelectedMonth(getAdjacentMonthString(selectedMonth, -1))}
              className="h-8 w-8 rounded-lg cursor-pointer hover:bg-muted text-muted-foreground hover:text-foreground"
              title="Tháng trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <div className="relative flex items-center px-2 cursor-pointer group">
              <span className="text-xs sm:text-sm font-bold text-foreground tracking-tight select-none flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>{formatVNMonthYear(selectedMonth)}</span>
              </span>
              {/* Invisible native month picker overlay for custom month selection */}
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  if (e.target.value) setSelectedMonth(e.target.value);
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                title="Nhấn để chọn tháng bất kỳ"
              />
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setSelectedMonth(getAdjacentMonthString(selectedMonth, 1))}
              className="h-8 w-8 rounded-lg cursor-pointer hover:bg-muted text-muted-foreground hover:text-foreground"
              title="Tháng sau"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Quick "Hôm nay" Button if not current month */}
          {!isCurrentVietnamMonth(selectedMonth) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedMonth(getVietnamCurrentMonthString())}
              className="h-9 px-2.5 rounded-xl text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10 gap-1 cursor-pointer animate-in fade-in-50 duration-150"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Hôm nay</span>
            </Button>
          )}

          {/* Privacy Mode Toggle Button */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={togglePrivacyMode}
            className={cn(
              "h-9 w-9 rounded-xl border transition-colors cursor-pointer shrink-0",
              isPrivacyMode
                ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            title={isPrivacyMode ? "Đang ẩn số tiền (Nhấn để hiện)" : "Nhấn để ẩn số tiền (Chế độ riêng tư)"}
          >
            {isPrivacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>

          {/* Desktop Quick Add Buttons (Hidden on mobile to save space, powered by mobile floating bar) */}
          <div className="hidden sm:flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                setQuickAddDate(undefined);
                setQuickAddType("EXPENSE");
                setQuickAddModalOpen(true);
              }}
              className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-xs text-xs rounded-xl h-9 px-3 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Thêm chi tiêu</span>
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setQuickAddDate(undefined);
                setQuickAddType("INCOME");
                setQuickAddModalOpen(true);
              }}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs text-xs rounded-xl h-9 px-3 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Thêm thu nhập</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Loading Skeleton Placeholder during month switches */}
      {isLoading ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="rounded-2xl p-4 sm:p-5 border border-border/50">
                <Skeleton className="h-4 w-28 mb-3" />
                <Skeleton className="h-8 w-40 mb-2" />
                <Skeleton className="h-3 w-32" />
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-[140px] rounded-2xl" />
            <Skeleton className="h-[140px] rounded-2xl" />
          </div>
          <Skeleton className="h-[360px] rounded-2xl" />
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
            <Skeleton className="lg:col-span-4 h-[320px] rounded-2xl" />
            <Skeleton className="lg:col-span-3 h-[320px] rounded-2xl" />
          </div>
        </div>
      ) : (
        <>
          {/* 4 Fintech Metric Cards with subtle gradient glows */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Today's Expense */}
            <Card className="relative overflow-hidden border border-rose-500/25 bg-gradient-to-br from-rose-500/10 via-rose-500/[0.03] to-background shadow-xs hover:shadow-md transition-all rounded-2xl">
              <div className="absolute top-0 right-0 w-28 h-28 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <span>Chi tiêu hôm nay</span>
                </CardTitle>
                <div className="p-2 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20 shadow-xs">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums tracking-tight text-rose-600 dark:text-rose-400">
                  {maskCurrency(formatVND(summary?.todayExpense || "0"), isPrivacyMode)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between">
                  <span>TB ngày: {maskCurrency(formatVND(dailyAverageExpense), isPrivacyMode)}</span>
                  <span className="text-[10px] text-muted-foreground/80 font-medium">Hôm nay</span>
                </p>
              </CardContent>
            </Card>

            {/* Card 2: Monthly Income */}
            <Card className="relative overflow-hidden border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-emerald-500/[0.03] to-background shadow-xs hover:shadow-md transition-all rounded-2xl">
              <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <span>Tổng thu nhập tháng</span>
                </CardTitle>
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
                  {maskCurrency(formatVND(summary?.monthlyIncome || "0"), isPrivacyMode)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between">
                  <span>{incomeTxCount} khoản thu nhận</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">{selectedMonth}</span>
                </p>
              </CardContent>
            </Card>

            {/* Card 3: Monthly Expense */}
            <Card className="relative overflow-hidden border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-amber-500/[0.03] to-background shadow-xs hover:shadow-md transition-all rounded-2xl">
              <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <span>Tổng chi tiêu tháng</span>
                </CardTitle>
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-xs">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums tracking-tight text-amber-600 dark:text-amber-400">
                  {maskCurrency(formatVND(summary?.monthlyExpense || "0"), isPrivacyMode)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between">
                  <span>{burnRate > 0 ? `Chiếm ${burnRate}% thu nhập` : `${expenseTxCount} khoản chi`}</span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">{selectedMonth}</span>
                </p>
              </CardContent>
            </Card>

            {/* Card 4: Remaining Balance */}
            <Card
              className={cn(
                "relative overflow-hidden border shadow-xs hover:shadow-md transition-all rounded-2xl",
                isBalanceNegative
                  ? "border-rose-500/40 bg-gradient-to-br from-rose-500/15 via-rose-500/[0.05] to-background"
                  : "border-primary/25 bg-gradient-to-br from-primary/10 via-primary/[0.03] to-background"
              )}
            >
              <div className="absolute top-0 right-0 w-28 h-28 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <span>Số dư còn lại</span>
                </CardTitle>
                <div
                  className={cn(
                    "p-2 rounded-xl shadow-xs border",
                    isBalanceNegative
                      ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30 animate-pulse"
                      : "bg-primary/15 text-primary border-primary/20"
                  )}
                >
                  <Wallet className="w-4 h-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className={cn(
                    "text-2xl sm:text-3xl font-extrabold font-mono tabular-nums tracking-tight",
                    isBalanceNegative ? "text-rose-600 dark:text-rose-400" : "text-foreground"
                  )}
                >
                  {maskCurrency(formatVND(summary?.remainingBalance || "0"), isPrivacyMode)}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 flex items-center justify-between">
                  <span>{isBalanceNegative ? "Cảnh báo: Bội chi" : "Dòng tiền khả dụng"}</span>
                  <span
                    className={cn(
                      "text-[10px] font-bold",
                      isBalanceNegative ? "text-rose-600 dark:text-rose-400" : "text-primary"
                    )}
                  >
                    {isBalanceNegative ? "Âm" : "Dương"}
                  </span>
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Real-time Market Prices Widget (SJC 99.99% Gold Ring & Petrolimex E10 Gasoline) */}
          <MarketPricesWidget />

          {/* Interactive Financial Calendar Widget */}
          <DashboardCalendar
            selectedMonth={selectedMonth}
            onMonthChange={(newMonth) => setSelectedMonth(newMonth)}
            transactions={monthTransactions}
            onSelectDayForAdd={(dateStr) => {
              setQuickAddDate(dateStr);
              setQuickAddType("EXPENSE");
              setQuickAddModalOpen(true);
            }}
            onPreviewReceipt={(data) => setLightboxData(data)}
          />

          {/* Visual Analytics Charts */}
          <DashboardCharts
            breakdown={breakdown}
            trends={trends}
            dailyTrends={dailyTrends}
            selectedMonth={selectedMonth}
          />

          {/* Recent Transactions Section */}
          <Card className="shadow-sm border rounded-2xl overflow-hidden bg-card/60 backdrop-blur-xs">
            <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-5 border-b bg-card/30">
              <div>
                <CardTitle className="text-base sm:text-lg font-bold">Giao dịch gần đây</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Các khoản thu chi mới ghi nhận</p>
              </div>
              <Link href="/transactions">
                <Button variant="ghost" size="sm" className="gap-1 text-xs font-semibold rounded-xl cursor-pointer">
                  <span>Xem tất cả</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 pt-1">
              {recentTransactions.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm space-y-3">
                  <Receipt className="w-10 h-10 mx-auto text-muted-foreground/40" />
                  <p>Chưa có giao dịch nào được ghi nhận.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {recentTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between py-3 hover:bg-muted/30 px-2 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        {tx.receiptUrl ? (
                          <button
                            type="button"
                            onClick={() =>
                              setLightboxData({
                                imageUrl: tx.receiptUrl!,
                                description: tx.description,
                                amount: tx.amount,
                                type: tx.type,
                                categoryName: tx.category?.name,
                                transactionDate: tx.transactionDate,
                              })
                            }
                            className="group relative w-10 h-10 rounded-full overflow-hidden shadow-xs shrink-0 border border-border cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                            title="Nhấn để xem hóa đơn gốc"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={getReceiptThumbnailUrl(tx.receiptUrl) || tx.receiptUrl}
                              alt={tx.description}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <ZoomIn className="w-3.5 h-3.5 text-white" />
                            </div>
                          </button>
                        ) : (
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center shadow-xs shrink-0 text-white"
                            style={{ backgroundColor: tx.category?.color || "#64748b" }}
                          >
                            <CategoryIcon
                              categoryName={tx.category?.name}
                              iconName={tx.category?.icon}
                              className="w-5 h-5 text-white"
                            />
                          </div>
                        )}
                        <div className="truncate">
                          <p className="font-semibold text-sm leading-snug text-foreground truncate">
                            {tx.description}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <span className="truncate">{tx.category?.name || "Chưa phân loại"}</span>
                            <span>•</span>
                            <span className="shrink-0">{formatVNDate(tx.transactionDate, "short")}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-3">
                        <p
                          className={cn(
                            "font-bold font-mono tabular-nums text-sm",
                            tx.type === "INCOME"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          )}
                        >
                          {tx.type === "INCOME" ? "+" : "-"}
                          {maskCurrency(formatVND(tx.amount), isPrivacyMode)}
                        </p>
                        <Badge
                          variant={tx.type === "INCOME" ? "income" : "expense"}
                          className="mt-0.5 text-[10px] px-2 py-0"
                        >
                          {tx.type === "INCOME" ? "Thu nhập" : "Chi tiêu"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Quick Add Modal */}
      <QuickAddModal
        isOpen={quickAddModalOpen}
        onClose={() => {
          setQuickAddModalOpen(false);
          setQuickAddDate(undefined);
        }}
        categories={categories}
        defaultType={quickAddType}
        defaultDate={quickAddDate}
        onTransactionCreated={() => {
          loadDashboardData(selectedMonth);
        }}
      />

      {/* Receipt Full-Screen Lightbox Modal */}
      <ReceiptLightboxModal
        data={lightboxData}
        isOpen={!!lightboxData}
        onClose={() => setLightboxData(null)}
      />
    </div>
  );
}
