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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Category, StatementData } from "@/types";
import {
  FileSpreadsheet,
  FileText,
  Printer,
  Download,
  Loader2,
  Calendar,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Wallet,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import {
  getVietnamTodayString,
  getVietnamCurrentMonthString,
  getMonthDateRange,
  formatVNDate,
} from "@/lib/utils/date";
import { formatVND } from "@/lib/utils/currency";
import { triggerPrintStatement } from "../services/statementPrintHelper";
import { toast } from "sonner";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  defaultMonth?: string;
  defaultStartDate?: string;
  defaultEndDate?: string;
}

type ExportTab = "CSV" | "PDF";
type RangePreset = "THIS_MONTH" | "PREV_MONTH" | "THIS_YEAR" | "CUSTOM";

export function ExportModal({
  isOpen,
  onClose,
  categories,
  defaultMonth,
  defaultStartDate,
  defaultEndDate,
}: ExportModalProps) {
  const [activeTab, setActiveTab] = useState<ExportTab>("CSV");
  const [rangePreset, setRangePreset] = useState<RangePreset>("THIS_MONTH");

  // Dates
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>(
    defaultMonth || getVietnamCurrentMonthString()
  );

  // Filters for CSV
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("ALL");

  // State
  const [isDownloadingCsv, setIsDownloadingCsv] = useState(false);
  const [isLoadingStatement, setIsLoadingStatement] = useState(false);
  const [statementData, setStatementData] = useState<StatementData | null>(null);

  // Initialize dates based on preset
  const applyPresetDates = useCallback((preset: RangePreset) => {
    const today = getVietnamTodayString();
    const [yearStr, monthStr] = today.split("-");
    const currentYear = parseInt(yearStr, 10);
    const currentMonthNum = parseInt(monthStr, 10);

    if (preset === "THIS_MONTH") {
      const monthKey = `${yearStr}-${monthStr}`;
      setSelectedMonth(monthKey);
      const range = getMonthDateRange(monthKey);
      setStartDate(range.startDate);
      setEndDate(range.endDate);
    } else if (preset === "PREV_MONTH") {
      let prevYear = currentYear;
      let prevMonth = currentMonthNum - 1;
      if (prevMonth === 0) {
        prevMonth = 12;
        prevYear -= 1;
      }
      const prevMonthKey = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
      setSelectedMonth(prevMonthKey);
      const range = getMonthDateRange(prevMonthKey);
      setStartDate(range.startDate);
      setEndDate(range.endDate);
    } else if (preset === "THIS_YEAR") {
      setSelectedMonth("");
      setStartDate(`${currentYear}-01-01`);
      setEndDate(`${currentYear}-12-31`);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (defaultStartDate && defaultEndDate) {
        setRangePreset("CUSTOM");
        setStartDate(defaultStartDate);
        setEndDate(defaultEndDate);
      } else {
        applyPresetDates("THIS_MONTH");
      }
    }
  }, [isOpen, defaultStartDate, defaultEndDate, applyPresetDates]);

  // Load statement preview whenever activeTab is PDF or dates change
  const loadStatementPreview = useCallback(async () => {
    if (!startDate || !endDate) return;
    setIsLoadingStatement(true);
    try {
      const params = new URLSearchParams();
      if (rangePreset === "THIS_MONTH" || rangePreset === "PREV_MONTH") {
        if (selectedMonth) params.set("month", selectedMonth);
      }
      params.set("startDate", startDate);
      params.set("endDate", endDate);

      const res = await fetch(`/api/v1/export/statement?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setStatementData(json.data || null);
      } else {
        setStatementData(null);
      }
    } catch (err) {
      console.warn("Failed to load statement preview:", err);
      setStatementData(null);
    } finally {
      setIsLoadingStatement(false);
    }
  }, [startDate, endDate, rangePreset, selectedMonth]);

  useEffect(() => {
    if (isOpen && activeTab === "PDF") {
      loadStatementPreview();
    }
  }, [isOpen, activeTab, loadStatementPreview]);

  // Handle Preset Change
  const handlePresetChange = (preset: RangePreset) => {
    setRangePreset(preset);
    if (preset !== "CUSTOM") {
      applyPresetDates(preset);
    }
  };

  // Download CSV
  const handleDownloadCsv = async () => {
    setIsDownloadingCsv(true);
    try {
      const params = new URLSearchParams();
      if (rangePreset === "THIS_MONTH" || rangePreset === "PREV_MONTH") {
        if (selectedMonth) params.set("month", selectedMonth);
      }
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (selectedType !== "ALL") params.set("type", selectedType);
      if (selectedCategoryId !== "ALL") params.set("categoryId", selectedCategoryId);

      const res = await fetch(`/api/v1/export/csv?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Không thể tải file CSV.");
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("content-disposition");
      let filename = `pocketflow-saoke.csv`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      // Trigger browser download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("✨ Đã tải xuống file Excel/CSV thành công!");
    } catch {
      toast.error("Lỗi khi xuất file CSV. Vui lòng thử lại.");
    } finally {
      setIsDownloadingCsv(false);
    }
  };

  // Print / Save PDF
  const handlePrintPdf = () => {
    if (!statementData) {
      toast.error("Đang tải dữ liệu sao kê, vui lòng đợi giây lát.");
      return;
    }
    triggerPrintStatement(statementData);
    toast.success("✨ Đã mở hộp thoại in / xuất file PDF!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-xl p-0 overflow-hidden rounded-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 border-b bg-card/60 backdrop-blur-xs flex flex-col gap-1.5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">
                Xuất Báo cáo & Sao kê Tài chính
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Tải bảng tính Excel chuẩn kế toán hoặc tạo sao kê PDF Infographic
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/80 rounded-xl mt-2">
            <button
              type="button"
              onClick={() => setActiveTab("CSV")}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "CSV"
                  ? "bg-card text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Bảng tính Excel / CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("PDF")}
              className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "PDF"
                  ? "bg-card text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>Sao kê PDF Infographic</span>
            </button>
          </div>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* 1. Time Range Selector (Common to both tabs) */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-foreground">Kỳ sao kê / Thời gian</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => handlePresetChange("THIS_MONTH")}
                className={`py-1.5 px-2 text-xs font-medium rounded-lg border transition-all cursor-pointer text-center ${
                  rangePreset === "THIS_MONTH"
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                    : "border-border/70 hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                Tháng này
              </button>
              <button
                type="button"
                onClick={() => handlePresetChange("PREV_MONTH")}
                className={`py-1.5 px-2 text-xs font-medium rounded-lg border transition-all cursor-pointer text-center ${
                  rangePreset === "PREV_MONTH"
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                    : "border-border/70 hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                Tháng trước
              </button>
              <button
                type="button"
                onClick={() => handlePresetChange("THIS_YEAR")}
                className={`py-1.5 px-2 text-xs font-medium rounded-lg border transition-all cursor-pointer text-center ${
                  rangePreset === "THIS_YEAR"
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                    : "border-border/70 hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                Cả năm nay
              </button>
              <button
                type="button"
                onClick={() => handlePresetChange("CUSTOM")}
                className={`py-1.5 px-2 text-xs font-medium rounded-lg border transition-all cursor-pointer text-center ${
                  rangePreset === "CUSTOM"
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                    : "border-border/70 hover:bg-muted/50 text-muted-foreground"
                }`}
              >
                Tùy chỉnh
              </button>
            </div>

            {/* Custom Date Pickers */}
            {rangePreset === "CUSTOM" && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Từ ngày</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Đến ngày</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>
              </div>
            )}
          </div>

          {/* TAB 1: CSV / EXCEL SETTINGS */}
          {activeTab === "CSV" && (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Type Filter */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Loại giao dịch</Label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Tất cả giao dịch</SelectItem>
                      <SelectItem value="EXPENSE">Chỉ khoản chi tiêu</SelectItem>
                      <SelectItem value="INCOME">Chỉ khoản thu nhập</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Category Filter */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Danh mục</Label>
                  <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue placeholder="Tất cả danh mục" />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      <SelectItem value="ALL">Tất cả danh mục</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Standard Accounting Info Banner */}
              <div className="p-3 bg-muted/40 rounded-xl border border-border/60 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Định dạng kế toán chuẩn Việt Nam (UTF-8 BOM)</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  File CSV đã được nhúng Byte Order Mark tự động, mở mượt mà trên Microsoft Excel (Windows & Mac) và Google Sheets mà không bị lỗi font tiếng Việt. Các cột số tiền lưu ở dạng số nguyên VND giúp bạn dùng hàm <code className="bg-muted px-1 rounded font-mono">=SUM()</code> tính toán trực tiếp.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: PDF STATEMENT LIVE PREVIEW */}
          {activeTab === "PDF" && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">Xem trước sao kê Infographic</span>
                <span className="text-[11px] text-muted-foreground">Phong cách Apple Card</span>
              </div>

              {isLoadingStatement ? (
                <div className="py-12 border rounded-xl flex flex-col items-center justify-center gap-2 bg-muted/20">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Đang tính toán số liệu sao kê...</span>
                </div>
              ) : !statementData ? (
                <div className="p-6 border rounded-xl text-center text-xs text-muted-foreground bg-muted/20">
                  Không tìm thấy dữ liệu sao kê trong khoảng thời gian này.
                </div>
              ) : (
                <div className="rounded-xl border border-border/80 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white p-4 shadow-sm space-y-3">
                  {/* Preview Top */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-emerald-500 text-white flex items-center justify-center text-xs font-black">
                        PF
                      </div>
                      <span className="text-xs font-bold tracking-tight">PocketFlow Statement</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      {statementData.period.label}
                    </span>
                  </div>

                  {/* 4 Mini KPIs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Thu nhập</span>
                      <span className="font-mono text-xs font-bold text-emerald-400">
                        +{formatVND(statementData.summary.totalIncome)}
                      </span>
                    </div>

                    <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Chi tiêu</span>
                      <span className="font-mono text-xs font-bold text-rose-400">
                        -{formatVND(statementData.summary.totalExpense)}
                      </span>
                    </div>

                    <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Dòng tiền ròng</span>
                      <span
                        className={`font-mono text-xs font-bold ${
                          statementData.summary.netSavings >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {statementData.summary.netSavings >= 0 ? "+" : ""}
                        {formatVND(statementData.summary.netSavings)}
                      </span>
                    </div>

                    <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                      <span className="text-[10px] text-slate-400 block">Tiết kiệm</span>
                      <span className="font-mono text-xs font-bold text-indigo-400">
                        {statementData.summary.savingsRate}%
                      </span>
                    </div>
                  </div>

                  {/* Highlights */}
                  <div className="text-[11px] text-slate-300 pt-1 flex items-center justify-between border-t border-white/10">
                    <span>Tổng {statementData.summary.transactionCount} giao dịch đối soát</span>
                    <span className="text-slate-400 text-[10px] font-mono">
                      Xác thực #{statementData.metadata.securityHash}
                    </span>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-muted-foreground">
                Bản sao kê PDF sẽ mở trình duyệt in ấn định dạng A4 sắc nét, bao gồm toàn bộ biểu đồ cơ cấu danh mục, Top 5 khoản chi lớn nhất và bảng kê chi tiết.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-4 border-t bg-card/60 backdrop-blur-xs flex flex-row items-center justify-end gap-2 shrink-0">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs h-9">
            Đóng
          </Button>

          {activeTab === "CSV" ? (
            <Button
              type="button"
              size="sm"
              onClick={handleDownloadCsv}
              disabled={isDownloadingCsv}
              className="text-xs h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
            >
              {isDownloadingCsv ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang tạo CSV...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải file Excel / CSV</span>
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={handlePrintPdf}
              disabled={isLoadingStatement || !statementData}
              className="text-xs h-9 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In / Lưu PDF sao kê</span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
