"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Coins,
  Fuel,
  RotateCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatVND } from "@/lib/utils/currency";
import { MarketPricesData } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function MarketPricesWidget() {
  const [data, setData] = useState<MarketPricesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchPrices = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const url = forceRefresh
        ? "/api/v1/market/prices?refresh=true"
        : "/api/v1/market/prices";
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setData(json.data);
          if (forceRefresh) {
            toast.success("Đã cập nhật giá thị trường mới nhất!");
          }
        }
      }
    } catch (err) {
      console.warn("Failed to fetch market prices:", err);
      if (forceRefresh) {
        toast.error("Không thể kết nối máy chủ giá thị trường.");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  // Loading Skeleton State
  if (isLoading && !data) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="h-4 w-36 bg-muted animate-pulse rounded" />
          <div className="h-6 w-16 bg-muted animate-pulse rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-[170px] rounded-2xl bg-card/60 border border-border/60 animate-pulse p-4 flex flex-col justify-between" />
          <div className="h-[170px] rounded-2xl bg-card/60 border border-border/60 animate-pulse p-4 flex flex-col justify-between" />
        </div>
      </div>
    );
  }

  const gold = data?.gold;
  const fuel = data?.fuel;

  return (
    <div className="space-y-2.5">
      {/* Widget Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Chỉ số thị trường thiết yếu</span>
          </div>
          <span className="hidden sm:inline-block text-[11px] text-muted-foreground/70">
            • Tham khảo kế hoạch chi tiêu
          </span>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => fetchPrices(true)}
          disabled={isRefreshing}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
          title="Làm mới giá thị trường"
        >
          <RotateCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-primary")} />
          <span className="hidden sm:inline">Làm mới</span>
        </Button>
      </div>

      {/* 1 Row, 2 Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ================= COLUMN 1: VÀNG NHẪN SJC 99,99% (1 CHỈ) ================= */}
        <Card className="relative overflow-hidden border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-amber-500/[0.03] to-background shadow-xs hover:shadow-md transition-all rounded-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

          <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full gap-4">
            {/* Card Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-xs border border-amber-500/30">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base leading-tight text-foreground flex items-center gap-1.5">
                    <span>{gold?.name || "Vàng nhẫn SJC 99,99% (1 chỉ)"}</span>
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Đơn vị tính: 1 chỉ vàng (3.75g)
                  </p>
                </div>
              </div>

              {/* Live Badge */}
              <Badge
                variant="outline"
                className="shrink-0 text-[10px] font-semibold border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10 gap-1.5 px-2 py-0.5"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </span>
                <span>SJC Online</span>
              </Badge>
            </div>

            {/* Price Numbers Section */}
            <div className="grid grid-cols-2 gap-2 bg-background/60 dark:bg-card/40 border border-border/50 rounded-xl p-3 backdrop-blur-xs">
              {/* Giá Bán (Primary Metric) */}
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Giá bán ra</p>
                <p className="text-lg sm:text-xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight mt-0.5">
                  {gold ? `${formatVND(gold.sellPrice)}` : "—"}
                </p>
                <span className="text-[10px] text-muted-foreground">/ 1 chỉ</span>
              </div>

              {/* Giá Mua & Chênh lệch */}
              <div className="border-l border-border/60 pl-3">
                <p className="text-[11px] font-medium text-muted-foreground">Giá mua vào</p>
                <p className="text-sm sm:text-base font-bold text-foreground mt-0.5">
                  {gold ? formatVND(gold.buyPrice) : "—"}
                </p>
                {gold && gold.spread > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Chênh lệch: <span className="font-semibold">{formatVND(gold.spread)}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Card Footer */}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
              <span>Cập nhật: {gold?.updatedAt || "Hôm nay"}</span>
              <a
                href="https://sjc.com.vn/gia-vang-online"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                title="Xem bảng giá chính thức tại SJC"
              >
                <span>sjc.com.vn</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </CardContent>
        </Card>

        {/* ================= COLUMN 2: XĂNG E10 RON 95-III (VIETFUEL) ================= */}
        <Card className="relative overflow-hidden border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-emerald-500/[0.03] to-background shadow-xs hover:shadow-md transition-all rounded-2xl">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

          <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full gap-4">
            {/* Card Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs border border-emerald-500/30">
                  <Fuel className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base leading-tight text-foreground flex items-center gap-1.5">
                    <span>{fuel?.fuelName || "Xăng E10 RON 95-III"}</span>
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Nhiên liệu sinh học tiêu chuẩn khí thải Euro 3
                  </p>
                </div>
              </div>

              {/* Trend / Status Badge */}
              <Badge
                variant="outline"
                className={cn(
                  "shrink-0 text-[10px] font-semibold gap-1 px-2 py-0.5 border",
                  fuel?.trend === "DOWN"
                    ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10"
                    : fuel?.trend === "UP"
                    ? "border-rose-500/40 text-rose-700 dark:text-rose-300 bg-rose-500/10"
                    : "border-border text-muted-foreground bg-muted/40"
                )}
              >
                {fuel?.trend === "DOWN" ? (
                  <>
                    <TrendingDown className="w-3 h-3" />
                    <span>{fuel.changeAmount ? `Giảm ${formatVND(fuel.changeAmount)}` : "Hạ giá"}</span>
                  </>
                ) : fuel?.trend === "UP" ? (
                  <>
                    <TrendingUp className="w-3 h-3" />
                    <span>{fuel.changeAmount ? `Tăng ${formatVND(fuel.changeAmount)}` : "Tăng giá"}</span>
                  </>
                ) : (
                  <>
                    <Minus className="w-3 h-3" />
                    <span>Ổn định</span>
                  </>
                )}
              </Badge>
            </div>

            {/* Price Numbers Section */}
            <div className="grid grid-cols-2 gap-2 bg-background/60 dark:bg-card/40 border border-border/50 rounded-xl p-3 backdrop-blur-xs">
              {/* Giá Vùng 1 (Primary Metric) */}
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Giá bán lẻ Vùng 1</p>
                <p className="text-lg sm:text-xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight mt-0.5">
                  {fuel ? formatVND(fuel.priceZone1) : "—"}
                </p>
                <span className="text-[10px] text-muted-foreground">/ 1 lít</span>
              </div>

              {/* Giá Vùng 2 & Kỳ điều hành */}
              <div className="border-l border-border/60 pl-3">
                <p className="text-[11px] font-medium text-muted-foreground">Giá bán lẻ Vùng 2</p>
                <p className="text-sm sm:text-base font-bold text-foreground mt-0.5">
                  {fuel?.priceZone2 ? formatVND(fuel.priceZone2) : "—"}
                </p>
                <span className="text-[10px] text-muted-foreground">/ 1 lít (vùng xa)</span>
              </div>
            </div>

            {/* Card Footer */}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
              <span>{fuel?.effectiveDate ? `Kỳ áp dụng: ${fuel.effectiveDate}` : "Kỳ điều hành Bộ Công Thương"}</span>
              <a
                href="https://github.com/TranQui004/vietfuel-api"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                title="Xem nguồn dữ liệu VietFuel API"
              >
                <span>VietFuel API</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
