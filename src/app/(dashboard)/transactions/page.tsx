"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Receipt,
  RotateCcw,
  ZoomIn,
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  X,
  Plus,
  Image as ImageIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatVND, formatNumberVN, sanitizeCurrencyInput } from "@/lib/utils/currency";
import { formatVNDate } from "@/lib/utils/date";
import { getReceiptThumbnailUrl } from "@/lib/utils/image";
import { ReceiptLightboxModal, LightboxData } from "@/components/ui/ReceiptLightboxModal";
import { ReceiptUploadField } from "@/components/ui/ReceiptUploadField";
import { CategoryIcon } from "@/features/categories/components/CategoryIcon";
import {
  calculateTransactionsSummary,
  getQuickDateRange,
  matchDatePreset,
  QuickDatePreset,
} from "@/features/transactions/services/transactionUiHelpers";
import { Transaction, Category } from "@/types";
import { toast } from "sonner";

export default function TransactionsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Edit State
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editType, setEditType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editReceiptUrl, setEditReceiptUrl] = useState<string | null>(null);
  const [lightboxData, setLightboxData] = useState<LightboxData | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete State
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Search Debounce (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const activeDatePreset = useMemo(
    () => matchDatePreset(startDate, endDate),
    [startDate, endDate]
  );

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/v1/categories");
      if (res.ok) {
        const json = await res.json();
        setCategories(json.data || []);
      }
    } catch {
      // ignore
    }
  };

  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", currentPage.toString());
      params.set("pageSize", "15");
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (selectedType !== "ALL") params.set("type", selectedType);
      if (selectedCategory !== "ALL") params.set("categoryId", selectedCategory);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/v1/transactions?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setTransactions(json.data || []);
        if (json.meta) {
          setTotalCount(json.meta.totalCount || 0);
          setTotalPages(json.meta.totalPages || 1);
        }
      }
    } catch (err) {
      console.error("Error loading transactions:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearch, selectedType, selectedCategory, startDate, endDate]);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    loadTransactions();

    const onTxCreated = () => {
      loadTransactions();
    };
    window.addEventListener("pocketflow:transaction-created", onTxCreated);
    return () => window.removeEventListener("pocketflow:transaction-created", onTxCreated);
  }, [loadTransactions]);

  // Real-time summary of currently loaded transactions
  const summary = useMemo(() => calculateTransactionsSummary(transactions), [transactions]);

  const handleOpenEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setEditDesc(tx.description);
    setEditAmount(tx.amount);
    setEditType(tx.type);
    setEditCategoryId(tx.categoryId);
    setEditDate(tx.transactionDate);
    setEditNote(tx.note || "");
    setEditReceiptUrl(tx.receiptUrl || null);
  };

  const handleSaveEdit = async () => {
    if (!editingTx) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/v1/transactions/${editingTx.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: editDesc,
          amount: editAmount,
          type: editType,
          categoryId: editCategoryId,
          transactionDate: editDate,
          note: editNote,
          receiptUrl: editReceiptUrl,
        }),
      });

      if (res.ok) {
        setEditingTx(null);
        toast.success("Cập nhật giao dịch thành công!");
        loadTransactions();
        window.dispatchEvent(new Event("pocketflow:transaction-created"));
      } else {
        const json = await res.json();
        toast.error(json.error?.message || "Không thể cập nhật giao dịch.");
      }
    } catch {
      // error handle
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTxId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/v1/transactions/${deletingTxId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDeletingTxId(null);
        toast.success("Đã xóa giao dịch thành công!");
        loadTransactions();
        window.dispatchEvent(new Event("pocketflow:transaction-created"));
      } else {
        const json = await res.json();
        toast.error(json.error?.message || "Không thể xóa giao dịch.");
      }
    } catch {
      // error handle
    } finally {
      setIsDeleting(false);
    }
  };

  const handleApplyPreset = (preset: QuickDatePreset) => {
    const range = getQuickDateRange(preset);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setSelectedType("ALL");
    setSelectedCategory("ALL");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  const filteredCategoriesForEdit = categories.filter((c) => c.type === editType);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Sổ giao dịch</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tìm kiếm, lọc và quản lý toàn bộ các giao dịch tài chính
          </p>
        </div>
      </div>

      {/* Real-Time Financial Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Tổng thu trang hiện tại */}
        <Card className="border border-emerald-500/25 bg-gradient-to-br from-emerald-500/5 to-transparent shadow-xs">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Tổng thu (Trang)</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-1.5 font-mono tabular-nums text-lg font-bold text-emerald-600 dark:text-emerald-400">
              +{formatVND(summary.totalIncome)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {summary.incomeCount} giao dịch thu
            </div>
          </CardContent>
        </Card>

        {/* Metric 2: Tổng chi trang hiện tại */}
        <Card className="border border-rose-500/25 bg-gradient-to-br from-rose-500/5 to-transparent shadow-xs">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Tổng chi (Trang)</span>
              <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-1.5 font-mono tabular-nums text-lg font-bold text-rose-600 dark:text-rose-400">
              -{formatVND(summary.totalExpense)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {summary.expenseCount} giao dịch chi
            </div>
          </CardContent>
        </Card>

        {/* Metric 3: Chênh lệch ròng (Net flow) */}
        <Card
          className={`border shadow-xs bg-gradient-to-br to-transparent ${
            summary.netFlow >= 0
              ? "border-primary/25 from-primary/5"
              : "border-rose-500/25 from-rose-500/5"
          }`}
        >
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Dòng tiền ròng</span>
              <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div
              className={`mt-1.5 font-mono tabular-nums text-lg font-bold ${
                summary.netFlow >= 0
                  ? "text-primary"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {summary.netFlow >= 0 ? "+" : ""}
              {formatVND(summary.netFlow)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {summary.netFlow >= 0 ? "Thặng dư trang" : "Thâm hụt trang"}
            </div>
          </CardContent>
        </Card>

        {/* Metric 4: Tổng số giao dịch */}
        <Card className="border border-border/60 bg-muted/20 shadow-xs">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Khớp bộ lọc</span>
              <div className="w-7 h-7 rounded-lg bg-muted text-muted-foreground flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-1.5 font-mono tabular-nums text-lg font-bold text-foreground">
              {totalCount} <span className="text-xs font-normal text-muted-foreground">mục</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Hiển thị {transactions.length} trên trang này
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Smart Filter Toolbar */}
      <Card className="shadow-xs border border-border/80 bg-card/60 backdrop-blur-xs">
        <CardContent className="p-4 space-y-3.5">
          {/* Row 1: Search, Type Segmented Control & Category */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search Input with Debounce & Clear Button */}
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Tìm theo mô tả (VD: ăn trưa, xăng, lương...)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 pr-8 text-base sm:text-xs h-10 sm:h-9"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  className="absolute right-2.5 top-2.5 sm:top-2 p-1 text-muted-foreground hover:text-foreground cursor-pointer rounded-full"
                  title="Xóa tìm kiếm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Type Segmented Control */}
            <div className="md:col-span-4 flex items-center bg-muted/60 p-1 rounded-xl border border-border/60">
              <button
                type="button"
                onClick={() => {
                  setSelectedType("ALL");
                  setCurrentPage(1);
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  selectedType === "ALL"
                    ? "bg-background text-foreground shadow-xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedType("EXPENSE");
                  setCurrentPage(1);
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  selectedType === "EXPENSE"
                    ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold shadow-xs border border-rose-500/20"
                    : "text-muted-foreground hover:text-rose-600"
                }`}
              >
                Chi tiêu
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedType("INCOME");
                  setCurrentPage(1);
                }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  selectedType === "INCOME"
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold shadow-xs border border-emerald-500/20"
                    : "text-muted-foreground hover:text-emerald-600"
                }`}
              >
                Thu nhập
              </button>
            </div>

            {/* Category Select with CategoryIcon & Color Dot */}
            <div className="md:col-span-3">
              <Select
                value={selectedCategory}
                onValueChange={(val) => {
                  setSelectedCategory(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-10 sm:h-9 text-xs">
                  <SelectValue placeholder="Danh mục" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả danh mục</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: c.color }}
                        />
                        <CategoryIcon iconName={c.icon} categoryName={c.name} className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{c.name}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          ({c.type === "INCOME" ? "Thu" : "Chi"})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Date Filters & Quick Presets */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-border/50 text-xs">
            {/* Quick Preset Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-muted-foreground text-[11px] font-medium mr-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Nhanh:
              </span>
              <button
                type="button"
                onClick={() => handleApplyPreset("all")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeDatePreset === "all"
                    ? "bg-primary text-white shadow-xs font-semibold"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset("today")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeDatePreset === "today"
                    ? "bg-primary text-white shadow-xs font-semibold"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset("week")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeDatePreset === "week"
                    ? "bg-primary text-white shadow-xs font-semibold"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                Tuần này
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset("month")}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeDatePreset === "month"
                    ? "bg-primary text-white shadow-xs font-semibold"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                Tháng này
              </button>
            </div>

            {/* Custom Date Range & Reset Button */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span className="text-[11px]">Từ</span>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-8 w-32 sm:w-34 text-xs"
                />
                <span className="text-[11px]">Đến</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-8 w-32 sm:w-34 text-xs"
                />
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1 px-2.5"
                title="Xóa toàn bộ bộ lọc"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Đặt lại</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Container */}
      <Card className="shadow-xs border border-border/80 overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-xl animate-pulse">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-2xl" />
                    <div className="space-y-1.5">
                      <Skeleton className="w-36 h-4 rounded" />
                      <Skeleton className="w-24 h-3 rounded" />
                    </div>
                  </div>
                  <Skeleton className="w-28 h-5 rounded" />
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-3">
              <div className="w-14 h-14 rounded-full bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground/60">
                <Receipt className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">Không tìm thấy giao dịch nào</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Không có bản ghi nào khớp với điều kiện lọc hiện tại. Thử đổi từ khóa tìm kiếm hoặc đặt lại bộ lọc.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs gap-1.5 mt-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Đặt lại bộ lọc
              </Button>
            </div>
          ) : (
            <>
              {/* MOBILE FEED VIEW (< 640px) */}
              <div className="block sm:hidden divide-y divide-border/60">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3.5 hover:bg-muted/30 transition-colors flex items-center justify-between gap-3"
                  >
                    {/* Left: Avatar with CategoryIcon & optional Receipt thumbnail */}
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (tx.receiptUrl) {
                            setLightboxData({
                              imageUrl: tx.receiptUrl,
                              description: tx.description,
                              amount: tx.amount,
                              type: tx.type,
                              categoryName: tx.category?.name,
                              transactionDate: tx.transactionDate,
                            });
                          }
                        }}
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-xs transition-transform ${
                          tx.receiptUrl ? "cursor-pointer active:scale-95 ring-2 ring-primary/40 ring-offset-1 ring-offset-background" : ""
                        }`}
                        style={{
                          backgroundColor: `${tx.category?.color || "#64748b"}20`,
                          color: tx.category?.color || "#64748b",
                        }}
                        title={tx.receiptUrl ? "Nhấn xem ảnh hóa đơn" : undefined}
                      >
                        <CategoryIcon
                          iconName={tx.category?.icon}
                          categoryName={tx.category?.name}
                          className="w-5 h-5"
                        />
                      </button>

                      {/* Receipt Thumbnail Indicator (if uploaded) */}
                      {tx.receiptUrl && (
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
                          className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full overflow-hidden border-2 border-background shadow-xs hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                          title="Nhấn xem ảnh hóa đơn"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getReceiptThumbnailUrl(tx.receiptUrl) || tx.receiptUrl}
                            alt="Hóa đơn"
                            className="w-full h-full object-cover"
                          />
                        </button>
                      )}
                    </div>

                    {/* Middle: Description, Category pill, Date, Note, and Direct Receipt Button */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-foreground truncate">
                        {tx.description}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                        <span className="font-medium text-[11px]">
                          {formatVNDate(tx.transactionDate, "short")}
                        </span>
                        <span className="text-muted-foreground/40">•</span>
                        <span className="inline-flex items-center gap-1 text-[11px]">
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: tx.category?.color || "#64748b" }}
                          />
                          <span className="truncate max-w-[100px]">
                            {tx.category?.name || "Chưa phân loại"}
                          </span>
                        </span>
                      </div>
                      {tx.note && (
                        <div className="text-[11px] text-muted-foreground/80 line-clamp-1 italic mt-0.5">
                          {tx.note}
                        </div>
                      )}
                      {/* Direct button to open receipt popup on mobile */}
                      {tx.receiptUrl && (
                        <div className="mt-1">
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
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 active:scale-95 transition-all cursor-pointer border border-primary/20 shadow-2xs"
                            title="Xem ảnh hóa đơn"
                          >
                            <ImageIcon className="w-3 h-3 text-primary" />
                            <span>Xem ảnh hóa đơn</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Right: Amount & Actions (with direct image button) */}
                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <div
                        className={`font-mono tabular-nums text-sm font-bold ${
                          tx.type === "INCOME"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {tx.type === "INCOME" ? "+" : "-"}
                        {formatVND(tx.amount)}
                      </div>

                      <div className="flex items-center gap-1">
                        {tx.receiptUrl && (
                          <Button
                            variant="ghost"
                            size="icon"
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
                            className="w-7 h-7 text-primary hover:text-primary hover:bg-primary/15 bg-primary/10 rounded-lg cursor-pointer"
                            title="Xem ảnh hóa đơn"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-primary" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(tx)}
                          className="w-7 h-7 text-muted-foreground hover:text-foreground"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingTxId(tx.id)}
                          className="w-7 h-7 text-muted-foreground hover:text-rose-600"
                          title="Xóa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* DESKTOP TABLE VIEW (≥ 640px) */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-muted/40 text-muted-foreground border-b font-semibold tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Ngày</th>
                      <th className="px-5 py-3.5">Giao dịch</th>
                      <th className="px-5 py-3.5">Danh mục</th>
                      <th className="px-5 py-3.5 text-right">Số tiền</th>
                      <th className="px-5 py-3.5 text-center">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-muted/30 transition-colors group">
                        {/* Date */}
                        <td className="px-5 py-3.5 whitespace-nowrap text-xs font-medium text-muted-foreground font-mono tabular-nums">
                          {formatVNDate(tx.transactionDate, "short")}
                        </td>

                        {/* Description & Avatar */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
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
                                className="group/receipt relative w-9 h-9 rounded-xl overflow-hidden shadow-xs shrink-0 border border-slate-200 dark:border-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                                title="Nhấn để xem hóa đơn gốc"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={getReceiptThumbnailUrl(tx.receiptUrl) || tx.receiptUrl}
                                  alt={tx.description}
                                  className="w-full h-full object-cover group-hover/receipt:scale-110 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/25 group-hover/receipt:bg-black/40 flex items-center justify-center opacity-0 group-hover/receipt:opacity-100 transition-opacity">
                                  <ZoomIn className="w-3.5 h-3.5 text-white" />
                                </div>
                              </button>
                            ) : (
                              <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center shadow-xs shrink-0"
                                style={{
                                  backgroundColor: `${tx.category?.color || "#64748b"}20`,
                                  color: tx.category?.color || "#64748b",
                                }}
                              >
                                <CategoryIcon
                                  iconName={tx.category?.icon}
                                  categoryName={tx.category?.name}
                                  className="w-4 h-4"
                                />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-semibold text-foreground truncate max-w-xs lg:max-w-md">
                                {tx.description}
                              </div>
                              {tx.note && (
                                <div className="text-xs text-muted-foreground line-clamp-1 italic">
                                  {tx.note}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Category Pill */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-muted/60 border border-border/50">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: tx.category?.color || "#64748b" }}
                            />
                            <span className="text-foreground">
                              {tx.category?.name || "Chưa phân loại"}
                            </span>
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="px-5 py-3.5 whitespace-nowrap text-right">
                          <span
                            className={`font-mono tabular-nums font-bold text-sm ${
                              tx.type === "INCOME"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {tx.type === "INCOME" ? "+" : "-"}
                            {formatVND(tx.amount)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(tx)}
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              title="Chỉnh sửa"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingTxId(tx.id)}
                              className="h-8 w-8 text-muted-foreground hover:text-rose-600"
                              title="Xóa giao dịch"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-t border-border/60 bg-muted/20 text-xs">
              <span className="text-muted-foreground font-mono tabular-nums">
                Trang <span className="font-semibold text-foreground">{currentPage}</span> / {totalPages} ({totalCount} giao dịch)
              </span>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1 || isLoading}
                  className="h-8 text-xs gap-1 px-2.5 rounded-lg"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Trước</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages || isLoading}
                  className="h-8 text-xs gap-1 px-2.5 rounded-lg"
                >
                  <span className="hidden sm:inline">Tiếp</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Transaction Modal */}
      {editingTx && (
        <Dialog open={!!editingTx} onOpenChange={() => setEditingTx(null)}>
          <DialogContent
            className="sm:max-w-[480px]"
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>Chỉnh sửa giao dịch</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl border">
                <button
                  type="button"
                  onClick={() => {
                    setEditType("EXPENSE");
                    const available = categories.filter((c) => c.type === "EXPENSE");
                    if (available.length > 0) setEditCategoryId(available[0].id);
                  }}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    editType === "EXPENSE"
                      ? "bg-rose-600 text-white shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Chi tiêu
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditType("INCOME");
                    const available = categories.filter((c) => c.type === "INCOME");
                    if (available.length > 0) setEditCategoryId(available[0].id);
                  }}
                  className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    editType === "INCOME"
                      ? "bg-emerald-600 text-white shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Thu nhập
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Mô tả giao dịch</label>
                <Input
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Nhập mô tả..."
                  className="mt-1 text-base sm:text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Số tiền (VND)</label>
                <Input
                  value={formatNumberVN(editAmount)}
                  onChange={(e) => setEditAmount(sanitizeCurrencyInput(e.target.value))}
                  placeholder="0"
                  className="mt-1 font-mono tabular-nums text-base sm:text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground">Danh mục</label>
                  <Select value={editCategoryId} onValueChange={setEditCategoryId}>
                    <SelectTrigger className="mt-1 text-xs">
                      <SelectValue placeholder="Chọn danh mục" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCategoriesForEdit.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: c.color }}
                            />
                            <span>{c.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground">Ngày giao dịch</label>
                  <Input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Ghi chú (tùy chọn)</label>
                <Input
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Thêm ghi chú chi tiết..."
                  className="mt-1 text-base sm:text-xs"
                />
              </div>

              <div>
                <ReceiptUploadField
                  value={editReceiptUrl}
                  onChange={setEditReceiptUrl}
                  onPreview={(url) => {
                    if (editingTx) {
                      setLightboxData({
                        imageUrl: url,
                        description: editDesc,
                        amount: editAmount,
                        type: editType,
                        categoryName: categories.find((c) => c.id === editCategoryId)?.name,
                        transactionDate: editDate,
                      });
                    }
                  }}
                  disabled={isUpdating}
                  type={editType}
                  onQuickFill={(data) => {
                    if (data.amount !== undefined && data.amount > 0) {
                      setEditAmount(String(data.amount));
                    }
                    if (data.description) {
                      setEditDesc(data.description);
                    }
                    if (data.date) {
                      setEditDate(data.date);
                    }
                  }}
                  initialAmount={editAmount ? parseInt(editAmount, 10) : undefined}
                  initialDescription={editDesc}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingTx(null)} disabled={isUpdating}>
                Hủy
              </Button>
              <Button onClick={handleSaveEdit} disabled={isUpdating}>
                {isUpdating ? "Đang lưu..." : "Cập nhật"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Modal */}
      {deletingTxId && (
        <Dialog open={!!deletingTxId} onOpenChange={() => setDeletingTxId(null)}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Xóa giao dịch này?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Hành động này sẽ xóa vĩnh viễn giao dịch và cập nhật lại toàn bộ số dư và báo cáo liên quan.
            </p>
            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setDeletingTxId(null)} disabled={isDeleting}>
                Hủy bỏ
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? "Đang xóa..." : "Xác nhận xóa"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Receipt Lightbox Full-View Modal */}
      <ReceiptLightboxModal
        data={lightboxData}
        isOpen={!!lightboxData}
        onClose={() => setLightboxData(null)}
      />
    </div>
  );
}
