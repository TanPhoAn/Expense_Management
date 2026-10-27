"use client";

import React, { useState, useEffect } from "react";
import { Plus, Lock, Trash2, Edit2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Category } from "@/types";
import { toast } from "sonner";

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#10b981",
  "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6",
  "#ec4899", "#64748b"
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [color, setColor] = useState("#3b82f6");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit State
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [editColor, setEditColor] = useState("#3b82f6");
  const [editError, setEditError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Deletion
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
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
          icon: "Tag",
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error?.message || "Không thể tạo danh mục.");
        setIsSubmitting(false);
        return;
      }

      setName("");
      setIsCreateOpen(false);
      toast.success("Tạo danh mục mới thành công!");
      fetchCategories();
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
    setEditColor(c.color);
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
    } catch {
      setEditError("Lỗi kết nối máy chủ.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCatId) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/v1/categories/${deletingCatId}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok) {
        setDeleteError(json.error?.message || "Không thể xóa danh mục.");
        setIsDeleting(false);
        return;
      }

      setDeletingCatId(null);
      toast.success("Đã xóa danh mục thành công!");
      fetchCategories();
    } catch {
      setDeleteError("Lỗi kết nối máy chủ.");
    } finally {
      setIsDeleting(false);
    }
  };

  const expenseCategories = categories.filter((c) => c.type === "EXPENSE");
  const incomeCategories = categories.filter((c) => c.type === "INCOME");

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Quản lý danh mục</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Danh mục chuẩn hệ thống và danh mục tùy biến theo nhu cầu cá nhân
          </p>
        </div>

        <Button onClick={() => setIsCreateOpen(true)} className="gap-2 font-semibold">
          <Plus className="w-4 h-4" /> Thêm danh mục mới
        </Button>
      </div>

      {/* Expense Categories Grid */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
          Danh mục chi tiêu ({expenseCategories.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {expenseCategories.map((c) => (
            <Card key={c.id} className="shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-sm"
                    style={{ backgroundColor: c.color }}
                  >
                    {c.name.charAt(0)}
                  </span>
                  <div>
                    <p className="font-semibold text-sm">{c.name}</p>
                    {c.isDefault ? (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Lock className="w-2.5 h-2.5" /> Mặc định
                      </span>
                    ) : (
                      <span className="text-[10px] text-primary font-medium">Tùy biến</span>
                    )}
                  </div>
                </div>

                {!c.isDefault && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(c)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setDeletingCatId(c.id);
                        setDeleteError(null);
                      }}
                      className="h-8 w-8 text-muted-foreground hover:text-rose-600"
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

      {/* Income Categories Grid */}
      <div className="space-y-3 pt-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
          Danh mục thu nhập ({incomeCategories.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {incomeCategories.map((c) => (
            <Card key={c.id} className="shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-sm"
                    style={{ backgroundColor: c.color }}
                  >
                    {c.name.charAt(0)}
                  </span>
                  <div>
                    <p className="font-semibold text-sm">{c.name}</p>
                    {c.isDefault ? (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Lock className="w-2.5 h-2.5" /> Mặc định
                      </span>
                    ) : (
                      <span className="text-[10px] text-primary font-medium">Tùy biến</span>
                    )}
                  </div>
                </div>

                {!c.isDefault && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(c)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setDeletingCatId(c.id);
                        setDeleteError(null);
                      }}
                      className="h-8 w-8 text-muted-foreground hover:text-rose-600"
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

      {/* Create Custom Category Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Thêm danh mục tùy biến</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCategory} className="space-y-4 py-2">
            {errorMsg && (
              <div className="p-3 text-xs font-medium rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
              <button
                type="button"
                onClick={() => setType("EXPENSE")}
                className={`py-2 text-sm font-semibold rounded-md ${
                  type === "EXPENSE" ? "bg-rose-600 text-white shadow" : "text-muted-foreground"
                }`}
              >
                Chi tiêu
              </button>
              <button
                type="button"
                onClick={() => setType("INCOME")}
                className={`py-2 text-sm font-semibold rounded-md ${
                  type === "INCOME" ? "bg-emerald-600 text-white shadow" : "text-muted-foreground"
                }`}
              >
                Thu nhập
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Tên danh mục</label>
              <Input
                placeholder="VD: Nuôi thú cưng, Làm thêm..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Màu sắc nhận diện</label>
              <div className="flex flex-wrap gap-2 pt-1">
                {PRESET_COLORS.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setColor(hex)}
                    className={`w-7 h-7 rounded-full transition-transform ${
                      color === hex ? "scale-125 ring-2 ring-primary ring-offset-2" : "hover:scale-110"
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Đang tạo..." : "Lưu danh mục"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Category Modal */}
      {editingCat && (
        <Dialog open={!!editingCat} onOpenChange={() => setEditingCat(null)}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle>Chỉnh sửa danh mục tùy biến</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
              {editError && (
                <div className="p-3 text-xs font-medium rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                  {editError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
                <button
                  type="button"
                  onClick={() => setEditType("EXPENSE")}
                  className={`py-2 text-sm font-semibold rounded-md ${
                    editType === "EXPENSE" ? "bg-rose-600 text-white shadow" : "text-muted-foreground"
                  }`}
                >
                  Chi tiêu
                </button>
                <button
                  type="button"
                  onClick={() => setEditType("INCOME")}
                  className={`py-2 text-sm font-semibold rounded-md ${
                    editType === "INCOME" ? "bg-emerald-600 text-white shadow" : "text-muted-foreground"
                  }`}
                >
                  Thu nhập
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Tên danh mục</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Màu sắc nhận diện</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {PRESET_COLORS.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setEditColor(hex)}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        editColor === hex ? "scale-125 ring-2 ring-primary ring-offset-2" : "hover:scale-110"
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setEditingCat(null)} disabled={isUpdating}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? "Đang lưu..." : "Cập nhật"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Category Confirmation Modal */}
      {deletingCatId && (
        <Dialog open={!!deletingCatId} onOpenChange={() => setDeletingCatId(null)}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Xóa danh mục tùy biến?</DialogTitle>
            </DialogHeader>
            {deleteError ? (
              <div className="p-3 text-xs font-medium rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                {deleteError}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Lưu ý: Không thể xóa danh mục đang có giao dịch liên kết.
              </p>
            )}
            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setDeletingCatId(null)} disabled={isDeleting}>
                Đóng
              </Button>
              {!deleteError && (
                <Button variant="destructive" onClick={handleDeleteCategory} disabled={isDeleting}>
                  {isDeleting ? "Đang xóa..." : "Xác nhận xóa"}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
