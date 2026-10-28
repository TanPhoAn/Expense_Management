"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Loader2,
  ZoomIn,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { formatVNDate, getVietnamTodayString, getMonthDateRange, getVietnamCurrentMonthString } from "@/lib/utils/date";
import { getReceiptThumbnailUrl } from "@/lib/utils/image";
import { ReceiptLightboxModal, LightboxData } from "@/components/ui/ReceiptLightboxModal";
import { ReceiptUploadField } from "@/components/ui/ReceiptUploadField";
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
  const [search, setSearch] = useState("");
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
      if (search.trim()) params.set("search", search.trim());
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
  }, [currentPage, search, selectedType, selectedCategory, startDate, endDate]);

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

  const filteredCategoriesForEdit = categories.filter((c) => c.type === editType);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Sổ giao dịch</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Tìm kiếm, lọc và quản lý toàn bộ các giao dịch tài chính
        </p>
      </div>

      {/* Filter Toolbar */}
      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search */}
            <div className="lg:col-span-2 relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm theo mô tả (VD: ăn trưa, lương...)"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
              />
            </div>

            {/* Type */}
            <div>
              <Select
                value={selectedType}
                onValueChange={(val) => {
                  setSelectedType(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Loại giao dịch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả loại</SelectItem>
                  <SelectItem value="EXPENSE">Chi tiêu (Expense)</SelectItem>
                  <SelectItem value="INCOME">Thu nhập (Income)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div>
              <Select
                value={selectedCategory}
                onValueChange={(val) => {
                  setSelectedCategory(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Danh mục" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Tất cả danh mục</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.type === "INCOME" ? "Thu" : "Chi"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reset Filters */}
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setSelectedType("ALL");
                setSelectedCategory("ALL");
                setStartDate("");
                setEndDate("");
                setCurrentPage(1);
              }}
              className="text-xs"
            >
              Đặt lại bộ lọc
            </Button>
          </div>

          {/* Date Range Sub-filter with Quick Presets */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-medium">Khoảng ngày:</span>
              <div className="flex items-center gap-1.5">
                <span>Từ</span>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-8 w-36 text-xs"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span>Đến</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-8 w-36 text-xs"
                />
              </div>
            </div>

            {/* Quick date filters */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium">Chọn nhanh:</span>
              <button
                type="button"
                onClick={() => {
                  const today = getVietnamTodayString();
                  setStartDate(today);
                  setEndDate(today);
                  setCurrentPage(1);
                }}
                className="px-2 py-1 rounded bg-muted hover:bg-muted/80 text-foreground transition-colors"
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={() => {
                  const currentMonth = getVietnamCurrentMonthString();
                  const { startDate: s, endDate: e } = getMonthDateRange(currentMonth);
                  setStartDate(s);
                  setEndDate(e);
                  setCurrentPage(1);
                }}
                className="px-2 py-1 rounded bg-muted hover:bg-muted/80 text-foreground transition-colors"
              >
                Tháng này
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 flex justify-center items-center text-muted-foreground text-sm">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Đang tải dữ liệu giao dịch...
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm space-y-2">
              <Receipt className="w-10 h-10 mx-auto text-muted-foreground/40" />
              <p>Không tìm thấy giao dịch nào phù hợp.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b">
                  <tr>
                    <th className="px-4 py-3">Ngày</th>
                    <th className="px-4 py-3">Mô tả</th>
                    <th className="px-4 py-3">Danh mục</th>
                    <th className="px-4 py-3 text-right">Số tiền</th>
                    <th className="px-4 py-3 text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-muted-foreground">
                        {formatVNDate(tx.transactionDate, "short")}
                      </td>
                      <td className="px-4 py-3">
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
                              className="group relative w-9 h-9 rounded-full overflow-hidden shadow-sm shrink-0 border border-slate-200 dark:border-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                              title="Nhấn để xem hóa đơn gốc"
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
                              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-sm shrink-0"
                              style={{ backgroundColor: tx.category?.color || "#64748b" }}
                            >
                              {tx.category?.name.charAt(0) || "T"}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-foreground">{tx.description}</div>
                            {tx.note && <div className="text-xs text-muted-foreground line-clamp-1">{tx.note}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: tx.category?.color || "#64748b" }}
                          />
                          {tx.category?.name || "Chưa phân loại"}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span
                          className={`font-bold ${
                            tx.type === "INCOME"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {tx.type === "INCOME" ? "+" : "-"}
                          {formatVND(tx.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(tx)}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingTxId(tx.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-rose-600"
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
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-xs text-muted-foreground">
                Tổng cộng {totalCount} giao dịch (Trang {currentPage}/{totalPages})
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Transaction Modal */}
      {editingTx && (
        <Dialog open={!!editingTx} onOpenChange={() => setEditingTx(null)}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Chỉnh sửa giao dịch</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setEditType("EXPENSE");
                    const available = categories.filter((c) => c.type === "EXPENSE");
                    if (available.length > 0) setEditCategoryId(available[0].id);
                  }}
                  className={`py-2 text-sm font-semibold rounded-md ${
                    editType === "EXPENSE" ? "bg-rose-600 text-white shadow" : "text-muted-foreground"
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
                  className={`py-2 text-sm font-semibold rounded-md ${
                    editType === "INCOME" ? "bg-emerald-600 text-white shadow" : "text-muted-foreground"
                  }`}
                >
                  Thu nhập
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold">Mô tả</label>
                <Input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
              </div>

              <div>
                <label className="text-xs font-semibold">Số tiền (VND)</label>
                <Input
                  value={formatNumberVN(editAmount)}
                  onChange={(e) => setEditAmount(sanitizeCurrencyInput(e.target.value))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold">Danh mục</label>
                  <Select value={editCategoryId} onValueChange={setEditCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn danh mục" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCategoriesForEdit.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold">Ngày giao dịch</label>
                  <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold">Ghi chú</label>
                <Input value={editNote} onChange={(e) => setEditNote(e.target.value)} />
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
