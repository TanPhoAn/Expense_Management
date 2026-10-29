"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Lock,
  Trash2,
  Edit2,
  Sparkles,
  AlertCircle,
  Check,
  Search,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CategoryIcon,
  AVAILABLE_CATEGORY_ICONS,
  CategoryIconOption,
} from "@/features/categories/components/CategoryIcon";
import { Category } from "@/types";
import { toast } from "sonner";

const FINTECH_PALETTE = [
  { hex: "#10b981", label: "Emerald" },
  { hex: "#06b6d4", label: "Cyan" },
  { hex: "#3b82f6", label: "Blue" },
  { hex: "#6366f1", label: "Indigo" },
  { hex: "#8b5cf6", label: "Purple" },
  { hex: "#ec4899", label: "Pink" },
  { hex: "#f43f5e", label: "Rose" },
  { hex: "#f97316", label: "Orange" },
  { hex: "#eab308", label: "Amber" },
  { hex: "#64748b", label: "Slate" },
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [color, setColor] = useState("#3b82f6");
  const [selectedIconKey, setSelectedIconKey] = useState("tag");
  const [iconFilterCategory, setIconFilterCategory] = useState<string>("all");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Modal State
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [editColor, setEditColor] = useState("#3b82f6");
  const [editIconKey, setEditIconKey] = useState("tag");
  const [editIconFilter, setEditIconFilter] = useState<string>("all");
  const [editError, setEditError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete State
  const [deletingCat, setDeletingCat] = useState<Category | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/categories");
      if (res.ok) {
        const json = await res.json();
        setCategories(json.data || []);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/v1/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          color,
          icon: selectedIconKey,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error?.message || "Không thể tạo danh mục.");
        setIsSubmitting(false);
        return;
      }

      setName("");
      setColor("#3b82f6");
      setSelectedIconKey("tag");
      setIsCreateOpen(false);
      toast.success("Tạo danh mục mới thành công!");
      fetchCategories();
      window.dispatchEvent(new Event("pocketflow:transaction-created"));
    } catch {
      setErrorMsg("Lỗi kết nối máy chủ.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (c: Category) => {
    setEditingCat(c);
    setEditName(c.name);
    setEditType(c.type);
    setEditColor(c.color || "#3b82f6");
    setEditIconKey(c.icon || "tag");
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCat || !editName.trim()) return;

    setIsUpdating(true);
    setEditError(null);

    try {
      const res = await fetch(`/api/v1/categories/${editingCat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          type: editType,
          color: editColor,
          icon: editIconKey,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setEditError(json.error?.message || "Không thể cập nhật danh mục.");
        setIsUpdating(false);
        return;
      }

      setEditingCat(null);
      toast.success("Cập nhật danh mục thành công!");
      fetchCategories();
      window.dispatchEvent(new Event("pocketflow:transaction-created"));
    } catch {
      setEditError("Lỗi kết nối máy chủ.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCat) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/v1/categories/${deletingCat.id}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok) {
        setDeleteError(json.error?.message || "Không thể xóa danh mục.");
        setIsDeleting(false);
        return;
      }

      setDeletingCat(null);
      toast.success("Đã xóa danh mục thành công!");
      fetchCategories();
      window.dispatchEvent(new Event("pocketflow:transaction-created"));
    } catch {
      setDeleteError("Lỗi kết nối máy chủ.");
    } finally {
      setIsDeleting(false);
    }
  };

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === "EXPENSE"),
    [categories]
  );
  const incomeCategories = useMemo(
    () => categories.filter((c) => c.type === "INCOME"),
    [categories]
  );

  const filteredIconsForCreate = useMemo(() => {
    if (iconFilterCategory === "all") return AVAILABLE_CATEGORY_ICONS;
    return AVAILABLE_CATEGORY_ICONS.filter((i) => i.category === iconFilterCategory);
  }, [iconFilterCategory]);

  const filteredIconsForEdit = useMemo(() => {
    if (editIconFilter === "all") return AVAILABLE_CATEGORY_ICONS;
    return AVAILABLE_CATEGORY_ICONS.filter((i) => i.category === editIconFilter);
  }, [editIconFilter]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Quản lý danh mục</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tùy biến biểu tượng, màu sắc và phân loại thu - chi của bạn
          </p>
        </div>

        <Button
          onClick={() => {
            setName("");
            setColor("#3b82f6");
            setSelectedIconKey("tag");
            setIsCreateOpen(true);
          }}
          className="gap-2 font-semibold shadow-xs"
        >
          <Plus className="w-4 h-4" /> Thêm danh mục mới
        </Button>
      </div>

      {/* Expense Categories Section */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold flex items-center gap-2 text-foreground">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block shadow-xs" />
            Danh mục chi tiêu
            <Badge variant="secondary" className="ml-1 font-mono text-xs">
              {expenseCategories.length}
            </Badge>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {expenseCategories.map((c) => (
            <Card
              key={c.id}
              className="shadow-xs border border-border/80 hover:border-slate-400 dark:hover:border-slate-600 transition-all group bg-card/60 backdrop-blur-xs"
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs transition-transform group-hover:scale-105"
                    style={{
                      backgroundColor: `${c.color || "#64748b"}20`,
                      color: c.color || "#64748b",
                    }}
                  >
                    <CategoryIcon
                      iconName={c.icon}
                      categoryName={c.name}
                      className="w-5 h-5"
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">
                      {c.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {c.isDefault ? (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                          <Lock className="w-2.5 h-2.5" /> Hệ thống
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-primary font-medium">
                          <Sparkles className="w-2.5 h-2.5" /> Tùy biến
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {!c.isDefault && (
                  <div className="flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(c)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      title="Chỉnh sửa danh mục"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setDeletingCat(c);
                        setDeleteError(null);
                      }}
                      className="h-8 w-8 text-muted-foreground hover:text-rose-600"
                      title="Xóa danh mục"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Income Categories Section */}
      <div className="space-y-3.5 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold flex items-center gap-2 text-foreground">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-xs" />
            Danh mục thu nhập
            <Badge variant="secondary" className="ml-1 font-mono text-xs">
              {incomeCategories.length}
            </Badge>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {incomeCategories.map((c) => (
            <Card
              key={c.id}
              className="shadow-xs border border-border/80 hover:border-slate-400 dark:hover:border-slate-600 transition-all group bg-card/60 backdrop-blur-xs"
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs transition-transform group-hover:scale-105"
                    style={{
                      backgroundColor: `${c.color || "#64748b"}20`,
                      color: c.color || "#64748b",
                    }}
                  >
                    <CategoryIcon
                      iconName={c.icon}
                      categoryName={c.name}
                      className="w-5 h-5"
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">
                      {c.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {c.isDefault ? (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
                          <Lock className="w-2.5 h-2.5" /> Hệ thống
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-primary font-medium">
                          <Sparkles className="w-2.5 h-2.5" /> Tùy biến
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {!c.isDefault && (
                  <div className="flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(c)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      title="Chỉnh sửa danh mục"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setDeletingCat(c);
                        setDeleteError(null);
                      }}
                      className="h-8 w-8 text-muted-foreground hover:text-rose-600"
                      title="Xóa danh mục"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* CREATE CATEGORY MODAL */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Thêm danh mục mới</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateCategory} className="space-y-4 py-2">
            {errorMsg && (
              <div className="p-3 text-xs font-medium rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Live Card Preview */}
            <div className="p-3 bg-muted/40 rounded-xl border border-border/60">
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2 block">
                Xem trước giao diện
              </span>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-card border shadow-xs">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs"
                  style={{
                    backgroundColor: `${color}25`,
                    color: color,
                  }}
                >
                  <CategoryIcon iconName={selectedIconKey} categoryName={name || "Tên danh mục"} className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-foreground">
                    {name.trim() || "Tên danh mục mới"}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {type === "EXPENSE" ? "Khoản Chi tiêu" : "Khoản Thu nhập"}
                  </div>
                </div>
              </div>
            </div>

            {/* Name Input */}
            <div>
              <label className="text-xs font-semibold text-foreground">Tên danh mục</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Cà phê, Xăng xe, Tiền thưởng..."
                className="mt-1 text-base sm:text-xs"
                required
              />
            </div>

            {/* Type Switcher */}
            <div>
              <label className="text-xs font-semibold text-foreground">Loại danh mục</label>
              <div className="grid grid-cols-2 gap-2 mt-1 p-1 bg-muted rounded-xl border">
                <button
                  type="button"
                  onClick={() => setType("EXPENSE")}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    type === "EXPENSE"
                      ? "bg-rose-600 text-white shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Chi tiêu (Expense)
                </button>
                <button
                  type="button"
                  onClick={() => setType("INCOME")}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    type === "INCOME"
                      ? "bg-emerald-600 text-white shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Thu nhập (Income)
                </button>
              </div>
            </div>

            {/* Icon Picker */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-foreground">Biểu tượng</label>
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setIconFilterCategory("all")}
                    className={`px-2 py-0.5 rounded-md ${
                      iconFilterCategory === "all" ? "bg-muted font-bold text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    Tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => setIconFilterCategory("daily")}
                    className={`px-2 py-0.5 rounded-md ${
                      iconFilterCategory === "daily" ? "bg-muted font-bold text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    Hàng ngày
                  </button>
                  <button
                    type="button"
                    onClick={() => setIconFilterCategory("living")}
                    className={`px-2 py-0.5 rounded-md ${
                      iconFilterCategory === "living" ? "bg-muted font-bold text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    Tiện ích
                  </button>
                  <button
                    type="button"
                    onClick={() => setIconFilterCategory("lifestyle")}
                    className={`px-2 py-0.5 rounded-md ${
                      iconFilterCategory === "lifestyle" ? "bg-muted font-bold text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    Đời sống
                  </button>
                  <button
                    type="button"
                    onClick={() => setIconFilterCategory("income")}
                    className={`px-2 py-0.5 rounded-md ${
                      iconFilterCategory === "income" ? "bg-muted font-bold text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    Thu nhập
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 sm:grid-cols-8 gap-2 p-2.5 bg-muted/30 rounded-xl border max-h-[140px] overflow-y-auto">
                {filteredIconsForCreate.map((item) => {
                  const IconComp = item.icon;
                  const isSelected = selectedIconKey === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setSelectedIconKey(item.key)}
                      className={`p-2 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? "bg-primary text-white shadow-xs scale-105 ring-2 ring-primary ring-offset-2 ring-offset-background"
                          : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50"
                      }`}
                      title={item.name}
                    >
                      <IconComp className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Palette Selector */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">
                Màu sắc đại diện
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {FINTECH_PALETTE.map((p) => {
                  const isSelected = color === p.hex;
                  return (
                    <button
                      key={p.hex}
                      type="button"
                      onClick={() => setColor(p.hex)}
                      className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 cursor-pointer shadow-xs"
                      style={{ backgroundColor: p.hex }}
                      title={p.label}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting || !name.trim()}>
                {isSubmitting ? "Đang tạo..." : "Tạo danh mục"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT CATEGORY MODAL */}
      {editingCat && (
        <Dialog open={!!editingCat} onOpenChange={() => setEditingCat(null)}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Chỉnh sửa danh mục</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
              {editError && (
                <div className="p-3 text-xs font-medium rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Live Card Preview */}
              <div className="p-3 bg-muted/40 rounded-xl border border-border/60">
                <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2 block">
                  Xem trước giao diện
                </span>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-card border shadow-xs">
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs"
                    style={{
                      backgroundColor: `${editColor}25`,
                      color: editColor,
                    }}
                  >
                    <CategoryIcon iconName={editIconKey} categoryName={editName || "Tên danh mục"} className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-foreground">
                      {editName.trim() || "Tên danh mục"}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {editType === "EXPENSE" ? "Khoản Chi tiêu" : "Khoản Thu nhập"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Name Input */}
              <div>
                <label className="text-xs font-semibold text-foreground">Tên danh mục</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nhập tên danh mục..."
                  className="mt-1 text-base sm:text-xs"
                  required
                />
              </div>

              {/* Type Switcher */}
              <div>
                <label className="text-xs font-semibold text-foreground">Loại danh mục</label>
                <div className="grid grid-cols-2 gap-2 mt-1 p-1 bg-muted rounded-xl border">
                  <button
                    type="button"
                    onClick={() => setEditType("EXPENSE")}
                    className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      editType === "EXPENSE"
                        ? "bg-rose-600 text-white shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Chi tiêu (Expense)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditType("INCOME")}
                    className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      editType === "INCOME"
                        ? "bg-emerald-600 text-white shadow-xs font-bold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Thu nhập (Income)
                  </button>
                </div>
              </div>

              {/* Icon Picker */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-foreground">Biểu tượng</label>
                  <div className="flex items-center gap-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setEditIconFilter("all")}
                      className={`px-2 py-0.5 rounded-md ${
                        editIconFilter === "all" ? "bg-muted font-bold text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      Tất cả
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditIconFilter("daily")}
                      className={`px-2 py-0.5 rounded-md ${
                        editIconFilter === "daily" ? "bg-muted font-bold text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      Hàng ngày
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditIconFilter("living")}
                      className={`px-2 py-0.5 rounded-md ${
                        editIconFilter === "living" ? "bg-muted font-bold text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      Tiện ích
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditIconFilter("lifestyle")}
                      className={`px-2 py-0.5 rounded-md ${
                        editIconFilter === "lifestyle" ? "bg-muted font-bold text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      Đời sống
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditIconFilter("income")}
                      className={`px-2 py-0.5 rounded-md ${
                        editIconFilter === "income" ? "bg-muted font-bold text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      Thu nhập
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 sm:grid-cols-8 gap-2 p-2.5 bg-muted/30 rounded-xl border max-h-[140px] overflow-y-auto">
                  {filteredIconsForEdit.map((item) => {
                    const IconComp = item.icon;
                    const isSelected = editIconKey === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setEditIconKey(item.key)}
                        className={`p-2 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? "bg-primary text-white shadow-xs scale-105 ring-2 ring-primary ring-offset-2 ring-offset-background"
                            : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50"
                        }`}
                        title={item.name}
                      >
                        <IconComp className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Palette Selector */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-1.5 block">
                  Màu sắc đại diện
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {FINTECH_PALETTE.map((p) => {
                    const isSelected = editColor === p.hex;
                    return (
                      <button
                        key={p.hex}
                        type="button"
                        onClick={() => setEditColor(p.hex)}
                        className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 cursor-pointer shadow-xs"
                        style={{ backgroundColor: p.hex }}
                        title={p.label}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button variant="outline" type="button" onClick={() => setEditingCat(null)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isUpdating || !editName.trim()}>
                  {isUpdating ? "Đang lưu..." : "Cập nhật"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* SAFE DELETION CONFIRMATION MODAL */}
      {deletingCat && (
        <Dialog open={!!deletingCat} onOpenChange={() => setDeletingCat(null)}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-rose-600">
                <AlertCircle className="w-5 h-5 shrink-0" />
                Xóa danh mục tùy biến?
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2 text-sm text-muted-foreground">
              <p>
                Bạn có chắc chắn muốn xóa danh mục{" "}
                <span className="font-bold text-foreground">
                  &ldquo;{deletingCat.name}&rdquo;
                </span>
                ?
              </p>

              <div className="p-3 bg-muted/50 rounded-xl border text-xs space-y-1">
                <p className="font-semibold text-foreground">Quy tắc bảo vệ dữ liệu:</p>
                <p>
                  Nếu danh mục này đang có giao dịch phát sinh, hệ thống sẽ từ chối xóa để bảo toàn lịch sử sổ sách tài chính.
                </p>
              </div>

              {deleteError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs font-medium">
                  {deleteError}
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setDeletingCat(null)} disabled={isDeleting}>
                Hủy bỏ
              </Button>
              <Button variant="destructive" onClick={handleDeleteCategory} disabled={isDeleting}>
                {isDeleting ? "Đang xóa..." : "Xác nhận xóa"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
