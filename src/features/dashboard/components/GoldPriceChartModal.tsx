"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  TooltipProps,
} from "recharts";
import {
  Coins,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Calendar,
  Sparkles,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";
import { GoldPriceHistoryResponse, GoldPriceHistoryItem } from "@/types";
import { formatVND } from "@/lib/utils/currency";
import { formatGoldPriceMillion } from "@/features/market/utils/goldHistoryHelpers";
import { cn } from "@/lib/utils";

interface GoldPriceChartModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Custom Glassmorphism Tooltip for Gold Price Trend
 */
function CustomGoldTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || !payload.length) return null;

  const item = payload[0]?.payload as GoldPriceHistoryItem | undefined;
  if (!item) return null;

  const isUp = (item.changeAmount || 0) > 0;
  const isDown = (item.changeAmount || 0) < 0;

  return (
    <div className="bg-popover/95 backdrop-blur-md border border-border shadow-xl rounded-xl p-3 text-popover-foreground text-xs min-w-[190px] animate-in fade-in-0 zoom-in-95 duration-150">
      <div className="flex items-center justify-between border-b pb-1.5 mb-2 gap-2">
        <span className="font-bold text-foreground">{item.fullDate || item.date}</span>
        {item.changeAmount !== undefined && item.changeAmount !== 0 && (
          <span
            className={cn(
              "font-mono font-bold text-[10px] flex items-center gap-0.5",
              isUp ? "text-emerald-500" : isDown ? "text-rose-500" : "text-muted-foreground"
            )}
          >
            {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {isUp ? "+" : ""}
            {item.changePercentage}%
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
            <span className="text-muted-foreground">Giá Bán ra:</span>
          </div>
          <span className="font-bold font-mono tabular-nums text-amber-500">
            {formatVND(item.sellPrice)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-muted-foreground">Giá Mua vào:</span>
          </div>
          <span className="font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatVND(item.buyPrice)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/50 text-[11px]">
          <span className="text-muted-foreground">Chênh lệch:</span>
          <span className="font-mono text-muted-foreground">
            {formatVND(item.spread)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function GoldPriceChartModal({ isOpen, onClose }: GoldPriceChartModalProps) {
  const [days, setDays] = useState<number>(7);
  const [data, setData] = useState<GoldPriceHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showBuy, setShowBuy] = useState(true);
  const [showSell, setShowSell] = useState(true);

  const fetchHistory = useCallback(async (selectedDays: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/market/gold-history?days=${selectedDays}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setData(json.data);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch gold price history:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchHistory(days);
    }
  }, [isOpen, days, fetchHistory]);

  const summary = data?.summary;
  const history = data?.history || [];

  const isUp = summary?.weekTrend === "UP";
  const isDown = summary?.weekTrend === "DOWN";

  // Calculate Y-axis domain with padding for dynamic zoom
  const allValues = history.flatMap((h) => [
    showBuy ? h.buyPrice : null,
    showSell ? h.sellPrice : null,
  ]).filter((v): v is number => v !== null && v > 0);

  const minY = allValues.length > 0 ? Math.floor((Math.min(...allValues) - 400000) / 1000000) * 1000000 : 80000000;
  const maxY = allValues.length > 0 ? Math.ceil((Math.max(...allValues) + 400000) / 1000000) * 1000000 : 95000000;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[96vw] sm:max-w-2xl p-0 overflow-hidden rounded-2xl max-h-[94vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 border-b bg-card/60 backdrop-blur-xs flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
                <Coins className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold truncate">
                  Biểu đồ Giá Vàng SJC 99.99%
                </DialogTitle>
                <p className="text-xs text-muted-foreground truncate">
                  Nhẫn tròn trơn SJ9999 • Xu hướng {days} ngày qua
                </p>
              </div>
            </div>

            {/* Range Switcher (7 ngày vs 30 ngày) */}
            <div className="flex items-center bg-muted/80 p-0.5 rounded-xl border border-border/60 shrink-0">
              <button
                type="button"
                onClick={() => setDays(7)}
                className={cn(
                  "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                  days === 7
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                7 Ngày
              </button>
              <button
                type="button"
                onClick={() => setDays(30)}
                className={cn(
                  "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                  days === 30
                    ? "bg-card text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                30 Ngày
              </button>
            </div>
          </div>

          {/* Mini KPI Bar */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="p-2.5 bg-muted/30 rounded-xl border border-border/50">
                <span className="text-[10px] text-muted-foreground block font-medium">Bán ra hiện tại</span>
                <span className="font-mono text-xs sm:text-sm font-extrabold text-amber-500 tabular-nums">
                  {formatVND(summary.currentSell)}
                </span>
              </div>

              <div className="p-2.5 bg-muted/30 rounded-xl border border-border/50">
                <span className="text-[10px] text-muted-foreground block font-medium">Mua vào hiện tại</span>
                <span className="font-mono text-xs sm:text-sm font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatVND(summary.currentBuy)}
                </span>
              </div>

              <div className="p-2.5 bg-muted/30 rounded-xl border border-border/50">
                <span className="text-[10px] text-muted-foreground block font-medium">Biến động {days}N</span>
                <div className="flex items-center gap-1 font-mono text-xs sm:text-sm font-extrabold tabular-nums">
                  <span className={cn(isUp ? "text-emerald-500" : isDown ? "text-rose-500" : "text-muted-foreground")}>
                    {isUp ? "+" : ""}{summary.weekChangePercentage}%
                  </span>
                  {isUp && <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                  {isDown && <TrendingDown className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
                  {!isUp && !isDown && <Minus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                </div>
              </div>

              <div className="p-2.5 bg-muted/30 rounded-xl border border-border/50">
                <span className="text-[10px] text-muted-foreground block font-medium">Cao / Thấp {days}N</span>
                <span className="font-mono text-xs font-bold tabular-nums text-foreground">
                  {formatGoldPriceMillion(summary.weekHigh)} / {formatGoldPriceMillion(summary.weekLow)}
                </span>
              </div>
            </div>
          )}
        </DialogHeader>

        {/* Chart Body */}
        <div className="p-3 sm:p-5 flex-1 overflow-hidden flex flex-col justify-center">
          {isLoading ? (
            <div className="h-[280px] sm:h-[320px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              <span className="text-xs">Đang tải lịch sử giá vàng...</span>
            </div>
          ) : history.length === 0 ? (
            <div className="h-[280px] sm:h-[320px] flex items-center justify-center text-xs text-muted-foreground">
              Chưa có dữ liệu biến động giá vàng trong khoảng thời gian này.
            </div>
          ) : (
            <div className="space-y-3">
              {/* Curve toggles */}
              <div className="flex items-center justify-between text-xs px-1">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowSell(!showSell)}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-semibold transition-colors cursor-pointer",
                      showSell
                        ? "border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "border-border text-muted-foreground/60 line-through"
                    )}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Giá Bán ra</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowBuy(!showBuy)}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-semibold transition-colors cursor-pointer",
                      showBuy
                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-border text-muted-foreground/60 line-through"
                    )}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Giá Mua vào</span>
                  </button>
                </div>

                <span className="text-[10px] text-muted-foreground hidden sm:inline">
                  Đơn vị: Triệu VND / lượng
                </span>
              </div>

              {/* Recharts Area Container */}
              <div className="w-full h-[270px] sm:h-[310px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={history}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="goldSellGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="goldBuyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="currentColor"
                      className="text-border/40"
                    />

                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "currentColor" }}
                      className="text-muted-foreground font-mono"
                    />

                    <YAxis
                      domain={[minY, maxY]}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `${(val / 1000000).toFixed(1)} tr`}
                      tick={{ fontSize: 10, fill: "currentColor" }}
                      className="text-muted-foreground font-mono"
                    />

                    <Tooltip content={<CustomGoldTooltip />} />

                    {showSell && (
                      <Area
                        type="monotone"
                        dataKey="sellPrice"
                        name="Giá Bán ra"
                        stroke="#f59e0b"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#goldSellGrad)"
                        activeDot={{ r: 5, strokeWidth: 2, stroke: "#ffffff" }}
                      />
                    )}

                    {showBuy && (
                      <Area
                        type="monotone"
                        dataKey="buyPrice"
                        name="Giá Mua vào"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#goldBuyGrad)"
                        activeDot={{ r: 5, strokeWidth: 2, stroke: "#ffffff" }}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-3 sm:p-4 border-t bg-card/60 backdrop-blur-xs flex flex-row items-center justify-between shrink-0">
          <span className="text-[11px] text-muted-foreground">
            Nguồn: Công ty Vàng Bạc Đá Quý Sài Gòn (SJC)
          </span>

          <Button type="button" size="sm" variant="outline" onClick={onClose} className="text-xs h-8">
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
