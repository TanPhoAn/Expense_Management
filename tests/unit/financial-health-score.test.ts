import { describe, it, expect } from 'vitest';
import { calculateFinancialHealthScore } from '@/lib/utils/financial-health';

describe('Financial Health Score Algorithm (50/30/20 Principles)', () => {
  it('awards EXCELLENT score (>= 85) for high savings rate and safe expenses', () => {
    // Income: 30,000,000, Expense: 12,000,000 (Savings rate = 60%, Expense ratio = 40%)
    // Budgets adhered to 100%
    const result = calculateFinancialHealthScore({
      income: 30_000_000,
      expense: 12_000_000,
      budgets: [
        { budgetAmount: 10_000_000, spentAmount: 8_000_000 },
        { budgetAmount: 5_000_000, spentAmount: 4_000_000 },
      ],
    });

    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.grade).toBe('EXCELLENT');
    expect(result.gradeLabel).toBe('Xuất sắc');
    expect(result.savingsRate).toBe(60);
    expect(result.expenseRatio).toBe(40);
    expect(result.hasOverspentBudget).toBe(false);
  });

  it('assigns AT_RISK score (< 50) when expenses exceed income (negative cashflow)', () => {
    // Income: 10,000,000, Expense: 15,000,000 (Expense ratio = 150%, Savings rate = -50%)
    const result = calculateFinancialHealthScore({
      income: 10_000_000,
      expense: 15_000_000,
      budgets: [
        { budgetAmount: 8_000_000, spentAmount: 12_000_000 }, // Overspent
      ],
    });

    expect(result.score).toBeLessThan(50);
    expect(result.grade).toBe('AT_RISK');
    expect(result.gradeLabel).toBe('Báo động');
    expect(result.hasOverspentBudget).toBe(true);
  });

  it('handles zero income and zero expense edge case safely without NaN', () => {
    const result = calculateFinancialHealthScore({
      income: 0,
      expense: 0,
    });

    expect(result.score).toBe(70);
    expect(result.grade).toBe('GOOD');
    expect(result.gradeLabel).toBe('Tốt');
    expect(isNaN(result.score)).toBe(false);
  });

  it('handles zero income with expenses by triggering alarm score', () => {
    const result = calculateFinancialHealthScore({
      income: 0,
      expense: 5_000_000,
    });

    expect(result.score).toBe(15);
    expect(result.grade).toBe('AT_RISK');
  });

  it('strictly clamps scores between 0 and 100', () => {
    const superPositive = calculateFinancialHealthScore({
      income: 100_000_000,
      expense: 1_000_000,
      budgets: [{ budgetAmount: 5_000_000, spentAmount: 1_000_000 }],
    });
    expect(superPositive.score).toBeLessThanOrEqual(100);

    const superNegative = calculateFinancialHealthScore({
      income: 1_000_000,
      expense: 900_000_000,
      budgets: [{ budgetAmount: 1_000_000, spentAmount: 900_000_000 }],
    });
    expect(superNegative.score).toBeGreaterThanOrEqual(0);
  });
});
