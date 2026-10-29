"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  TooltipProps,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatVND } from "@/lib/utils/currency";
import { formatVNDate } from "@/lib/utils/date";
import { CategoryBreakdownItem, MonthlyTrendItem, DailyExpenseTrendItem } from "@/types";
import { TrendingUp, TrendingDown, PieChart as PieIcon, BarChart3, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardChartsProps {
  breakdown: CategoryBreakdownItem[];
  trends: MonthlyTrendItem[];
  dailyTrends?: DailyExpenseTrendItem[];
  selectedMonth: string;
}

/**
 * Custom Glassmorphism Tooltip for Monthly Trends
 */
function CustomMonthlyTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-popover/95 backdrop-blur-md border border-border/80 shadow-xl rounded-xl p-3 text-popover-foreground text-xs min-w-[160px] animate-in fade-in-0 zoom-in-95 duration-150">
      <p className="font-bold text-foreground mb-1.5 border-b pb-1">Tháng {label}</p>
      <div className="space-y-1">
        {payload.map((entry, idx) => (
          <div key={`item-${idx}`} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground">{entry.name}:</span>
            </div>
            <span className="font-semibold font-mono tabular-nums text-foreground">
              {formatVND(entry.value || 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Custom Glassmorphism Tooltip for Daily Expense Trend
 */
function CustomDailyTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || !payload.length) return null;

  const dataPoint = payload[0]?.payload;
  const fullDate = dataPoint?.fullDate;

  return (
    <div className="bg-popover/95 backdrop-blur-md border border-border/80 shadow-xl rounded-xl p-3 text-popover-foreground text-xs min-w-[150px] animate-in fade-in-0 zoom-in-95 duration-150">
      <p className="font-bold text-foreground mb-1">
        {fullDate ? formatVNDate(fullDate, "short") : dataPoint?.name}
      </p>
      <div className="flex items-center justify-between gap-3 pt-1 border-t">
        <span className="text-muted-foreground">Chi tiêu:</span>
        <span className="font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
          {formatVND(payload[0].value || 0)}
        </span>
      </div>
    </div>
  );
}

export function DashboardCharts({
  breakdown,
  trends,
  dailyTrends = [],
  selectedMonth,
}: DashboardChartsProps) {
  const [activeTab, setActiveTab] = useState<"monthly" | "daily">("monthly");
  const [hoveredSlice, setHoveredSlice] = useState<CategoryBreakdownItem | null>(null);

  const trendData = trends.map((t) => ({
    name: t.month,
    "Thu nhập": parseFloat(t.income),
    "Chi tiêu": parseFloat(t.expense),
  }));

  const dailyData = dailyTrends.map((d) => ({
    name: d.date.substring(8, 10) + "/" + d.date.substring(5, 7),
    fullDate: d.date,
    "Chi tiêu": parseFloat(d.amount),
  }));

  const pieData = breakdown.map((b) => ({
    name: b.categoryName,
    value: parseFloat(b.totalAmount),
    color: b.color,
    percentage: b.percentage,
    raw: b,
  }));

  const totalExpense = breakdown.reduce((sum, b) => sum + parseFloat(b.totalAmount || "0"), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
      {/* Trends Card (Bar Chart / Daily Line Chart) */}
      <Card className="lg:col-span-4 shadow-sm border rounded-2xl overflow-hidden bg-card/60 backdrop-blur-xs">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-3 border-b bg-card/30">
          <div>
            <CardTitle className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <span>
                {activeTab === "monthly"
                  ? "Xu hướng thu chi qua các tháng"
                  : `Biến động chi tiêu tháng ${selectedMonth}`}
              </span>
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              {activeTab === "monthly"
                ? "So sánh dòng tiền 6 tháng gần nhất"
                : "Diễn biến các khoản chi theo từng ngày"}
            </CardDescription>
          </div>

          <div className="flex items-center gap-1 bg-muted/70 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto border border-border/40">
            <button
              type="button"
              onClick={() => setActiveTab("monthly")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                activeTab === "monthly"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Theo tháng
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("daily")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all cursor-pointer",
                activeTab === "daily"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Theo ngày
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5">
          <div className="h-[280px] sm:h-[310px] w-full pt-2">
            {activeTab === "monthly" ? (
              trendData.length === 0 ? (
                <div className="flex flex-col h-full items-center justify-center text-sm text-muted-foreground gap-2">
                  <BarChart3 className="w-8 h-8 text-muted-foreground/40" />
                  <span>Chưa có dữ liệu xu hướng thu chi</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/40" />
                    <XAxis
                      dataKey="name"
                      stroke="#888888"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `${(val / 1000000).toFixed(0)}tr`}
                    />
                    <Tooltip content={<CustomMonthlyTooltip />} />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      formatter={(value) => (
                        <span className="text-xs font-medium text-foreground mr-3">{value}</span>
                      )}
                    />
                    <Bar
                      dataKey="Thu nhập"
                      fill="#10b981"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={32}
                    />
                    <Bar
                      dataKey="Chi tiêu"
                      fill="#f43f5e"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={32}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )
            ) : dailyData.length === 0 ? (
              <div className="flex flex-col h-full items-center justify-center text-sm text-muted-foreground gap-2">
                <Calendar className="w-8 h-8 text-muted-foreground/40" />
                <span>Chưa có khoản chi tiêu nào trong tháng {selectedMonth}</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/40" />
                  <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomDailyTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="Chi tiêu"
                    stroke="#f43f5e"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#f43f5e" }}
                    activeDot={{ r: 5, strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Expense Breakdown (Interactive Donut Chart) */}
      <Card className="lg:col-span-3 shadow-sm border rounded-2xl overflow-hidden bg-card/60 backdrop-blur-xs">
        <CardHeader className="pb-2 border-b bg-card/30">
          <CardTitle className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-amber-500" />
            <span>Cơ cấu chi tiêu</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Tỷ lệ phân bổ theo danh mục tháng {selectedMonth}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-[320px] sm:h-[350px]">
          {pieData.length === 0 ? (
            <div className="flex flex-col h-full items-center justify-center text-sm text-muted-foreground gap-2">
              <PieIcon className="w-8 h-8 text-muted-foreground/40" />
              <span>Chưa có dữ liệu chi tiêu trong tháng</span>
            </div>
          ) : (
            <>
              {/* Donut Container with Centered Metric */}
              <div className="relative h-[200px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={88}
                      paddingAngle={4}
                      dataKey="value"
                      onMouseEnter={(_, index) => setHoveredSlice(pieData[index].raw)}
                      onMouseLeave={() => setHoveredSlice(null)}
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color || "#64748b"}
                          className="transition-opacity hover:opacity-85 cursor-pointer outline-none"
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                {/* Center of Donut Metric Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none text-center px-4">
                  <span className="text-[11px] font-medium text-muted-foreground truncate max-w-[130px]">
                    {hoveredSlice ? hoveredSlice.categoryName : "Tổng chi"}
                  </span>
                  <span className="text-sm sm:text-base font-extrabold font-mono tabular-nums text-foreground tracking-tight">
                    {formatVND(hoveredSlice ? hoveredSlice.totalAmount : totalExpense)}
                  </span>
                  {hoveredSlice && (
                    <span className="text-[10px] font-semibold text-primary">
                      {hoveredSlice.percentage}%
                    </span>
                  )}
                </div>
              </div>

              {/* Category Pills Breakdown */}
              <div className="w-full grid grid-cols-2 gap-2 pt-2 border-t mt-1 overflow-y-auto max-h-[105px] pr-1">
                {pieData.map((item) => (
                  <div
                    key={item.name}
                    onMouseEnter={() => setHoveredSlice(item.raw)}
                    onMouseLeave={() => setHoveredSlice(null)}
                    className={cn(
                      "flex items-center justify-between gap-1.5 p-1.5 rounded-lg border border-transparent text-xs transition-colors cursor-pointer",
                      hoveredSlice?.categoryName === item.name
                        ? "bg-muted/80 border-border"
                        : "hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate text-foreground font-medium">{item.name}</span>
                    </div>
                    <span className="font-bold font-mono tabular-nums text-muted-foreground shrink-0 text-[11px]">
                      {item.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
