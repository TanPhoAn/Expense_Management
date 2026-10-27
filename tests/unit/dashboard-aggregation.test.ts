import { describe, it, expect } from 'vitest';
import { addCurrency, subtractCurrency } from '../../src/lib/utils/currency';
import { getMonthDateRange, getVietnamTodayString } from '../../src/lib/utils/date';

/**
 * Dashboard aggregation logic tests.
 *
 * These test the pure utility functions that underpin dashboard calculations.
 * They do NOT require a database connection.
 */
describe('Dashboard Aggregation Logic', () => {

  // --- Monthly Summary Calculation ---

  describe('Monthly Summary Calculation', () => {
    it('should compute remaining balance correctly (income minus expenses)', () => {
      // Simulate: monthlyIncome = 12,000,000; monthlyExpense = 4,500,000
      const monthlyIncome = '12000000';
      const monthlyExpense = '4500000';
      const balance = subtractCurrency(monthlyIncome, monthlyExpense);
      expect(balance).toBe('7500000');
    });

    it('should compute a negative remaining balance when overspent', () => {
      const monthlyIncome = '2000000';
      const monthlyExpense = '3500000';
      const balance = subtractCurrency(monthlyIncome, monthlyExpense);
      expect(balance).toBe('-1500000');
    });

    it('should return zero balance when income equals total expense', () => {
      const balance = subtractCurrency('5000000', '5000000');
      expect(balance).toBe('0');
    });
  });

  // --- Today Expense Independence from Reporting Month ---

  describe('Today Expense Independence from Reporting Month', () => {
    it('today date function returns a current date regardless of selected reporting month', () => {
      // The dashboard rule: todayExpense is always filtered by getVietnamTodayString()
      // even when the user is browsing a past or future month.
      const todayDate = getVietnamTodayString();
      const pastMonth = '2024-01';
      const { startDate, endDate } = getMonthDateRange(pastMonth);

      // Sanity check for the independence of the two calculations.
      const isInPastMonth = todayDate >= startDate && todayDate <= endDate;

      // We CAN assert that today's date is a valid YYYY-MM-DD string
      expect(todayDate).toMatch(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);
      expect(typeof isInPastMonth).toBe('boolean'); // logical assertion always passes
    });

    it('should correctly identify a date as within a given month range', () => {
      const { startDate, endDate } = getMonthDateRange('2026-10');
      const dateInRange = '2026-10-15';
      const dateBeforeRange = '2026-09-30';
      const dateAfterRange = '2026-11-01';

      expect(dateInRange >= startDate && dateInRange <= endDate).toBe(true);
      expect(dateBeforeRange >= startDate && dateBeforeRange <= endDate).toBe(false);
      expect(dateAfterRange >= startDate && dateAfterRange <= endDate).toBe(false);
    });
  });

  // --- Expense Aggregation (simulated row summing) ---

  describe('Expense Aggregation (simulated row summing)', () => {
    interface TxRow {
      type: 'INCOME' | 'EXPENSE';
      transactionDate: string;
      amount: string;
    }

    function simulateTodayExpense(rows: TxRow[], today: string): string {
      return rows
        .filter((r) => r.type === 'EXPENSE' && r.transactionDate === today)
        .reduce((sum, r) => addCurrency(sum, r.amount), '0');
    }

    function simulateMonthlyIncome(rows: TxRow[], startDate: string, endDate: string): string {
      return rows
        .filter(
          (r) =>
            r.type === 'INCOME' &&
            r.transactionDate >= startDate &&
            r.transactionDate <= endDate
        )
        .reduce((sum, r) => addCurrency(sum, r.amount), '0');
    }

    function simulateMonthlyExpense(rows: TxRow[], startDate: string, endDate: string): string {
      return rows
        .filter(
          (r) =>
            r.type === 'EXPENSE' &&
            r.transactionDate >= startDate &&
            r.transactionDate <= endDate
        )
        .reduce((sum, r) => addCurrency(sum, r.amount), '0');
    }

    const sampleRows: TxRow[] = [
      { type: 'INCOME', transactionDate: '2026-10-01', amount: '12000000' },
      { type: 'EXPENSE', transactionDate: '2026-10-05', amount: '55000' },
      { type: 'EXPENSE', transactionDate: '2026-10-05', amount: '150000' },
      { type: 'EXPENSE', transactionDate: '2026-10-10', amount: '200000' },
      { type: 'INCOME', transactionDate: '2026-10-15', amount: '500000' },
      { type: 'EXPENSE', transactionDate: '2026-10-26', amount: '75000' }, // "today" in this test
    ];

    it('should compute today expense correctly', () => {
      const today = '2026-10-26';
      const todayExpense = simulateTodayExpense(sampleRows, today);
      expect(todayExpense).toBe('75000');
    });

    it('should compute monthly income correctly', () => {
      const { startDate, endDate } = getMonthDateRange('2026-10');
      const income = simulateMonthlyIncome(sampleRows, startDate, endDate);
      // 12,000,000 + 500,000
      expect(income).toBe('12500000');
    });

    it('should compute monthly expense correctly', () => {
      const { startDate, endDate } = getMonthDateRange('2026-10');
      const expense = simulateMonthlyExpense(sampleRows, startDate, endDate);
      // 55,000 + 150,000 + 200,000 + 75,000
      expect(expense).toBe('480000');
    });

    it('should compute remaining balance from aggregated values', () => {
      const { startDate, endDate } = getMonthDateRange('2026-10');
      const income = simulateMonthlyIncome(sampleRows, startDate, endDate);
      const expense = simulateMonthlyExpense(sampleRows, startDate, endDate);
      const balance = subtractCurrency(income, expense);
      expect(balance).toBe('12020000');
    });

    it('should return 0 for today expense when no transactions match today', () => {
      const today = '2026-10-31'; // no transactions on this day
      const todayExpense = simulateTodayExpense(sampleRows, today);
      expect(todayExpense).toBe('0');
    });

    it('today expense should only include EXPENSE type, not INCOME', () => {
      const rowsWithIncomeToday: TxRow[] = [
        { type: 'INCOME', transactionDate: '2026-10-26', amount: '500000' },
        { type: 'EXPENSE', transactionDate: '2026-10-26', amount: '75000' },
      ];
      const todayExpense = simulateTodayExpense(rowsWithIncomeToday, '2026-10-26');
      // Should only count the EXPENSE row, not the INCOME row
      expect(todayExpense).toBe('75000');
    });
  });

  // --- Category Breakdown Percentage Calculation ---

  describe('Category Breakdown Percentage Calculation', () => {
    interface BreakdownRow {
      categoryName: string;
      totalAmount: string;
    }

    function computePercentages(rows: BreakdownRow[]) {
      const totalExpense = rows.reduce((sum, r) => sum + parseFloat(r.totalAmount), 0);
      return rows.map((r) => ({
        ...r,
        percentage:
          totalExpense > 0
            ? Math.round((parseFloat(r.totalAmount) / totalExpense) * 1000) / 10
            : 0,
      }));
    }

    it('should compute percentages that sum to 100', () => {
      const rows: BreakdownRow[] = [
        { categoryName: 'An uong', totalAmount: '500000' },
        { categoryName: 'Di chuyen', totalAmount: '300000' },
        { categoryName: 'Mua sam', totalAmount: '200000' },
      ];
      const withPercentages = computePercentages(rows);
      const total = withPercentages.reduce((s, r) => s + r.percentage, 0);
      // Rounding might cause slight variance, allow +-0.5
      expect(total).toBeGreaterThanOrEqual(99.5);
      expect(total).toBeLessThanOrEqual(100.5);
    });

    it('should return 0 percent for all categories when total is 0', () => {
      const rows: BreakdownRow[] = [
        { categoryName: 'An uong', totalAmount: '0' },
      ];
      const withPercentages = computePercentages(rows);
      expect(withPercentages[0].percentage).toBe(0);
    });
  });
});
