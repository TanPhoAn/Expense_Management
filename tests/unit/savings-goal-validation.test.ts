import { describe, it, expect } from 'vitest';
import {
  createSavingsGoalSchema,
  savingsGoalActionSchema,
} from '@/lib/validations/savings-goal.schema';

describe('Savings Goal Zod Validation Schemas', () => {
  it('accepts valid savings goal creation data', () => {
    const result = createSavingsGoalSchema.safeParse({
      name: 'Quỹ khẩn cấp',
      targetAmount: '30.000.000',
      initialAmount: '5.000.000',
      targetDate: '2026-12-31',
      color: '#10b981',
      icon: 'Shield',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Quỹ khẩn cấp');
      expect(result.data.targetAmount).toBe(30_000_000);
      expect(result.data.initialAmount).toBe(5_000_000);
    }
  });

  it('rejects empty name or name exceeding 150 characters', () => {
    const emptyResult = createSavingsGoalSchema.safeParse({
      name: '   ',
      targetAmount: 10_000_000,
    });
    expect(emptyResult.success).toBe(false);

    const longResult = createSavingsGoalSchema.safeParse({
      name: 'A'.repeat(151),
      targetAmount: 10_000_000,
    });
    expect(longResult.success).toBe(false);
  });

  it('rejects zero or negative target amount', () => {
    const zeroResult = createSavingsGoalSchema.safeParse({
      name: 'Xe máy',
      targetAmount: 0,
    });
    expect(zeroResult.success).toBe(false);

    const negativeResult = createSavingsGoalSchema.safeParse({
      name: 'Xe máy',
      targetAmount: -10_000_000,
    });
    expect(negativeResult.success).toBe(false);
  });

  it('rejects target amount exceeding upper boundary (999.999.999.999)', () => {
    const overflowResult = createSavingsGoalSchema.safeParse({
      name: 'Mua hành tinh',
      targetAmount: 1_000_000_000_000,
    });
    expect(overflowResult.success).toBe(false);
  });

  it('validates deposit and withdraw action schema', () => {
    const validDeposit = savingsGoalActionSchema.safeParse({
      amount: '500.000',
      type: 'DEPOSIT',
      note: 'Lương về',
    });
    expect(validDeposit.success).toBe(true);
    if (validDeposit.success) {
      expect(validDeposit.data.amount).toBe(500_000);
    }

    const invalidType = savingsGoalActionSchema.safeParse({
      amount: 500_000,
      type: 'INVALID_TYPE',
    });
    expect(invalidType.success).toBe(false);

    const zeroAmount = savingsGoalActionSchema.safeParse({
      amount: 0,
      type: 'DEPOSIT',
    });
    expect(zeroAmount.success).toBe(false);
  });
});
