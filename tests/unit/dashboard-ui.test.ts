import { describe, it, expect } from "vitest";
import {
  getAdjacentMonthString,
  formatVNMonthYear,
  maskCurrency,
  calculateBurnRate,
  calculateDailyAverage,
  isCurrentVietnamMonth,
} from "@/features/dashboard/services/dashboardUiHelpers";
import { getCategoryLucideIcon } from "@/features/categories/components/CategoryIcon";
import { Utensils, Car, ShoppingBag, Banknote, Tag } from "lucide-react";

describe("Dashboard UI & UX Helpers", () => {
  describe("getAdjacentMonthString", () => {
    it("steps back 1 month within the same year", () => {
      expect(getAdjacentMonthString("2026-10", -1)).toBe("2026-09");
      expect(getAdjacentMonthString("2026-05", -1)).toBe("2026-04");
    });

    it("steps forward 1 month within the same year", () => {
      expect(getAdjacentMonthString("2026-10", 1)).toBe("2026-11");
      expect(getAdjacentMonthString("2026-05", 1)).toBe("2026-06");
    });

    it("handles year roll-under correctly (January -> December of previous year)", () => {
      expect(getAdjacentMonthString("2026-01", -1)).toBe("2025-12");
      expect(getAdjacentMonthString("2020-01", -1)).toBe("2019-12");
    });

    it("handles year roll-over correctly (December -> January of next year)", () => {
      expect(getAdjacentMonthString("2026-12", 1)).toBe("2027-01");
      expect(getAdjacentMonthString("2029-12", 1)).toBe("2030-01");
    });

    it("handles invalid or empty strings gracefully", () => {
      const fallback = getAdjacentMonthString("", -1);
      expect(fallback).toMatch(/^\d{4}-\d{2}$/);
    });
  });

  describe("formatVNMonthYear", () => {
    it("formats YYYY-MM into friendly Vietnamese label", () => {
      expect(formatVNMonthYear("2026-10")).toBe("Tháng 10, 2026");
      expect(formatVNMonthYear("2026-01")).toBe("Tháng 1, 2026");
      expect(formatVNMonthYear("2025-12")).toBe("Tháng 12, 2025");
    });

    it("handles empty string gracefully", () => {
      expect(formatVNMonthYear("")).toBe("");
    });
  });

  describe("maskCurrency", () => {
    it("masks value when isMasked is true", () => {
      expect(maskCurrency("1.500.000 ₫", true)).toBe("•••••••• ₫");
      expect(maskCurrency("0 ₫", true)).toBe("•••••••• ₫");
    });

    it("preserves original value when isMasked is false", () => {
      expect(maskCurrency("1.500.000 ₫", false)).toBe("1.500.000 ₫");
      expect(maskCurrency("25.710 ₫", false)).toBe("25.710 ₫");
    });
  });

  describe("calculateBurnRate", () => {
    it("calculates correct percentage of income spent", () => {
      expect(calculateBurnRate(5_000_000, 10_000_000)).toBe(50);
      expect(calculateBurnRate("2500000", "10000000")).toBe(25);
    });

    it("returns 0 when income is 0 or negative", () => {
      expect(calculateBurnRate(1_000_000, 0)).toBe(0);
      expect(calculateBurnRate(1_000_000, -500_000)).toBe(0);
    });

    it("caps high burn rate cleanly", () => {
      expect(calculateBurnRate(20_000_000, 10_000_000)).toBe(200);
    });
  });

  describe("calculateDailyAverage", () => {
    it("calculates daily average correctly", () => {
      expect(calculateDailyAverage(3_000_000, 30)).toBe(100_000);
      expect(calculateDailyAverage("3100000", 31)).toBe(100_000);
    });

    it("handles 0 or invalid inputs safely", () => {
      expect(calculateDailyAverage(0, 30)).toBe(0);
      expect(calculateDailyAverage(1_000_000, 0)).toBe(0);
    });
  });

  describe("getCategoryLucideIcon", () => {
    it("resolves correct Lucide icon by category name keywords", () => {
      expect(getCategoryLucideIcon(undefined, "Ăn uống")).toBe(Utensils);
      expect(getCategoryLucideIcon(undefined, "Cà phê & Trà sữa")).toBe(Utensils);
      expect(getCategoryLucideIcon(undefined, "Di chuyển xe bus")).toBe(Car);
      expect(getCategoryLucideIcon(undefined, "Mua sắm siêu thị")).toBe(ShoppingBag);
      expect(getCategoryLucideIcon(undefined, "Lương tháng")).toBe(Banknote);
    });

    it("resolves icon by explicit iconName", () => {
      expect(getCategoryLucideIcon("utensils")).toBe(Utensils);
      expect(getCategoryLucideIcon("car")).toBe(Car);
      expect(getCategoryLucideIcon("shoppingbag")).toBe(ShoppingBag);
    });

    it("falls back to Tag icon for unknown categories", () => {
      expect(getCategoryLucideIcon("unknown", "Danh mục bất kỳ")).toBe(Tag);
    });
  });
});
