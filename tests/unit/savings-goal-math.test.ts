import { describe, it, expect } from 'vitest';
import {
  calculateSavingsGoalProgress,
  calculateNewAmountAfterAction,
  calculateDaysLeft,
} from '@/lib/utils/savings-goal';

describe('Savings Goal Math & Business Logic', () => {
  it('correctly calculates percentage completion and remaining amount', () => {
    const result = calculateSavingsGoalProgress(15_000_000, 30_000_000);
    expect(result.percentage).toBe(50);
    expect(result.remaining).toBe(15_000_000);
    expect(result.isCompleted).toBe(false);
  });

  it('marks isCompleted as true when currentAmount reaches or exceeds targetAmount', () => {
    const resultExact = calculateSavingsGoalProgress(30_000_000, 30_000_000);
    expect(resultExact.percentage).toBe(100);
    expect(resultExact.remaining).toBe(0);
    expect(resultExact.isCompleted).toBe(true);

    const resultOver = calculateSavingsGoalProgress(35_000_000, 30_000_000);
    expect(resultOver.percentage).toBe(116.7);
    expect(resultOver.remaining).toBe(0);
    expect(resultOver.isCompleted).toBe(true);
  });

  it('handles zero target amount safely without NaN or Infinity', () => {
    const result = calculateSavingsGoalProgress(5_000_000, 0);
    expect(result.percentage).toBe(0);
    expect(result.remaining).toBe(0);
    expect(result.isCompleted).toBe(false);
  });

  it('correctly updates balance and status on DEPOSIT action', () => {
    const { newAmount, isCompleted } = calculateNewAmountAfterAction(
      10_000_000,
      15_000_000,
      'DEPOSIT',
      25_000_000
    );
    expect(newAmount).toBe(25_000_000);
    expect(isCompleted).toBe(true);
  });

  it('correctly updates balance on WITHDRAW action', () => {
    const { newAmount, isCompleted } = calculateNewAmountAfterAction(
      20_000_000,
      5_000_000,
      'WITHDRAW',
      25_000_000
    );
    expect(newAmount).toBe(15_000_000);
    expect(isCompleted).toBe(false);
  });

  it('throws INSUFFICIENT_FUNDS when withdrawing more than current amount', () => {
    expect(() =>
      calculateNewAmountAfterAction(5_000_000, 6_000_000, 'WITHDRAW', 10_000_000)
    ).toThrowError('INSUFFICIENT_FUNDS');
  });

  it('throws INVALID_AMOUNT when deposit or withdraw amount is zero or negative', () => {
    expect(() =>
      calculateNewAmountAfterAction(5_000_000, 0, 'DEPOSIT', 10_000_000)
    ).toThrowError('INVALID_AMOUNT');

    expect(() =>
      calculateNewAmountAfterAction(5_000_000, -100_000, 'WITHDRAW', 10_000_000)
    ).toThrowError('INVALID_AMOUNT');
  });

  it('calculates days left correctly or returns null if no date provided', () => {
    expect(calculateDaysLeft(null)).toBeNull();
    expect(calculateDaysLeft(undefined)).toBeNull();
  });
});
