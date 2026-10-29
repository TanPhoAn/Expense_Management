import { describe, it, expect } from 'vitest';
import { calculateBudgetStatus, calculateProjectedOverspent } from '@/lib/utils/budget';

describe('Budget Aggregation & Predictive Logic', () => {
  it('correctly calculates percentage and remaining when partially spent', () => {
    const result = calculateBudgetStatus(1_500_000, 5_000_000);
    expect(result.percentage).toBe(30);
    expect(result.status).toBe('SAFE');
    expect(result.remaining).toBe(3_500_000);
  });

  it('marks status as WARNING when spending reaches or exceeds 70%', () => {
    const result = calculateBudgetStatus(3_500_000, 5_000_000);
    expect(result.percentage).toBe(70);
    expect(result.status).toBe('WARNING');
    expect(result.remaining).toBe(1_500_000);

    const resultHigh = calculateBudgetStatus(4_800_000, 5_000_000);
    expect(resultHigh.percentage).toBe(96);
    expect(resultHigh.status).toBe('WARNING');
  });

  it('marks status as EXCEEDED and preserves negative remaining when spending reaches or exceeds 100%', () => {
    const resultExact = calculateBudgetStatus(5_000_000, 5_000_000);
    expect(resultExact.percentage).toBe(100);
    expect(resultExact.status).toBe('EXCEEDED');
    expect(resultExact.remaining).toBe(0);

    const resultOver = calculateBudgetStatus(7_500_000, 5_000_000);
    expect(resultOver.percentage).toBe(150);
    expect(resultOver.status).toBe('EXCEEDED');
    expect(resultOver.remaining).toBe(-2_500_000);
  });

  it('handles zero budget safely without NaN or Infinity', () => {
    const result = calculateBudgetStatus(1_000_000, 0);
    expect(result.percentage).toBe(0);
    expect(result.status).toBe('SAFE');
    expect(result.remaining).toBe(0);
  });

  it('projects overspending when daily burn rate exceeds budget allowance', () => {
    // 5 million budget, by day 10 user already spent 2.5 million (average 250k/day)
    // Projected month end for 30 days is 7.5 million -> Overspent!
    // Expected to run out on day 20 (5_000_000 / 250_000 = 20)
    const result = calculateProjectedOverspent(2_500_000, 5_000_000, 10, 30);
    expect(result.isProjectedToOverspend).toBe(true);
    expect(result.projectedDay).toBe(20);
    expect(result.projectedMonthEndAmount).toBe('7500000');
  });

  it('does not project overspending when daily burn rate is well within budget', () => {
    // 5 million budget, by day 15 user spent only 1 million (average 66.6k/day)
    // Projected month end for 30 days is 2 million -> Safe
    const result = calculateProjectedOverspent(1_000_000, 5_000_000, 15, 30);
    expect(result.isProjectedToOverspend).toBe(false);
  });

  it('handles already overspent scenario in projection', () => {
    const result = calculateProjectedOverspent(6_000_000, 5_000_000, 12, 30);
    expect(result.isProjectedToOverspend).toBe(true);
    expect(result.projectedDay).toBe(12);
  });
});
