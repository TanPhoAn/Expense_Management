"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FinancialHealthData } from "@/types";
import {
  Sparkles,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  CheckCircle,
  RefreshCw,
  Loader2,
  ShieldCheck,
} from "lucide-react";

interface FinancialHealthCardProps {
  month: string;
  isPrivacyMode?: boolean;
}

export function FinancialHealthCard({
  month,
  isPrivacyMode = false,
}: FinancialHealthCardProps) {
  const [data, setData] = useState<FinancialHealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchHealthData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const res = await fetch(`/api/v1/ai/financial-health?month=${month}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data || null);
      }
    } catch (err) {
      console.warn("Fetch health error:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [month]);

  useEffect(() => {
    fetchHealthData();
  }, [fetchHealthData]);

  // Listen to transaction created event
  useEffect(() => {
    const handleTransactionCreated = () => {
      fetchHealthData(true);
    };
    window.addEventListener("pocketflow:transaction-created", handleTransactionCreated);
    return () => {
      window.removeEventListener("pocketflow:transaction-created", handleTransactionCreated);
    };
  }, [fetchHealthData]);

  const score = data?.score ?? 70;
  const grade = data?.grade ?? "GOOD";
  const gradeLabel = data?.gradeLabel ?? "Tốt";

  // Score colors
  const getScoreColor = () => {
    switch (grade) {
      case "EXCELLENT":
        return {
          stroke: "stroke-emerald-500",
          text: "text-emerald-500",
          bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        };
      case "GOOD":
        return {
          stroke: "stroke-blue-500",
          text: "text-blue-500",
          bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
        };
      case "FAIR":
        return {
          stroke: "stroke-amber-500",
          text: "text-amber-500",
          bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
        };
      case "AT_RISK":
        return {
          stroke: "stroke-rose-500",
          text: "text-rose-500",
          bg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 animate-pulse",
        };
    }
  };

  const colors = getScoreColor();
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <Card className="rounded-2xl border bg-card/60 backdrop-blur-xs shadow-xs overflow-hidden flex flex-col justify-between">
      <CardHeader className="p-4 sm:p-5 border-b flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-sm sm:text-base font-bold truncate">
              Sức khỏe tài chính & AI Cố vấn
            </CardTitle>
            <p className="text-[11px] text-muted-foreground truncate">
              Chỉ số 50/30/20 & Phân tích Gemini
            </p>
          </div>
        </div>

        <Button
          size="icon"
          variant="ghost"
          onClick={() => fetchHealthData(true)}
          disabled={isLoading || isRefreshing}
          className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
          title="Phân tích lại"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
        </Button>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        {isLoading ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span>AI đang chấm điểm tài chính...</span>
          </div>
        ) : (
          <>
            {/* Top row: Circular Gauge + Metrics pills */}
            <div className="flex items-center gap-4 sm:gap-6">
              {/* Circular Gauge */}
              <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
                  {/* Background track */}
                  <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    className="stroke-muted fill-none"
                    strokeWidth="8"
                  />
                  {/* Animated score progress */}
                  <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    className={`${colors.stroke} fill-none transition-all duration-1000 ease-out`}
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className={`text-2xl font-black font-mono tracking-tight ${colors.text}`}>
                    {score}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium -mt-0.5">/100</span>
                </div>
              </div>

              {/* Grade badge and quick stats */}
              <div className="flex-1 space-y-2 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${colors.bg}`}
                  >
                    {gradeLabel}
                  </span>
                  <span className="text-[11px] text-muted-foreground hidden sm:inline">
                    Quy tắc 50/30/20
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-muted/30 border border-border/40">
                    <span className="text-[10px] text-muted-foreground block truncate">
                      Tỷ lệ tiết kiệm
                    </span>
                    <span className="font-mono font-bold text-foreground">
                      {isPrivacyMode ? "••%" : `${data?.metrics.savingsRate ?? 0}%`}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-muted/30 border border-border/40">
                    <span className="text-[10px] text-muted-foreground block truncate">
                      Giữ ngân sách
                    </span>
                    <span className="font-mono font-bold text-foreground">
                      {data?.metrics.budgetAdherenceRate ?? 100}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Insights 3-bullet breakdown */}
            <div className="space-y-2 pt-1">
              {/* Highlight */}
              {data?.aiInsights.highlight && (
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-xs">
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="font-semibold text-emerald-800 dark:text-emerald-300 block text-[11px]">
                      Điểm sáng
                    </span>
                    <p className="text-foreground/90 text-xs leading-relaxed">
                      {data.aiInsights.highlight}
                    </p>
                  </div>
                </div>
              )}

              {/* Warning */}
              {data?.aiInsights.warning && (
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/15 text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="font-semibold text-amber-800 dark:text-amber-300 block text-[11px]">
                      Cảnh báo
                    </span>
                    <p className="text-foreground/90 text-xs leading-relaxed">
                      {data.aiInsights.warning}
                    </p>
                  </div>
                </div>
              )}

              {/* Actionable Recommendation */}
              {data?.aiInsights.recommendation && (
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-primary/5 border border-primary/15 text-xs">
                  <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="font-semibold text-primary block text-[11px]">
                      Lời khuyên hành động
                    </span>
                    <p className="text-foreground/90 text-xs leading-relaxed">
                      {data.aiInsights.recommendation}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
