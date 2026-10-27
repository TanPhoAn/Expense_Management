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
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatVND } from "@/lib/utils/currency";
import { formatVNDate } from "@/lib/utils/date";
import { CategoryBreakdownItem, MonthlyTrendItem, DailyExpenseTrendItem } from "@/types";

interface DashboardChartsProps {
  breakdown: CategoryBreakdownItem[];
  trends: MonthlyTrendItem[];
  dailyTrends?: DailyExpenseTrendItem[];
  selectedMonth: string;
}

export function DashboardCharts({
  breakdown,
  trends,
  dailyTrends = [],
  selectedMonth,
}: DashboardChartsProps) {
  const [activeTab, setActiveTab] = useState<"monthly" | "daily">("monthly");

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
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
      {/* Trends Card (Bar Chart / Daily Line Chart) */}
      <Card className="lg:col-span-4 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base sm:text-lg">
              {activeTab === "monthly" ? "Xu hướng thu chi qua các tháng" : `Chi tiêu từng ngày tháng ${selectedMonth}`}
            </CardTitle>
            <CardDescription className="text-xs">
              {activeTab === "monthly"
                ? "So sánh tổng thu nhập và chi tiêu 6 tháng gần nhất"
                : "Biến động chi tiêu theo ngày thực tế phát sinh"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("monthly")}
              className={`px-2.5 py-1 rounded-md transition-all ${
                activeTab === "monthly" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Theo tháng
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("daily")}
              className={`px-2.5 py-1 rounded-md transition-all ${
                activeTab === "daily" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Theo ngày
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full pt-2">
            {activeTab === "monthly" ? (
              trendData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Chưa có dữ liệu xu hướng giao dịch
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`}
                    />
                    <Tooltip
                      formatter={(val: number) => [formatVND(val), ""]}
                      labelStyle={{ fontWeight: "bold" }}
                      contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                    />
                    <Legend />
                    <Bar dataKey="Thu nhập" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Chi tiêu" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )
            ) : dailyData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Chưa có khoản chi tiêu nào phát sinh trong tháng {selectedMonth}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    labelFormatter={(_label, payload) => {
                      if (payload && payload[0]?.payload?.fullDate) {
                        return formatVNDate(payload[0].payload.fullDate, "short");
                      }
                      return "";
                    }}
                    formatter={(val: number) => [formatVND(val), "Tổng chi"]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="Chi tiêu"
                    stroke="#f43f5e"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#f43f5e" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Expense Breakdown (Donut Chart) */}
      <Card className="lg:col-span-3 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Cơ cấu chi tiêu</CardTitle>
          <CardDescription className="text-xs">Tỷ lệ phân bổ chi tiêu theo danh mục tháng {selectedMonth}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full flex flex-col items-center justify-center">
            {pieData.length === 0 ? (
              <div className="text-sm text-muted-foreground">Chưa có khoản chi tiêu nào trong tháng</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || "#64748b"} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => [formatVND(val), "Tổng chi"]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}

            {/* List breakdown summary */}
            {pieData.length > 0 && (
              <div className="w-full grid grid-cols-2 gap-2 mt-2 max-h-[80px] overflow-y-auto text-xs">
                {pieData.slice(0, 4).map((item) => (
                  <div key={item.name} className="flex items-center gap-1.5 truncate">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="truncate">{item.name}:</span>
                    <span className="font-semibold text-foreground">{item.percentage}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
