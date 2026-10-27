"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Wallet,
  TrendingDown,
  Calendar,
  ChevronRight,
  ArrowDownRight,
  ArrowUpRight,
  Receipt,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardCharts } from "@/features/dashboard/components/DashboardCharts";
import { formatVND } from "@/lib/utils/currency";
import { getVietnamCurrentMonthString, formatVNDate } from "@/lib/utils/date";
import {
  DashboardSummary,
  CategoryBreakdownItem,
  MonthlyTrendItem,
  DailyExpenseTrendItem,
  Transaction,
  Category,
} from "@/types";
import { QuickAddModal } from "@/features/transactions/components/QuickAddModal";
import { PlusCircle } from "lucide-react";

export default function DashboardPage() {
  const [selectedMonth, setSelectedMonth] = useState<string>(getVietnamCurrentMonthString());
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [breakdown, setBreakdown] = useState<CategoryBreakdownItem[]>([]);
  const [trends, setTrends] = useState<MonthlyTrendItem[]>([]);
  const [dailyTrends, setDailyTrends] = useState<DailyExpenseTrendItem[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [quickAddModalOpen, setQuickAddModalOpen] = useState(false);
  const [quickAddType, setQuickAddType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = async (month: string) => {
    setIsLoading(true);
    try {
      const [sumRes, breakRes, trendRes, dailyRes, txRes, catRes] = await Promise.all([
        fetch(`/api/v1/dashboard/summary?month=${month}`),
        fetch(`/api/v1/dashboard/expense-breakdown?month=${month}`),
        fetch(`/api/v1/dashboard/trends?months=6`),
        fetch(`/api/v1/dashboard/trends?month=${month}`),
        fetch(`/api/v1/transactions?pageSize=5`),
        fetch(`/api/v1/categories`),
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

  return (
    <div className="space-y-6">
      {/* Dashboard Top Header & Month Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Bảng điều khiển tài chính</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tổng hợp tình hình tài chính thực tế theo giờ Việt Nam
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              setQuickAddType("EXPENSE");
              setQuickAddModalOpen(true);
            }}
            className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-sm text-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Thêm chi tiêu</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setQuickAddType("INCOME");
              setQuickAddModalOpen(true);
            }}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm text-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Thêm thu nhập</span>
          </Button>

          <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-1.5 shadow-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Kỳ báo cáo:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-sm font-semibold bg-transparent border-0 focus:outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 4 Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Expense */}
        <Card className="shadow-sm border-l-4 border-l-rose-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Chi tiêu hôm nay
            </CardTitle>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950">
              <TrendingDown className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {formatVND(summary?.todayExpense || "0")}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Chỉ tính các khoản chi phát sinh trong ngày hôm nay
            </p>
          </CardContent>
        </Card>

        {/* Monthly Income */}
        <Card className="shadow-sm border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Tổng thu nhập tháng
            </CardTitle>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatVND(summary?.monthlyIncome || "0")}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Trong tháng {selectedMonth}
            </p>
          </CardContent>
        </Card>

        {/* Monthly Expense */}
        <Card className="shadow-sm border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Tổng chi tiêu tháng
            </CardTitle>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {formatVND(summary?.monthlyExpense || "0")}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Trong tháng {selectedMonth}
            </p>
          </CardContent>
        </Card>

        {/* Remaining Balance */}
        <Card className={`shadow-sm border-l-4 ${isBalanceNegative ? 'border-l-rose-600 bg-rose-50/20' : 'border-l-primary'}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Số dư còn lại
            </CardTitle>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Wallet className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                isBalanceNegative
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-slate-900 dark:text-white"
              }`}
            >
              {formatVND(summary?.remainingBalance || "0")}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Thu nhập trừ chi tiêu tháng {selectedMonth}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Visual Analytics Charts */}
      <DashboardCharts
        breakdown={breakdown}
        trends={trends}
        dailyTrends={dailyTrends}
        selectedMonth={selectedMonth}
      />

      {/* Recent Transactions Section */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Giao dịch gần đây</CardTitle>
            <p className="text-xs text-muted-foreground">Các khoản thu chi mới ghi nhận</p>
          </div>
          <Link href="/transactions">
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              Xem tất cả <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm space-y-3">
              <Receipt className="w-10 h-10 mx-auto text-muted-foreground/50" />
              <p>Chưa có giao dịch nào được ghi nhận.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm shrink-0"
                      style={{ backgroundColor: tx.category?.color || "#64748b" }}
                    >
                      {tx.category?.name.charAt(0) || "T"}
                    </div>
                    <div>
                      <p className="font-semibold text-sm leading-snug">{tx.description}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{tx.category?.name || "Chưa phân loại"}</span>
                        <span>•</span>
                        <span>{formatVNDate(tx.transactionDate, "short")}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p
                      className={`font-bold text-sm ${
                        tx.type === "INCOME"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {tx.type === "INCOME" ? "+" : "-"}
                      {formatVND(tx.amount)}
                    </p>
                    <Badge variant={tx.type === "INCOME" ? "income" : "expense"} className="mt-1">
                      {tx.type === "INCOME" ? "Thu nhập" : "Chi tiêu"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Add Modal triggered from dashboard buttons */}
      <QuickAddModal
        isOpen={quickAddModalOpen}
        onClose={() => setQuickAddModalOpen(false)}
        categories={categories}
        defaultType={quickAddType}
        onTransactionCreated={() => {
          loadDashboardData(selectedMonth);
        }}
      />
    </div>
  );
}
