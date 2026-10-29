import { describe, it, expect } from "vitest";
import {
  calculateTransactionsSummary,
  getQuickDateRange,
  matchDatePreset,
} from "@/features/transactions/services/transactionUiHelpers";
import { Transaction } from "@/types";

describe("Transaction UI Helpers", () => {
  describe("calculateTransactionsSummary", () => {
    it("should calculate correct totals for mixed transactions", () => {
      const mockTransactions: Transaction[] = [
        {
          id: "1",
          userId: "u1",
          description: "Ăn trưa",
          amount: "50000",
          type: "EXPENSE",
          categoryId: "c1",
          transactionDate: "2026-10-29",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "2",
          userId: "u1",
          description: "Lương tháng",
          amount: "15000000",
          type: "INCOME",
          categoryId: "c2",
          transactionDate: "2026-10-29",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "3",
          userId: "u1",
          description: "Đổ xăng",
          amount: "70000",
          type: "EXPENSE",
          categoryId: "c3",
          transactionDate: "2026-10-29",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const summary = calculateTransactionsSummary(mockTransactions);

      expect(summary.totalIncome).toBe(15000000);
      expect(summary.totalExpense).toBe(120000);
      expect(summary.netFlow).toBe(14880000);
      expect(summary.incomeCount).toBe(1);
      expect(summary.expenseCount).toBe(2);
      expect(summary.totalCount).toBe(3);
    });

    it("should return zeros for empty transaction array", () => {
      const summary = calculateTransactionsSummary([]);
      expect(summary.totalIncome).toBe(0);
      expect(summary.totalExpense).toBe(0);
      expect(summary.netFlow).toBe(0);
      expect(summary.totalCount).toBe(0);
    });
  });

  describe("getQuickDateRange & matchDatePreset", () => {
    it("should return empty dates for 'all' preset", () => {
      const range = getQuickDateRange("all");
      expect(range.startDate).toBe("");
      expect(range.endDate).toBe("");
      expect(matchDatePreset(range.startDate, range.endDate)).toBe("all");
    });

    it("should return identical start and end dates for 'today'", () => {
      const range = getQuickDateRange("today");
      expect(range.startDate).toBeTruthy();
      expect(range.startDate).toBe(range.endDate);
      expect(matchDatePreset(range.startDate, range.endDate)).toBe("today");
    });

    it("should return valid month range for 'month'", () => {
      const range = getQuickDateRange("month");
      expect(range.startDate).toBeTruthy();
      expect(range.endDate).toBeTruthy();
      expect(matchDatePreset(range.startDate, range.endDate)).toBe("month");
    });

    it("should return valid week range for 'week'", () => {
      const range = getQuickDateRange("week");
      expect(range.startDate).toBeTruthy();
      expect(range.endDate).toBeTruthy();
      expect(matchDatePreset(range.startDate, range.endDate)).toBe("week");
    });

    it("should identify custom dates as 'custom'", () => {
      expect(matchDatePreset("2025-01-01", "2025-01-15")).toBe("custom");
    });
  });
});
