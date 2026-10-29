import { describe, it, expect } from 'vitest';
import { upsertBudgetSchema } from '@/lib/validations/budget.schema';

describe('Budget Zod Validation Schema', () => {
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';

  it('accepts valid budget data', () => {
    const result = upsertBudgetSchema.safeParse({
      categoryId: validUuid,
      month: '2026-10',
      amount: '5000000',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(5_000_000);
    }
  });

  it('correctly cleans formatted Vietnamese currency string with dots', () => {
    const result = upsertBudgetSchema.safeParse({
      categoryId: validUuid,
      month: '2026-10',
      amount: '12.500.000',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(12_500_000);
    }
  });

  it('rejects invalid categoryId that is not a UUID', () => {
    const result = upsertBudgetSchema.safeParse({
      categoryId: 'invalid-id-not-uuid',
      month: '2026-10',
      amount: 1_000_000,
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid month format', () => {
    const badMonths = ['2026/10', '10-2026', '2026-1', '2026-10-01', 'october'];
    for (const badMonth of badMonths) {
      const result = upsertBudgetSchema.safeParse({
        categoryId: validUuid,
        month: badMonth,
        amount: 1_000_000,
      });
      expect(result.success).toBe(false);
    }
  });

  it('rejects zero amount', () => {
    const result = upsertBudgetSchema.safeParse({
      categoryId: validUuid,
      month: '2026-10',
      amount: 0,
    });

    expect(result.success).toBe(false);
  });

  it('rejects negative amount', () => {
    const result = upsertBudgetSchema.safeParse({
      categoryId: validUuid,
      month: '2026-10',
      amount: -500_000,
    });

    expect(result.success).toBe(false);
  });

  it('rejects amount exceeding upper boundary (999.999.999.999)', () => {
    const result = upsertBudgetSchema.safeParse({
      categoryId: validUuid,
      month: '2026-10',
      amount: 1_000_000_000_000,
    });

    expect(result.success).toBe(false);
  });
});
