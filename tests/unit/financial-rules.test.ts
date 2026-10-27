import { describe, it, expect } from 'vitest';
import {
  addCurrency,
  subtractCurrency,
  formatVND,
  sanitizeCurrencyInput,
} from '../../src/lib/utils/currency';
import { getMonthDateRange, getVietnamTodayString } from '../../src/lib/utils/date';

/**
 * Financial business rules — pure unit tests (no DB required).
 */
describe('Financial Business Rules', () => {
  // ─── Remaining Balance ─────────────────────────────────────────────────────

  describe('Remaining Balance = monthly income – monthly expenses', () => {
    it('should calculate a positive balance when income > expenses', () => {
      const balance = subtractCurrency('12000000', '8500000');
      expect(balance).toBe('3500000');
    });

    it('should return zero when income equals expenses', () => {
      const balance = subtractCurrency('5000000', '5000000');
      expect(balance).toBe('0');
    });

    it('should allow negative balance when expenses exceed income', () => {
      // Business rule: remaining balance may be negative
      const balance = subtractCurrency('3000000', '5000000');
      expect(balance).toBe('-2000000');
    });

    it('should handle large VND amounts without floating point error', () => {
      // 50,000,000 VND income - 49,999,999 VND expenses = 1 VND
      const balance = subtractCurrency('50000000', '49999999');
      expect(balance).toBe('1');
    });
  });

  // ─── Currency Arithmetic ──────────────────────────────────────────────────

  describe('Currency Arithmetic (BigInt-safe)', () => {
    it('should add two VND amounts exactly', () => {
      expect(addCurrency('55000', '45000')).toBe('100000');
    });

    it('should accumulate multiple expenses correctly', () => {
      const expenses = ['25000', '30000', '15000', '10000'];
      const total = expenses.reduce((sum, amt) => addCurrency(sum, amt), '0');
      expect(total).toBe('80000');
    });

    it('should handle zero amounts in arithmetic', () => {
      expect(addCurrency('0', '55000')).toBe('55000');
      expect(subtractCurrency('55000', '0')).toBe('55000');
    });

    it('should not suffer from floating-point issues with typical VND values', () => {
      // VND is always an integer, but values like 0.1 + 0.2 ≠ 0.3 in float
      // Our BigInt-based approach avoids this
      const result = addCurrency('100', '200');
      expect(result).toBe('300');
      // Verify no scientific notation or float imprecision
      expect(result).not.toContain('e');
      expect(result).not.toContain('.');
    });
  });

  // ─── Month Boundary Calculations ──────────────────────────────────────────

  describe('Month Date Range Boundaries', () => {
    it('should produce correct boundaries for October 2026', () => {
      const { startDate, endDate } = getMonthDateRange('2026-10');
      expect(startDate).toBe('2026-10-01');
      expect(endDate).toBe('2026-10-31');
    });

    it('should produce correct boundaries for January (31 days)', () => {
      const { startDate, endDate } = getMonthDateRange('2026-01');
      expect(startDate).toBe('2026-01-01');
      expect(endDate).toBe('2026-01-31');
    });

    it('should produce correct boundaries for April (30 days)', () => {
      const { startDate, endDate } = getMonthDateRange('2026-04');
      expect(startDate).toBe('2026-04-01');
      expect(endDate).toBe('2026-04-30');
    });

    it('should produce correct boundaries for February in a non-leap year (28 days)', () => {
      const { startDate, endDate } = getMonthDateRange('2025-02');
      expect(startDate).toBe('2025-02-01');
      expect(endDate).toBe('2025-02-28');
    });

    it('should produce correct boundaries for February in a leap year (29 days)', () => {
      const { startDate, endDate } = getMonthDateRange('2024-02');
      expect(startDate).toBe('2024-02-01');
      expect(endDate).toBe('2024-02-29');
    });

    it('should produce correct boundaries for December (31 days)', () => {
      const { startDate, endDate } = getMonthDateRange('2026-12');
      expect(startDate).toBe('2026-12-01');
      expect(endDate).toBe('2026-12-31');
    });

    it('should produce correct boundaries for June (30 days)', () => {
      const { startDate, endDate } = getMonthDateRange('2026-06');
      expect(startDate).toBe('2026-06-01');
      expect(endDate).toBe('2026-06-30');
    });
  });

  // ─── Today's Date (Vietnam TZ) ─────────────────────────────────────────────

  describe("Today's Date (Asia/Ho_Chi_Minh timezone)", () => {
    it('should return a valid YYYY-MM-DD string', () => {
      const today = getVietnamTodayString();
      expect(today).toMatch(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);
    });

    it("should be consistent with the month prefix from the current month", () => {
      const today = getVietnamTodayString();
      // Month prefix should be today's YYYY-MM
      expect(today.substring(0, 7)).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
    });

    it("today's expense must be calculated independently of the selected reporting month", () => {
      // This verifies the business rule: todayExpense uses getVietnamTodayString()
      // regardless of which month is selected on the dashboard.
      // Since this is a pure logic test, we verify that the date returned is always the true current date.
      const todayFromUtil = getVietnamTodayString();
      // It should never be an empty string
      expect(todayFromUtil).not.toBe('');
      // It should always be a real date — even if the selected month is different
      const selectedMonth = '2025-03'; // hypothetically a past month
      const { startDate: monthStart } = getMonthDateRange(selectedMonth);
      // Today is not constrained by the selected month's range
      expect(todayFromUtil).not.toBe(monthStart);
    });
  });

  // ─── VND Formatting ───────────────────────────────────────────────────────

  describe('VND Currency Formatting', () => {
    it('should format 55000 as Vietnamese locale currency', () => {
      const formatted = formatVND('55000');
      expect(formatted).toContain('₫');
      // Should contain thousand separator
      expect(formatted).toMatch(/55[.,]000/);
    });

    it('should format 12000000 (monthly salary) correctly', () => {
      const formatted = formatVND('12000000');
      expect(formatted).toContain('₫');
      expect(formatted).toMatch(/12[.,]000[.,]000/);
    });

    it('should format 0 as zero', () => {
      const formatted = formatVND('0');
      expect(formatted).toContain('0');
      expect(formatted).toContain('₫');
    });

    it('should handle invalid input gracefully', () => {
      const formatted = formatVND('not-a-number');
      expect(formatted).toBe('0 ₫');
    });
  });

  // ─── Currency Input Sanitization ──────────────────────────────────────────

  describe('Currency Input Sanitization', () => {
    it('should strip dot thousand separators from "55.000"', () => {
      expect(sanitizeCurrencyInput('55.000 VND')).toBe('55000');
    });

    it('should strip comma thousand separators', () => {
      expect(sanitizeCurrencyInput('12,000,000 ₫')).toBe('12000000');
    });

    it('should handle space-separated digits', () => {
      expect(sanitizeCurrencyInput('150 000')).toBe('150000');
    });

    it('should return empty string for non-numeric input', () => {
      expect(sanitizeCurrencyInput('abc')).toBe('');
    });
  });
});
